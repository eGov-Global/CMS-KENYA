# Kenya Customization Layer

What makes CMS-KENYA different from CCRS Product, where those differences live, and
how to add new ones without growing the merge burden.

## The layer, precisely

`kenya-layer-start..<integration>` (tag `kenya-layer-start` = `df7ca8d0`) is the
Kenya-only commit set (~39 commits at analysis time, ~50 files). Inventory:

- **Bomet landing page** — `products/pgr/src/pages/citizen/Landing/**` (self-contained
  module; the model for future Kenya modules).
- **Auto-assignment at citizen create + vector basemap** — `products/pgr`
  (`utils/autoAssign.js`, `hooks/pgr/useAutoAssignment.js`, GeoLocations/map files).
- **Bomet workflow/inbox adaptations** — department-tier roles on the PGR card,
  workflow-derived inbox status defaults, assigned-to radio, `ESCALATEDLEVEL1-3`
  labels, citizen details locality rows.
- **PII masking OFF** — `PGR_PII_MASKING` deploy flag (`utils/piiMasking.js`);
  the template for all Kenya behavior switches (absent ⇒ product behavior).
- **Bongatech/Ozeki SMS + direct delivery** — `backend/novu-bridge` provider layer.
- **Tenant data** — `local-setup/ansible` host_vars/templates (bomet, stateige),
  nginx template, pilot deploy scripts, `CmsPgrWorkflowConfig.json`, localization
  trees (`utilities/default-data-handler/.../localisations/**`), MDMS seeds.

Kenya intentionally does NOT diverge in: `devops/**`, `frontend/micro-ui`,
`digit-mcp`, `performance/**` — keep it that way (free auto-sync).

## Where Kenya-specific behavior belongs (in order)

1. **globalConfigs flag** — deploy-level switch, default-safe polarity (absent =
   product behavior). Rendered from `local-setup/ansible/templates/globalConfigs.js.j2`.
2. **MDMS master** — tenant-level, editable post-deploy. 16 masters already drive the
   PGR UI (`ComplaintHierarchy`, `MapConfig`, `InboxVisibilityConfig`,
   `CreateComplaintConfig`, ThemeConfig, StateInfo branding, …).
3. **Theme** — MDMS ThemeConfig → `applyTheme` tokens; pre-paint colors via nginx
   host_vars; assets via `/var/www/brand/` + StateInfo.
4. **Extension points** — `Customizations.PGR` (detail rows), `Digit.
   ComponentRegistryService` (component substitution), `country-overrides.css`.
5. **Kenya module** — a new self-contained dir (landing-page pattern).
6. **Last resort: edit shared code** — document why; CI requires an `UPSTREAM-PR:`
   reference or `SUBTREE-WAIVER:` for `packages/modules/**`; split the generic part
   upstream.

## What NOT to do

- No `products/kenya/` country fork — `products/` is the shared CCRS layer that Kenya
  and Mozambique co-own; forking it doubles every future fix.
- No hardcoded tenants, roles, boundaries, coordinates, dimensions, cooldowns —
  those are configuration.
- No new `packages/modules/pgr/**` changes (dead, aliased-away tree).
- No country assets imported from source (use MDMS/brand config).
