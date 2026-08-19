# PGR Public Landing Page

Self-contained public landing page for the Complaints & Reports Portal —
shipped for the County Government of Bomet as the "Bomet Feedback Hub". It
routes citizens into the **existing** application; it implements no internal
pages, no auth and no APIs of its own.

The layout is config-driven: sections come from MDMS and are assembled through
a type-to-component registry, with a built-in default that reproduces the page
exactly when MDMS has nothing to say.

## How it is mounted

Both public pages are registered as named components by the PGR module and
mounted **shell-free** (no topbar, no sidebar) by core:

| Page | Registered in | Route (core `App.js`) |
| --- | --- | --- |
| Landing | `products/pgr/src/Module.js` as `PGRLandingPage` → `AppEntry.tsx` | `/${contextPath}/landing` |
| Privacy notice | `products/pgr/src/Module.js` as `PGRPrivacyPolicy` → `PrivacyPolicyPage.tsx` | `/${contextPath}/privacy-policy` |

Shell-free matters: the page carries its own header, nav and footer, so
rendering it inside the app shell would produce a page within a page.

`AppEntry.tsx` is the deployment wrapper. The app's router has no basename, so
it prefixes the in-app destinations with the runtime `contextPath` and supplies
the county emblem. Point integration changes there, not at `index.tsx`.

If you ever do need the page inside the shell, offset the sticky nav so it pins
below the app topbar:

```jsx
<div style={{ "--pgrl-nav-offset": "82px" }}>
  <PGRLandingPage />
</div>
```

Note that `REGISTER_COMPLAINT` and `TRACK_COMPLAINT` are private routes, so
anonymous visitors are sent to login by the existing app. That is usually the
intended funnel; point the routes elsewhere if it is not.

## Use in any React app

```jsx
import PGRLandingPage from ".../Landing";

<PGRLandingPage
  routes={{
    REGISTER_COMPLAINT: "/citizen/pgr/create-complaint",
    TRACK_COMPLAINT: "/citizen/pgr/complaints",
    PRIVACY: "/digit-ui/privacy-policy",
  }}
/>
```

Requirements: React 17+, `react-i18next` (any configured instance — the page
works with zero translations seeded), and the compiled Tailwind CSS from
`packages/digit-ui-components-v2/src/theme/tailwind.css`. A react-router v5
`<Router>` above the page is **optional**: with one, internal links use
`history.push`; without one, they degrade to plain anchors.

## Props (`PGRLandingPageProps`)

| Prop | Default | Purpose |
| --- | --- | --- |
| `routes` | `DEFAULT_LANDING_ROUTES` | Destination map — every CTA resolves through it. `"#"` renders a disabled control instead of a dead link. |
| `news` | `DEFAULT_NEWS` | Updates-grid cards (pass CMS content in production). |
| `heroImageUrl` | none | Optional hero photo, rendered under a navy scrim. |
| `emblemUrl` | none | County emblem in the masthead (falls back to a glyph). |
| `languages` | `en_IN` | Language switcher options (`{ code, label }`). |
| `onLanguageChange` | platform localization service | Override for locale switching. |
| `tokens` | Bomet blues | Design-token overrides (HSL triples — see `tokens.ts`). |
| `showWhatsAppFab` | `true` | Floating WhatsApp action; renders nothing while the route is `"#"`. |
| `showUtilityBar` | `false` | Top gov strip (hotline, phone, language, sign-in). |

Destinations still to fill in per deployment: `TRAINING`, `ABOUT`, `CONTACTS`,
`FAQ`, `TERMS`, `ACCESSIBILITY`, `NEWS`, `ANDROID_APP` and `WHATSAPP` default
to `"#"`. `EMPLOYEE_LOGIN` defaults to `/employee` — confirm per deployment.

## Layout config (MDMS)

`RAINMAKER-PGR.LandingSection` rows say which sections appear and in what
order; `RAINMAKER-PGR.LandingPageConfig` carries the page-level toggles. City
rows override state rows by `code`.

