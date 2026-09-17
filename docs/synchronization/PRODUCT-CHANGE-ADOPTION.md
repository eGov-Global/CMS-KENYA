# Product Change Adoption

Every product sync classifies incoming changes into four categories. The
classification lives in the sync PR and in `decisions/<date>.md`.

## Categories

### A — Auto-integrate (take product directly)
Security/CVE fixes · generic bug fixes · devops/helm/terraform (Kenya has zero files
there) · docs · observability · performance tooling · digit-mcp · independent modules ·
generic frontend fixes in files Kenya has not customized.

### B — Review before accepting
Shared UI components · configurator shell files · routing · localization
infrastructure · dependency majors · common CSS · theme infrastructure · API contract
changes. Review = read the diff, check the Kenya impact column of the watchlist, run
the affected surface in a browser.

### C — Adapt (merge product, preserve Kenya behavior)
Files on the keep-fork watchlist · citizen create flow · employee inbox/details ·
escalation · row-scoping/ABAC · notification providers. Product functionality is
wanted, but Kenya behavior must survive — usually behind existing flags/MDMS.

### D — Selective / Exclude (deliberate divergence)
Product defaults that Kenya consciously overrides. Every exclusion is recorded:

```
Product change:
Product commit:
Files:
Reason:
Kenya behavior:
Decision: ADOPT / ADAPT / EXCLUDE
```

Known standing exclusions (re-affirm each sync):
- `PGR_PII_MASKING` stays **off** for Kenya (product/Moz default: on).
- `pgr.escalation.enabled` — product default flipped to `false`; Kenya keeps its own
  deploy value.
- `allowed.source` channel list (whatsapp/web/mobile/RB Bot/email/inperson/letter/
  linhaverde) is tenant behavior product does not have — must survive every sync.

## Kenya development rules (prevention)

For every NEW Kenya requirement, in order:
1. **Configuration?** → globalConfigs flag (absent = product behavior — default-safe
   polarity, see `products/pgr/src/utils/piiMasking.js`) or MDMS master.
2. **Extension point?** → `Customizations.PGR`, `Digit.ComponentRegistryService`,
   theme tokens, `country-overrides.css`.
3. **Kenya module?** → a new self-contained module/dir (like the Bomet landing page).
4. **Only then** modify shared code — document why in the commit, and split the
   generic part into an upstream PR (`UPSTREAM-PR:` reference required by CI for
   `packages/modules/**`).

## Upstreaming generic fixes

When Kenya fixes a generic CCRS bug: fix locally → open a product PR → reference it
(`UPSTREAM-PR: egovernments/Citizen-Complaint-Resolution-System#NNN`) → once product
merges it, the next sync makes the Kenya copy redundant — delete it during that sync.
This is how the Kenya delta shrinks over time.
