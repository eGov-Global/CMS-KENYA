import { useEffect, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { startIdleTimer, type StopIdleTimer } from '../../../ui-shared/session/idleTimer';
import {
  configuratorActivityClock,
  configuratorSignOut,
  markLoginActivity,
  readIdleSettings,
  type SignOutReason,
} from '@/lib/sessionGuard';

interface IdleSignOutProps {
  /** This tab's login token; nothing runs without one. */
  token: string | null;
  /** The signed-in admin's uuid: only their own logout in another tab signs this tab out. */
  userId: string | null;
  /** Ends this tab's login without telling the other tabs (idle, or a logout elsewhere). */
  onSignOut: (reason: SignOutReason) => void;
  /** The full logout, as the Logout button does (also signs out the other tabs). */
  onSignOutNow: () => void;
}

/**
 * Signs an idle admin out of the configurator, with an "Are you still there?"
 * warning first (#233), and ends this tab's login when the same admin logs out
 * in another configurator tab (#232). See lib/sessionGuard for the settings.
 */
export default function IdleSignOut({ token, userId, onSignOut, onSignOutNow }: IdleSignOutProps) {
  const [signOutAt, setSignOutAt] = useState<number | null>(null);
  const timer = useRef<StopIdleTimer | null>(null);
  // The latest callback, so a new function on each render does not restart the timer.
  const signOut = useRef(onSignOut);
  useEffect(() => {
    signOut.current = onSignOut;
  }, [onSignOut]);

  useEffect(() => {
    setSignOutAt(null);
    timer.current = null;
    if (!token) return undefined;
    const { timeoutMs, warnBeforeMs } = readIdleSettings();
    if (!timeoutMs) return undefined;
    const clock = configuratorActivityClock(userId); // this admin's own clock (#235)
    markLoginActivity(token, clock);
    const stop = startIdleTimer({
      timeoutMs,
      warnBeforeMs,
      onIdle: () => signOut.current('idle'),
      onWarn: (at) => setSignOutAt(at),
      onActive: () => setSignOutAt(null),
      shared: clock,
    });
    timer.current = stop;
    return () => {
      timer.current = null;
      stop();
    };
  }, [token, userId]);

  // Independent of the idle setting.
  useEffect(() => {
    if (!token) return undefined;
    return configuratorSignOut.listen(() => signOut.current('signed-out-elsewhere'), { userId });
  }, [token, userId]);

  if (!token || !signOutAt) return null;
  return (
    <IdleWarningDialog
      signOutAt={signOutAt}
      onStay={() => timer.current?.keepAlive()}
      onSignOutNow={onSignOutNow}
    />
  );
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// While it is up, moving the mouse does not keep the session (see
// startIdleTimer): only "Stay signed in" or Escape does, and that also closes
// the warning in the other tabs.
function IdleWarningDialog({ signOutAt, onStay, onSignOutNow }: { signOutAt: number; onStay: () => void; onSignOutNow: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onStay(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have not used the configurator for a while. For your security you will be signed out soon.
            Anything you have not saved will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Hidden from screen readers so the ticking clock is not read out every second. */}
        <p aria-hidden="true" className="text-sm text-muted-foreground">
          Signing out in{' '}
          <strong className="text-foreground tabular-nums" data-testid="idle-countdown">{formatCountdown(signOutAt - now)}</strong>
        </p>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={onSignOutNow}>Sign out now</Button>
          <Button type="button" onClick={onStay} autoFocus>Stay signed in</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
