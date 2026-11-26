// #233: the configurator warns an idle admin and signs them out; #232: a logout
// in another configurator tab of the same admin signs this tab out.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import IdleSignOut, { formatCountdown } from './IdleSignOut';
import { activityKeyFor, markLoginActivity } from '@/lib/sessionGuard';
import { userKey } from '../../../ui-shared/session/signOutBroadcast';

const SEC = 1000;
const MIN = 60 * SEC;
const MY_CLOCK = activityKeyFor('uuid-admin');
type Win = Window & { globalConfigs?: { getConfig: (k: string) => unknown } };

const setConfig = (values: Record<string, unknown>) => {
  (window as Win).globalConfigs = { getConfig: (k: string) => values[k] };
};

const signOutElsewhere = (user: string | null, tab = 'another-tab') =>
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'crs-configurator-signed-out',
        newValue: JSON.stringify({ type: 'configurator-signed-out', tab, at: Date.now(), user: user ? userKey(user) : null }),
      }),
    );
  });

describe('IdleSignOut', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-26T10:00:00Z'));
    localStorage.clear();
    sessionStorage.clear();
    setConfig({ EMPLOYEE_IDLE_TIMEOUT_MINUTES: 3, EMPLOYEE_IDLE_WARNING_SECONDS: 60 });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as Win).globalConfigs;
  });

  const mount = (props: Partial<Parameters<typeof IdleSignOut>[0]> = {}) => {
    const onSignOut = vi.fn();
    const onSignOutNow = vi.fn();
    const view = render(
      <IdleSignOut token="tok-1" userId="uuid-admin" onSignOut={onSignOut} onSignOutNow={onSignOutNow} {...props} />,
    );
    return { onSignOut, onSignOutNow, ...view };
  };

  it('shows "Are you still there?" with a countdown after 2 idle minutes (3-minute limit)', () => {
    mount();
    act(() => { vi.advanceTimersByTime(2 * MIN - 15 * SEC); });
    expect(screen.queryByText('Are you still there?')).toBeNull();
    act(() => { vi.advanceTimersByTime(15 * SEC); });
    expect(screen.getByText('Are you still there?')).toBeTruthy();
    expect(screen.getByTestId('idle-countdown').textContent).toBe('1:00');
    act(() => { vi.advanceTimersByTime(10 * SEC); });
    expect(screen.getByTestId('idle-countdown').textContent).toBe('0:50');
  });

  it('signs out as idle at 3 minutes when nobody answers', () => {
    const { onSignOut } = mount();
    act(() => { vi.advanceTimersByTime(3 * MIN - SEC); });
    expect(onSignOut).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(SEC); });
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledWith('idle');
  });

  it('"Stay signed in" closes the warning and restarts the 3 minutes', () => {
    const { onSignOut } = mount();
    act(() => { vi.advanceTimersByTime(2 * MIN + 30 * SEC); });
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByText('Are you still there?')).toBeNull();
    expect(Number(localStorage.getItem(MY_CLOCK))).toBe(Date.now());
    act(() => { vi.advanceTimersByTime(2 * MIN + 59 * SEC); });
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('moving the mouse while the warning is up does not close it', () => {
    mount();
    act(() => { vi.advanceTimersByTime(2 * MIN); });
    act(() => { window.dispatchEvent(new Event('mousemove')); });
    act(() => { vi.advanceTimersByTime(2 * SEC); });
    expect(screen.getByText('Are you still there?')).toBeTruthy();
  });

  it('"Sign out now" runs the full logout (which also signs out the other tabs)', () => {
    const { onSignOutNow } = mount();
    act(() => { vi.advanceTimersByTime(2 * MIN); });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out now' }));
    expect(onSignOutNow).toHaveBeenCalledTimes(1);
  });

  it('activity keeps the session: no warning while the admin is working', () => {
    const { onSignOut } = mount();
    for (let i = 0; i < 6; i += 1) {
      act(() => { vi.advanceTimersByTime(90 * SEC); });
      act(() => { window.dispatchEvent(new Event('keydown')); });
    }
    expect(screen.queryByText('Are you still there?')).toBeNull();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("a restored tab whose clock is older than the limit signs out as soon as it loads", () => {
    markLoginActivity('tok-1', { read: () => null, write: () => {} }); // this tab already saw this login
    localStorage.setItem(MY_CLOCK, String(Date.now() - 20 * MIN));
    const { onSignOut } = mount();
    expect(onSignOut).toHaveBeenCalledWith('idle');
  });

  it('a fresh login starts a fresh clock even if an old one is stale', () => {
    localStorage.setItem(MY_CLOCK, String(Date.now() - 20 * MIN));
    const { onSignOut } = mount({ token: 'brand-new-token' });
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("another admin working in another tab of the same browser does not keep this admin signed in (#235)", () => {
    const { onSignOut } = mount();
    const otherClock = activityKeyFor('uuid-someone-else');
    for (let i = 0; i < 4; i += 1) {
      act(() => { vi.advanceTimersByTime(45 * SEC); });
      act(() => { localStorage.setItem(otherClock, String(Date.now())); });
    }
    act(() => { vi.advanceTimersByTime(SEC); });
    expect(onSignOut).toHaveBeenCalledWith('idle');
  });

  it("this admin's 'Stay signed in' writes only their own clock (#235)", () => {
    mount();
    const otherClock = activityKeyFor('uuid-someone-else');
    localStorage.setItem(otherClock, '42');
    act(() => { vi.advanceTimersByTime(2 * MIN); });
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(localStorage.getItem(otherClock)).toBe('42');
    expect(Number(localStorage.getItem(MY_CLOCK))).toBe(Date.now());
  });

  it('the same admin logging out in another tab signs this tab out (#232)', () => {
    const { onSignOut } = mount();
    signOutElsewhere('uuid-admin');
    expect(onSignOut).toHaveBeenCalledWith('signed-out-elsewhere');
  });

  it("a different admin's logout in another tab leaves this tab signed in", () => {
    const { onSignOut } = mount();
    signOutElsewhere('uuid-someone-else');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('with idle sign-out turned off (0), no warning ever, but a logout elsewhere still counts', () => {
    setConfig({ EMPLOYEE_IDLE_TIMEOUT_MINUTES: 0 });
    const { onSignOut } = mount();
    act(() => { vi.advanceTimersByTime(60 * MIN); });
    expect(screen.queryByText('Are you still there?')).toBeNull();
    expect(onSignOut).not.toHaveBeenCalled();
    signOutElsewhere('uuid-admin');
    expect(onSignOut).toHaveBeenCalledWith('signed-out-elsewhere');
  });

  it('without a token nothing runs', () => {
    const { onSignOut } = mount({ token: null });
    act(() => { vi.advanceTimersByTime(60 * MIN); });
    signOutElsewhere('uuid-admin');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('unmounting stops the timer and the listener', () => {
    const { onSignOut, unmount } = mount();
    unmount();
    act(() => { vi.advanceTimersByTime(60 * MIN); });
    signOutElsewhere('uuid-admin');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('formats the countdown as m:ss', () => {
    expect(formatCountdown(60 * SEC)).toBe('1:00');
    expect(formatCountdown(9 * SEC)).toBe('0:09');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
