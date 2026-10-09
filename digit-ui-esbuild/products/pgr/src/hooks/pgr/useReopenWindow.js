import useUiConstantWindow from "./useUiConstantWindow";

// Reopen window (RAINMAKER-PGR.UIConstants.REOPENSLA) — see useUiConstantWindow for the
// semantics, including why undefined means "defer to the server" rather than "hide".
const useReopenWindow = (tenantId) => useUiConstantWindow(tenantId, "REOPENSLA");

export default useReopenWindow;
