/**
 * The employee Take Action draft belongs to ONE complaint and ONE action
 * (CMS-KENYA issue #75; fixed in PGRDetails.js, nairobi-prod PR #96).
 *
 * The Take Action popup keeps its draft (comments, a picked assignee) in session
 * storage so an accidental close does not lose what was typed. Before the fix
 * that draft lived under one key shared by every complaint and only a successful
 * submit cleared it, so text typed for one complaint reappeared in the popup on
 * the next one. The rule this spec pins down:
 *   - arriving at a complaint (a fresh load, in-app navigation, browser Back)
 *     starts with an empty draft;
 *   - picking a different action discards the draft;
 *   - closing and reopening the SAME action on the SAME complaint keeps it.
 *
 * Nothing is submitted: the tests only open and close popups. The two complaints
 * seeded for the run are rejected in afterAll so they leave the inbox.
 *
 * Deployment-portable: complaints are filed as a citizen and land wherever this
 * deployment's APPLY sends them (PENDINGFORASSIGNMENT on a GRO-first workflow,
 * PENDINGATLME where APPLY assigns directly, as on Kenya). The actions offered are
 * read from the live business service for that state and the seed plan's actor's
 * roles. Self-skips when the actor can take no action there, or (for the
 * different-action case) only one.
 */
import { test, expect, type Page } from '@playwright/test';
import { BASE_URL, TENANT } from '../utils/env';
import { resolveSeedPlan, type ResolvedPersona } from '../utils/personas';
import { seedComplaintAsCitizen } from '../utils/seed';
import { loginEmployeeBrowser, takeAction, apiReject, type Principal } from '../utils/employee-ui';

const TAGS = ['@persona:employee', '@area:pgr', '@layer:ui', '@kind:regression'];

/** Menu labels for the actions this spec may drive, in order of preference. */
const ACTION_LABELS: Record<string, RegExp> = {
  REJECT: /^reject$/i,
  RESOLVE: /^resolve$/i,
  ASSIGN: /^assign$/i,
};

function toPrincipal(p: ResolvedPersona): Principal {
  return { token: p.token, userInfo: p.userInfo, roles: p.roles, authTenant: p.tenant };
}

let actor: Principal | null = null;
let actorUser = '';
let actorPass = '';
let first = '';
let second = '';
let actions: string[] = []; // action codes the actor can take on the seeded complaints, preferred first
let setupSkip = '';

/** Actions available to `roles` at `stateName` in the live PGR business service. */
async function actionsAt(token: string, stateName: string, roles: string[]): Promise<string[]> {
  const j: any = await fetch(
    `${BASE_URL}/egov-workflow-v2/egov-wf/businessservice/_search?tenantId=${TENANT}&businessServices=PGR`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RequestInfo: { apiId: 'Rainmaker', authToken: token } }),
    },
  ).then((r) => r.json());
  const state = (j.BusinessServices?.[0]?.states || []).find((s: any) => s?.state === stateName);
  const offered = new Set<string>(
    (state?.actions || [])
      .filter((a: any) => (a?.roles || []).some((r: string) => roles.includes(r)))
      .map((a: any) => a.action),
  );
  return Object.keys(ACTION_LABELS).filter((code) => offered.has(code));
}

const comments = (page: Page) => page.locator('textarea').first();

