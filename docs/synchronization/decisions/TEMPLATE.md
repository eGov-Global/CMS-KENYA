# Product Sync Decision Log — YYYY-MM-DD

Product revision: <sha> (<tag if any>)
Previous base: <sha from product-sync.json before this sync>
Sync PR: #NNN

## Summary
Product commits integrated:
Files changed:
Conflicts (count + list):
New conflicts vs previous sync:
Watchlist files touched:

## Classification
### A — Auto-integrated
- <area>: <commits/themes>

### B — Reviewed and accepted
- <file/feature>: <impact note>

### C — Adapted for Kenya
- <feature>: product change + how Kenya behavior was preserved

### D — Excluded (each entry mandatory-complete)
```
Product change:
Product commit:
Files:
Reason:
Kenya behavior:
Decision: EXCLUDE
```

## Potential Kenya customization loss checked
- [ ] PGR_PII_MASKING still off for Kenya deploys
- [ ] allowed.source channel list intact
- [ ] escalation deploy config intact (per standing decision)
- [ ] localization trees intact (pt_PT / en_IN Kenya labels)
- [ ] tenant host_vars / nginx templates intact
- [ ] keep-fork files ported manually (list which)

## Testing
- lint / unit (`node --test`) / backend CI build:
- esbuild + configurator builds:
- parity guards:
- Playwright smoke (citizen create → assignee inbox; employee inbox defaults; details):
- Kenya regression (landing, branding, auto-assign, escalation states, dept access, SMS, localization):
- NOT-RUN (with reasons):

## UAT result

## Rollback point
Sync merge commit: <sha> (revert with `git revert -m 1`)
