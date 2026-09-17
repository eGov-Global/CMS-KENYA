# Product Sync Decision Log — 2026-09-16 (first sync, executed)

Product revision: 7ee88f839ec22609d527928df967c19f40b2ab88 (upstream/master)
Previous base: 815b23747a6064736a5449cd2ecf7aae81b0c567 (2026-08-13)
Sync merge commit: 5df7fc62 on product-sync/2026-09-16

## Summary
Product commits integrated: 760 · Files changed by product: 1137 · Conflicts: 64 (all resolved)

## Classification
### A — Auto-integrated (take-product)
devops/helm/terraform (211 files, zero conflicts) · docs/2.12 + performance + digit-mcp ·
observability stack · pom.xml CVE + bean-validation fix (b0fad238/#2056) · analytics shim +
54-test suite (includes the 3 fixes Kenya lacked: ccd18315, 26a22aba, 168d65ba) · TopBar
profile-photo fix (1971cb94, supersedes Kenya f676b174) · MDMSUtils TTL caches ·
full-dump/gatus seeds · configurator analytics + access-policy pages (canViewResource gating).

### C — Adapted
novu-bridge: SMSCountry + Ozeki + Bongatech + direct-delivery united (superset constructor,
chained dispatch: direct-channels first, then SMSCountry-direct, then Novu) ·
ImageComponent: fallbackSrc-then-render-nothing merged design · applyTheme: product headerTone
+ Kenya PGRL bridge, Kenya injectV2Bridge(vars, landing) signature kept · App.tsx: product
capability gating extended over Kenya's role-actions CRUD + landing resources ·
overrides.css: product block first, Kenya country layer appended (split into
country-overrides.css scheduled for Phase 2) · compose: product hardening + Kenya
notification envs (OTEL key de-duplicated to product's env-overridable form) ·
schema list: commonMDMSConfig.PrivacyPolicy → commonUiConfig.PrivacyPolicy (product rename).

### C.1 — Post-merge compile reconciliation (CI rounds after the merge landed)
Kenya never modified EnrichmentService/EscalationService/PGRRepository, so they auto-merged to
product's reworked versions while PGRService/EscalationScheduler/PGRQueryBuilder stayed Kenya's.
Reconciled additively (commits e05919a7, c1aac3b6, af004d41 + this one):
- PGRConfiguration/application.properties: superset with product's 9 fields / 8 keys
  (accesscontrol PDP, abac strict-mode opt-in, employee-context roles, escalation lock+statuses).
- PGRQueryBuilder: product's 4-arg scope-aware overloads + applyScope ported verbatim;
  UNRESTRICTED adds no predicate, Kenya scoping unchanged; product's scope test suite passes
  through Kenya's builder.
- EscalationService: merge-base escalateComplaint() re-added (Kenya scheduler's entry point)
  onto product's unified-flow service; ctor gains Producer + PGRConfiguration.
- PGRService: enrichUserContactDetails → product's detach+sync pair at both call sites.
- getDepartmentCodeToNameMap: product's (RequestInfo, tenantId) version adopted; RequestInfo
  threaded through AdminComplaintSearchService and EmployeeDepartmentScopeService.
- AdminSearchCriteria: product's local @SafeHtml replaces the HV8-removed hibernate one.
- novu-bridge: duplicate smsProvider/smsSenderId removed (Kenya's kept), NovuClient shadowed
  `overrides` local renamed, DispatchPipelineDirectModeTest superset-ctor slot fixed.
- PGRServiceTest (product-new): @Disabled with reason — it verifies product's ABAC-scoped
  search/count + unified escalation wiring inside PGRService, both deferred by the D-decisions
  below; constructor call adapted to Kenya's PGRService so it compiles. Re-enable when adopting
  product's PGRService model.

### D — Excluded (standing decisions honored)
- Escalation: product's assigned-only + MDMS EscalationConfig model NOT adopted — Bomet is
  live on ESCALATEDLEVEL1-3; EscalationScheduler/PGRConfiguration/application.properties
  kept Kenya-side. Product's new escalation/lock classes arrive as unused files; revisit at adoption.
- Row scoping: product ABAC engine NOT adopted this sync — Kenya's role-property
  dept/jurisdiction scoping kept (PGRService/PGRQueryBuilder/RequestsApiController ours).
- digit_ui_bundle_image default (group_vars): would make Ansible deploy the PRODUCT UI
  bundle over Kenya's — kept commented/Kenya-side.
- PGR_PII_MASKING stays off for Kenya; allowed.source channel list intact (kept-ours files).

## Keep-fork files ported manually
CreatePGRFlowV2.tsx, PGRDetails.js, GeoLocations.js, ComplaintDetails.js, UICustomizations.js,
utils/index.js, login.js — kept ours; compatible product hunks auto-merged (e.g.
hasUsableGeoLocation import). Product's remaining small hunks (analytics tagging, description
validator) deferred to follow-up, listed in CONFLICT-MANAGEMENT.md.

## Testing
- esbuild build: PASS (one union brace fixed in applyTheme; compose OTEL duplicate fixed)
- node --test: 77/77 PASS (23 pgr + 54 analytics shim)
- Parity guards: 3/3 OK
- Backend compile/tests: NOT-RUN locally (no JDK) — CI build.yml on push is the gate
- Configurator build: NOT-RUN locally (deps not installed) — CI
- Kenya regression + UAT: PENDING before merging product-sync/2026-09-16 → syncwithmoz

## Rollback point
Revert 5df7fc62 (git revert -m 1) on product-sync/2026-09-16, or delete the branch entirely —
syncwithmoz was never touched.