- Each row needs a `type` from the registry in `config/sectionRegistry.tsx`.
  Unknown types are ignored.
- `status: "DRAFT"`, `enabled: false` or a `roles` list hides a row. An admin
  can preview hidden rows with `?preview=1`.
- With no rows at all the page falls back to the built-in layout in
  `config/defaults.ts`. Once rows exist they decide the page — if they all
  filter out, nothing renders. Unpublished drafts are never shown publicly.
- Row `code` drives each section's DOM id, so repeated section types stay
  distinct for screen readers and for the Builder.
- `iconId` on an item must be a name from `config/iconRegistry.ts`; anything
  else falls back to a default glyph.
- Neither the layout nor the text is cached, so an operator's save shows up on
  the next page load.

## Theming

Two layers, no code changes needed:

1. **Tenant theme**: set `--pgrl-<token>-brand` custom properties on `:root`
   (via `applyTheme.js` / tenant branding). Every token defers to its `-brand`
   override, e.g. `--pgrl-primary-brand: 210 60% 35%;`.
2. **Per-mount**: pass the `tokens` prop.

Token names map to kebab-case CSS vars (`typeReport` → `--pgrl-type-report`).
All colours are HSL channel triples (`"200.4 75.8% 48.6%"`).

## Copy

Every string resolves in order: MDMS key `PGR_LANDING_<KEY>` → the built-in
deck in `content.ts` → empty. A missing key never prints on the page.

The key list is `LANDING_COPY` in `content.ts`; prefix each key with
`PGR_LANDING_` to seed it. News items are plain strings by design (CMS content,
not UI copy).

Every factual claim in `content.ts` has to be backed by the county's
onboarding workbook — the header of that file explains the rule. Do not add a
promise the service does not keep.

## File map

```
Landing/
├── AppEntry.tsx         deployment wrapper: contextPath routes + county emblem
├── index.tsx            entry: picks MDMS or Builder-preview config
├── LandingRenderer.tsx  assembles sections into header/main/footer
├── PrivacyPolicyPage.tsx  standalone privacy notice page
├── routes.ts            LandingRoutes map + mergeRoutes
├── tokens.ts            design tokens (HSL triples), focus-ring constants
├── content.ts           copy deck + section data (types, steps, channels, news)
├── useLandingCopy.ts    copy resolution (MDMS → deck → empty)
├── config/
│   ├── types.ts             config row shapes
│   ├── defaults.ts          built-in layout used when MDMS is empty
│   ├── useLandingConfig.ts  reads the layout from MDMS (uncached)
│   ├── useLandingMessages.ts loads the PGR text bundle
│   ├── usePreviewBridge.ts  Builder preview: scroll, highlight, click-to-edit
│   ├── sectionRegistry.tsx  section type → component + props
│   ├── resolve.ts           link safety, DOM ids, item and section resolution
│   └── iconRegistry.ts      allowed icon names
└── components/
    ├── LandingLink.tsx  router-optional anchor (placeholder-aware, link-safe)
    ├── CtaLink.tsx      link-as-button variants
    ├── Section.tsx      section shell (rhythm, heading + accent bar, landmarks)
    ├── DotGrid.tsx      decorative dot pattern for the dark bands
    ├── UtilityBar.tsx   gov strip: hotline, phone, language toggle, sign-in
    ├── LandingHeader.tsx masthead + sticky nav + mobile menu
    ├── HeroSection.tsx  H1, dual CTA, trust markers, channel chips
    ├── TypesSection.tsx service areas (Health, Water, Administration)
    ├── HowItWorksSection.tsx  6-step ordered list + deadlines note
    ├── ChannelsSection.tsx    ways to reach the service
    ├── PrivacySection.tsx     data-protection block + link to the notice
    ├── NewsSection.tsx        county updates grid
    ├── InstitutionsSection.tsx the five sub-county offices
    ├── FinalCtaSection.tsx    closing band
    ├── LandingFooter.tsx      channels / links / access / legal
    └── WhatsAppFab.tsx        floating WhatsApp action
```
