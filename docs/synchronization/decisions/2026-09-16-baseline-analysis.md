# Product Sync Decision Log — 2026-09-16 (baseline analysis, no merge performed)

Product revision analyzed: 7ee88f839ec22609d527928df967c19f40b2ab88 (upstream/master)
Kenya base: 815b23747a6064736a5449cd2ecf7aae81b0c567 (2026-08-13) — recorded in product-sync.json
Kenya integration ref: syncwithmoz @ 3861b849

## Summary
- Product is +760 commits since base; Kenya line +675 (Moz layer + 39 Kenya-only commits).
- Dry-run merge: **64 real conflicts** (list in CONFLICT-MANAGEMENT.md and the sync PR report).
- ~13 conflicted files are phantoms (analytics feature cherry-picked onto both lines; product ahead).
- Several are duplicate independent fixes resolving in product's favor.

## Standing decisions REQUIRED before the first sync merge (blocking)
1. **Escalation model** — adopt product's assigned-only + MDMS `EscalationConfig`, or carry a
   documented Bomet override (`ESCALATEDLEVEL1-3`, `pgr.escalation.states`,
   `enable-escalation.sh`, `CmsPgrWorkflowConfig.json` all encode the Kenya model). OWNER: product/Bomet leads.
2. **Row scoping** — recommendation: adopt product's ABAC engine; re-validate Bomet
   department/jurisdiction behavior against the MDMS policy model; re-point
   `AdminComplaintSearchService`. OWNER: backend lead.
3. **novu-bridge** — union all three SMS gateways (SMSCountry + Ozeki + Bongatech + direct
   mode) behind the provider-overrides factory; upstream the factory. OWNER: backend lead.

## Live product fixes to evaluate during the first sync (do not blindly cherry-pick)
- pgr-services `pom.xml`: bean validation silently disabled under Boot 3 (product `b0fad238`,
  PR #2056) + jsoup/postgres CVE bumps — Kenya's pom is untouched since base, so this is a
  clean take-product.
- Analytics shim: product commits `ccd18315`, `26a22aba`, `168d65ba` (Matomo drops SPA events
  after vendor script load) — Kenya's copy is strictly behind.
- `jspdf ^2.5.1 → ^4.2.1` (two majors — smoke-test the PDF path).
- `frontend/micro-ui` lockfile CVE sweep (`939711f2`) — Kenya has zero frontend/ changes; free.

## Testing
None — analysis only; no merge performed. Baseline conflict map captured for the first sync PR.
