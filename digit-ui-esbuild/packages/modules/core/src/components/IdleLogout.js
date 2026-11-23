import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  startIdleTimer,
  idleTimeoutMs,
  storageActivityStore,
  markEmployeeActive,
  redirectToLogin,
  isKeycloakAuth,
} from "@egovernments/digit-ui-libraries";

// Logs an employee out after a period with no mouse, keyboard, touch or scroll
// activity in ANY of their open tabs (#224, VAPT "Insecure Session Management").
// Default 15 minutes; set globalConfigs EMPLOYEE_IDLE_TIMEOUT_MINUTES to change
// it, or to 0 to turn it off. Only for a signed-in employee on employee pages
// with DIGIT login; citizen/public pages and Keycloak mode are untouched.
// Renders nothing.

// Remembers, per tab, which login the shared activity clock was last reset for.
// A NEW token here (any login screen, the dashboard's own login, a password
// change) counts as fresh activity; a reloaded or restored tab keeps its token,
// so a stale clock still logs it out.
const SEEN_LOGIN_KEY = "Digit.IdleLogoutLogin";
const fingerprint = (token) => {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) h = (h * 31 + token.charCodeAt(i)) | 0;
  return String(h);
};

// Idle logout ends THIS login on the server and clears only this tab's
// credentials (authSession.redirectToLogin) — never localStorage.clear(), which
// would also sign out a citizen in another tab and wipe caches and drafts.
const logOutIdleEmployee = async () => {
  try {
    await Digit.UserService.logoutUser();
  } catch (e) {
    /* already invalid on the server: still clear the tab */
  }
  redirectToLogin();
};

const IdleLogout = () => {
  const { pathname } = useLocation();
  const onEmployeePage = pathname.split("/").includes("employee");
  const user = window?.Digit?.UserService?.getUser?.();
  const token = user?.access_token || null;
  const employeeSignedIn = !!token && String(user?.info?.type || "").toUpperCase() === "EMPLOYEE";

  useEffect(() => {
    if (!onEmployeePage || !employeeSignedIn || isKeycloakAuth()) return undefined;
    const timeoutMs = idleTimeoutMs(window?.globalConfigs?.getConfig?.("EMPLOYEE_IDLE_TIMEOUT_MINUTES"));
    if (!timeoutMs) return undefined;

    try {
      const seen = window.sessionStorage.getItem(SEEN_LOGIN_KEY);
      const current = fingerprint(token);
      if (seen !== current) {
        markEmployeeActive(window.localStorage);
        window.sessionStorage.setItem(SEEN_LOGIN_KEY, current);
      }
    } catch (e) {
      /* blocked storage: the per-tab countdown still works */
    }

    return startIdleTimer({
      timeoutMs,
      onIdle: logOutIdleEmployee,
      shared: storageActivityStore(window.localStorage),
    });
  }, [onEmployeePage, employeeSignedIn, token]);

  return null;
};

export default IdleLogout;