async function openComplaint(page: Page, srid: string): Promise<void> {
  await page.goto(`${BASE_URL}/digit-ui/employee/pgr/complaint-details/${srid}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await waitForComplaint(page, srid);
}

async function waitForComplaint(page: Page, srid: string): Promise<void> {
  await page.waitForFunction((id) => document.body.innerText.includes(id), srid, { timeout: 30_000 });
  await page.locator('.digit-viewcard-field-pair, .v2-pgr-details').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(2_000);
}

/** Navigate inside the SPA, so the details page component is reused rather than remounted. */
async function goInApp(page: Page, srid: string): Promise<void> {
  await page.evaluate((url) => {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, `/digit-ui/employee/pgr/complaint-details/${srid}`);
  await waitForComplaint(page, srid);
}

async function openAction(page: Page, code: string): Promise<void> {
  await takeAction(page, ACTION_LABELS[code]);
  await comments(page).waitFor({ state: 'visible', timeout: 15_000 });
}

/** Close the popup WITHOUT submitting: the header close icon, or Cancel. */
async function closePopup(page: Page, via: 'close-icon' | 'cancel'): Promise<void> {
  if (via === 'close-icon') await page.locator('.icon-bg-secondary').last().click();
  else await page.getByRole('button', { name: /^cancel$/i }).last().click();
  await expect(comments(page)).toBeHidden({ timeout: 10_000 });
}

test.beforeAll(async () => {
  const plan = await resolveSeedPlan();
  if ('error' in plan) { setupSkip = plan.error; return; }
  actorUser = plan.actor.username;
  actorPass = plan.actor.password;
  actor = toPrincipal(plan.actor);
  try {
    const a = await seedComplaintAsCitizen({ description: `take-action-draft A ${new Date().toISOString()}` });
    const b = await seedComplaintAsCitizen({ description: `take-action-draft B ${new Date().toISOString()}` });
    first = a.srid;
    second = b.srid;
    if (a.status !== b.status) { setupSkip = `seeds landed in different states (${a.status} / ${b.status})`; return; }
    actions = await actionsAt(plan.actor.token, a.status, plan.actor.roles);
    if (!actions.length) setupSkip = `${actorUser} can take none of ${Object.keys(ACTION_LABELS).join('/')} at ${a.status} on ${TENANT}`;
  } catch (err: any) {
    setupSkip = `seed failed: ${err?.message?.slice(0, 200)}`;
  }
});

test.afterAll(async () => {
  if (!actor) return;
  for (const srid of [first, second].filter(Boolean)) {
    await apiReject(actor, srid, 'take-action-draft spec cleanup').catch(() => undefined);
  }
});

test.describe('employee Take Action draft is scoped to one complaint and one action', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    test.skip(!!setupSkip, setupSkip);
    const ok = await loginEmployeeBrowser(page, actorUser, actorPass);
    test.skip(!ok, `login failed for ${actorUser}`);
  });

  test('a comment typed on one complaint is not in the popup on the next (issue #75 steps)', { tag: TAGS }, async ({ page }) => {
    const action = actions[0];
    await openComplaint(page, first);
    await openAction(page, action);
    await comments(page).fill('Draft typed on the first complaint');
    await closePopup(page, 'close-icon');

    await openComplaint(page, second);
    await openAction(page, action);
    await expect(comments(page), 'a different complaint starts with an empty comments box').toHaveValue('');
  });

  test('closing and reopening the same action on the same complaint keeps the draft', { tag: TAGS }, async ({ page }) => {
    const action = actions[0];
    await openComplaint(page, first);
    await openAction(page, action);
    await comments(page).fill('Kept after an accidental close');
    await closePopup(page, 'cancel');

    await openAction(page, action);
    await expect(comments(page), 'same complaint + same action keeps the text').toHaveValue('Kept after an accidental close');
  });

  test('picking a different action on the same complaint discards the draft', { tag: TAGS }, async ({ page }) => {
    test.skip(actions.length < 2, `${actorUser} has only one of ${Object.keys(ACTION_LABELS).join('/')} on these complaints`);
    const [action, other] = actions;
    await openComplaint(page, first);
    await openAction(page, action);
    await comments(page).fill('Draft for the first action');
    await closePopup(page, 'cancel');

    await openAction(page, other);
    await expect(comments(page), 'another action starts empty').toHaveValue('');
    await closePopup(page, 'close-icon');

    await openAction(page, action);
    await expect(comments(page), 'the first action\'s draft was discarded, not parked').toHaveValue('');
  });

  test('in-app navigation and browser Back both start with an empty draft', { tag: TAGS }, async ({ page }) => {
    const action = actions[0];
    await openComplaint(page, first);
    await openAction(page, action);
    await comments(page).fill('Draft on the first complaint');
    await closePopup(page, 'close-icon');

    await goInApp(page, second);
    await openAction(page, action);
    await expect(comments(page), 'in-app navigation to another complaint starts empty').toHaveValue('');
    await comments(page).fill('Draft on the second complaint');
    await closePopup(page, 'cancel');

    await page.goBack();
    await waitForComplaint(page, first);
    await openAction(page, action);
    await expect(comments(page), 'Back to the earlier complaint starts empty').toHaveValue('');
  });
});
