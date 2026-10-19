// Content model + built-in copy deck for the PGR public landing page.
//
// Every user-visible string resolves in three steps (see useLandingCopy.ts):
//   1. MDMS/i18next translation for key `PGR_LANDING_<KEY>` — wins when seeded.
//   2. Built-in copy below (`en`; other locales come from seeded MDMS keys).
//   3. The raw key (never expected to surface).
//
// ── Deployment: Nairobi City County Government, Kenya ("Bonga Nai") ──
// Portal renamed from "Nai Pepea" to "Bonga Nai" (September 2026); the BRD
// still carries the launch name.
// Every factual claim below comes from the Nai Pepea Business Requirements
// Document (BRD Draft V0.1, September 2026; NCCG / eGov Global / Smart Nairobi /
// World Bank) and the county's public website (nairobi.go.ke — contacts):
//   • Pilot scope       — Makadara and Kibra Sub-Counties; 9 wards identified.
//   • Pilot departments — Urban Development & Planning, Environment / Green
//     Nairobi, Finance & Economic Planning, Boroughs & Sub-County Administration
//     (escalation contacts confirmed); a 17-department catalog is configured.
//   • Intake            — self-service web portal (name + mobile, no National
//     ID), call agents logging calls manually, counter employees at ward /
//     sub-county offices. English only in Phase 1. WhatsApp is registered but
//     NOT a live channel.
//   • Case number       — issued at submission, on screen and by SMS
//     (proposed format NP-YYYY-0000001).
//   • Routing           — Customer Service assigns each case to the Department
//     Representative or the Director of the concerned department.
//   • Escalation        — 72 hours for the first assignee, then automatic:
//     Director (+24 h) → Chief Officer (+24 h) → CECM (final tier).
//   • Notifications     — SMS on registration, assignment, escalation,
//     resolution and closure (e-mail fallback while the gateway is pending).
// Do NOT add a claim here that the BRD does not support — this is the
// public-facing promise of the service.
//
// The top of the page (strip, masthead, hero, service categories and slogan
// band) follows the county's Bonga Nai landing design of 2026-10-12 word for
// word, including its four service categories.
//
// News defaults are placeholders; production deployments pass real items via
// the `news` prop on <PGRLandingPage />.

import type * as React from "react";
import {
  HeartPulse,
  Leaf,
  Store,
  Landmark,
  Send,
  Hash,
  UserCheck,
  Clock,
  ArrowUpCircle,
  CheckCircle2,
  Globe,
  Bell,
  Phone,
  MapPin,
} from "lucide-react";
import { RoadIcon } from "./components/Illustrations";
import type { LandingRoutes } from "./routes";

// Loose icon type: lucide-react@1.x has no LucideIcon export.
export type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const LANDING_COPY = {
  // Chrome ------------------------------------------------------------------
  GOV_NAME: { en: "Nairobi City County Government" },
  // Utility strip and masthead name (set in capitals by the layout).
  COUNTY_NAME: { en: "Nairobi City County" },
  PORTAL_NAME: { en: "Bonga Nai" },
  ORG_NAMES: { en: "Office of the County Chief Officer · Public Participation, Citizen Engagement and Customer Service" },
  FOOTER_ORG: { en: "Nairobi City County Government" },
  TAGLINE: { en: "You report it. The County acts on it." },
  // The county's own slogan, as carried on its crest.
  MOTTO_VALUES: { en: "Let's Make Nairobi Work" },
  // The word of the motto the slogan band sets in bold capitals.
  MOTTO_EMPHASIS: { en: "Nairobi" },
  SKIP_LINK: { en: "Skip to main content" },
  UTILITY_PHONE_LABEL: { en: "Nairobi City County Government" },
  UTILITY_GREEN_LINE: { en: "County Help Line" },
  UTILITY_GREEN_LINE_FREE: { en: "Call agents log your complaint for you" },
  LOGIN: { en: "Sign in" },
  ARIA_LANGUAGE: { en: "Language" },
  ARIA_UTILITY: { en: "Service information" },

  // Navigation ---------------------------------------------------------------
  ARIA_MAIN_NAV: { en: "Main navigation" },
  NAV_MENU_OPEN: { en: "Open menu" },
  NAV_MENU_CLOSE: { en: "Close menu" },
  NAV_HOME: { en: "Home" },
  NAV_SUBMIT: { en: "Report an Issue" },
  NAV_TRACK: { en: "Track a Complaint" },
  NAV_TRAINING: { en: "Help" },
  NAV_ABOUT: { en: "About" },
  NAV_CONTACTS: { en: "Contacts" },
  NAV_ABOUT_PORTAL: { en: "About Bonga Nai" },
  NAV_HELP_FAQ: { en: "Help & FAQs" },

  // Hero -----------------------------------------------------------------—--
  HERO_SLOGAN: { en: "A Cleaner • Greener • Safer Nairobi" },
  // The last word is set in gold.
  HERO_TITLE: { en: "Bonga Nai" },
  HERO_HEADLINE: { en: "Speak up. Nairobi works." },
  HERO_PILOT_NOTICE: {
    en:
      "Pilot phase: complaints are handled for six Sub-Counties — Makadara, Lang'ata, Kibra, Kasarani, Embakasi North and Kamukunji. Other parts of Nairobi will follow as the service scales up to all 85 wards.",
  },
  HERO_LEDE: {
    en:
      "Report a problem with a county service, get a case number within seconds, and follow it until it is resolved. Every case is assigned to an officer in the responsible department and escalated automatically if it misses its deadline.",
  },
  HERO_CTA_SUBMIT: { en: "Report an Issue" },
  HERO_CTA_TRACK: { en: "Track a Complaint" },
  // Hero benefits: a title and a line under it.
  HERO_BENEFIT_ID_TITLE: { en: "No National ID needed" },
  HERO_BENEFIT_ID_DESC: { en: "Just your name and mobile number" },
  HERO_BENEFIT_CASE_TITLE: { en: "Unique case number" },
  HERO_BENEFIT_CASE_DESC: { en: "Get your case number instantly" },
  HERO_BENEFIT_SMS_TITLE: { en: "SMS updates" },
  HERO_BENEFIT_SMS_DESC: { en: "Receive updates on your phone" },
  HERO_BENEFIT_DEADLINE_TITLE: { en: "Time-bound resolution" },
  HERO_BENEFIT_DEADLINE_DESC: { en: "Escalated automatically if it misses deadline" },
  // Single-line hero features for MDMS-configured hero items (the Builder
  // seeds these keys).
  HERO_TRUST_CONFIDENTIAL: { en: "No National ID needed, just your name and mobile number" },
  HERO_TRUST_CASE_NUMBER: { en: "Unique case number" },
  HERO_TRUST_NOTIFICATIONS: { en: "SMS acknowledgement with your case number" },
  HERO_CHANNELS_LABEL: { en: "Also available through:" },
  // Hand-lettered tagline on the phone photo card of the areas section.
  HERO_SCRIPT: { en: "A Cleaner, Greener Nairobi" },
  // Speech bubble on the circular photos beside the steps and channels.
  ORB_TAGLINE: { en: "Your Voice Matters" },
  HERO_CHANNEL_APP: { en: "Counter desks at ward and sub-county offices" },
  HERO_CHANNEL_WA: { en: "SMS case updates" },
  HERO_CHANNEL_LINE: { en: "County help line" },

  // Service categories ("types" section) --------------------------------—--
  TYPES_KICKER: { en: "Report issues by service category" },
  TYPES_HEADING: { en: "What would you like to report?" },
  TYPES_SUBHEADING: { en: "Select a category to report an issue related to county services." },
  TYPES_VIEW_ALL: { en: "View all categories" },
  TYPE_MOBILITY_TITLE: { en: "Mobility & Works" },
  TYPE_MOBILITY_DESC: { en: "Roads, drainage, street lighting, footpaths and infrastructure." },
  TYPE_HEALTH_TITLE: { en: "Public Health" },
  TYPE_HEALTH_DESC: { en: "Waste collection, sanitation, public toilets, food safety and disease control." },
  TYPE_GREEN_TITLE: { en: "Environment" },
  TYPE_GREEN_DESC: { en: "Clean and green spaces, parks, trees, noise control and environmental management." },
  TYPE_MARKETS_TITLE: { en: "Revenue & Markets" },
  TYPE_MARKETS_DESC: { en: "Markets, business permits, county revenues and trading infrastructure." },
  TYPE_CTA: { en: "Report an issue" },

  // How it works -----------------------------------------------------------
  HOW_EYEBROW: { en: "From report to resolution" },
  HOW_TITLE: { en: "How It Works" },
  HOW_STEP_LABEL: { en: "Step" },
  HOW_STEP_1: { en: "Report through this portal, the county help line or a counter desk" },
  HOW_STEP_2: { en: "Receive your case number on screen and by SMS" },
  HOW_STEP_3: { en: "Customer Service assigns it to the responsible department" },
  HOW_STEP_4: { en: "The officer investigates and resolves it within 72 hours" },
  HOW_STEP_5: { en: "A missed deadline escalates the case automatically" },
  HOW_STEP_6: { en: "You confirm the outcome and rate the service" },
  HOW_NOTE_TITLE: { en: "Who handles your case, and what happens if it stalls" },
  HOW_NOTE_NOTIFY: {
    en:
      "Customer Service assigns every case to the Director of the department concerned, who is directly responsible for resolving it.",
  },
  HOW_NOTE_RECORD: {
    en:
      "If the 72-hour deadline passes without a resolution, the case moves up on its own: Director → Chief Officer (24 more hours) → County Executive Committee Member (CECM), the final tier.",
  },
  HOW_NOTE_CHANNELS: {
    en:
      "You are notified by SMS when your case is registered, assigned, escalated, resolved and closed. The same deadline applies to every complaint, whichever channel you used.",
  },

  // Customer Service help lines ("helplines" section) -----------------—---
  HELPLINES_CS_EYEBROW: { en: "Customer service" },
  HELPLINES_CS_TITLE: { en: "Call Customer Service" },
  HELPLINES_CS_INTRO: {
    en: "Speak to a call agent: they log your complaint for you and read your case number back to you.",
  },
  HELPLINE_CS_NOTE: { en: "Calling about a complaint you have already filed? Have your case number ready." },
  HELPLINE_COUNTY_TITLE: { en: "County Help Line" },
  // Labels on the help-line tiles (CONTACT.hotlines).
  HELPLINE_LINE_24_7: { en: "Open 24/7" },
  HELPLINE_LINE_MOBILE: { en: "Mobile" },
  HELPLINE_LINE_LANDLINE: { en: "Landline" },
  HELPLINES_CALL: { en: "Call" },

  // Channels -----------------------------------------------------------—---
  CHANNELS_EYEBROW: { en: "Channels" },
  CHANNELS_TITLE: { en: "Ways to Reach Us" },
  CHANNELS_INTRO: {
    en:
      "Every channel creates the same case in the same system, with the same case number and the same deadline. Choose whichever is easiest for you.",
  },
  CHANNEL_WEB_TITLE: { en: "This Portal" },
  CHANNEL_WEB_DESC: {
    en:
      "Register with your name and mobile number, no National ID required. Submit, attach photos or documents, and see the full history of your case.",
  },
  CHANNEL_WEB_CTA: { en: "Report an issue" },
  CHANNEL_WEB_BADGE: { en: "You are here" },
  CHANNEL_LINE_TITLE: { en: "County Help Line" },
  CHANNEL_LINE_DESC: {
    en:
      "Call agents log your complaint while you are on the call and read your case number back to you. Two shifts, every working day.",
  },
  CHANNEL_LINE_CTA: { en: "Call the help line" },
  CAROUSEL_PREV: { en: "Previous channels" },
  CAROUSEL_NEXT: { en: "Next channels" },
  CHANNEL_INPERSON_TITLE: { en: "Counter Desks" },
  CHANNEL_INPERSON_DESC: {
    en:
      "Counter employees at ward and sub-county offices log walk-in complaints for you and hand over your case reference before you leave.",
  },
  CHANNEL_INPERSON_CTA: { en: "Find a desk" },
  CHANNEL_SMS_TITLE: { en: "SMS Updates" },
  CHANNEL_SMS_DESC: {
    en:
      "When your complaint is registered you get an SMS with your case number, then further SMS as its status changes. No smartphone or data needed.",
  },
  // Retained key: referenced directly by WhatsAppFab, which renders nothing
  // while the WHATSAPP route is "#" (WhatsApp is registered but not a live
  // Phase 1 channel for Bonga Nai).
  CHANNEL_WA_CTA: { en: "Chat on WhatsApp" },

  // Privacy ------------------------------------------------------------—---
  CHANNEL_SMS_CTA: { en: "Track your case" },
  PRIVACY_EYEBROW: { en: "Privacy & data" },
  PRIVACY_TITLE: { en: "Your Privacy and Your Data" },
  PRIVACY_P1: {
    en:
      "Nairobi City County Government protects the personal information you submit in line with the Data Protection Act, 2019.",
  },
  PRIVACY_P2: {
    en:
      "Your details are used to register, route and resolve your complaint and to send you SMS updates. They are seen only by the department and officer handling your case and by Customer Service in its oversight role, and are not shared with unauthorised third parties.",
  },
  PRIVACY_LINK: { en: "Read the Privacy Notice" },

  // Privacy policy (full page) ---------------------------------------------
  PRIVACY_PAGE_TITLE: { en: "Privacy Notice" },
  PRIVACY_PAGE_P1: {
    en:
      "Bonga Nai is operated by the Nairobi City County Government through the Office of the County Chief Officer for Public Participation, Citizen Engagement and Customer Service. We are committed to protecting your privacy and to handling your personal information securely, transparently and in line with the Data Protection Act, 2019.",
  },
  PRIVACY_PAGE_P2: {
    en:
      "When you report an issue you consent to the collection and processing of the information you provide so that your complaint can be registered, routed, investigated and resolved. This includes your name, mobile number, the ward and location of the issue, the complaint category and sub-type, your description of the problem, the date of the event, and any photographs or documents you choose to attach. Registration does not require a National ID.",
  },
  PRIVACY_PAGE_P3: {
    en:
      "Your information is accessed only by the authorised county officers responsible for handling your complaint — the department and officer the case is assigned to and the officers in its escalation chain — and by Customer Service in its oversight capacity. It is not shared with unauthorised third parties and is never used for commercial or marketing purposes. The portal does not currently offer anonymous or identity-shielded reporting: the officers handling your complaint can see the name and mobile number you registered with.",
  },
  PRIVACY_PAGE_P4: {
    en:
      "Your mobile number is used to send case notifications by SMS. Technical information such as device data, IP address and system usage may also be collected to keep the service secure and working properly. All communication with the service is encrypted, access is controlled by role, and every access, assignment and status change is recorded in an audit log.",
  },
  PRIVACY_PAGE_P5: {
    en:
      "Information is retained only for as long as needed to resolve your complaint, meet legal obligations and maintain official county records. You may request access to your personal information or ask for it to be corrected, subject to applicable law and to any restriction needed to protect an ongoing investigation.",
  },

  // News ---------------------------------------------------------------—---
  NEWS_TITLE: { en: "County Updates" },
  NEWS_READ_MORE: { en: "Read more" },
  NEWS_VIEW_ALL: { en: "See all updates" },

  // Areas covered ("institutions" section) -----------------------------—---
  INST_EYEBROW: { en: "Pilot geography" },
  // Footer wordmark, two lines, set in type beside the crest.
  WORDMARK_LINE1: { en: "Nairobi" },
  WORDMARK_LINE2: { en: "City County" },
  INST_TITLE: { en: "Areas We Cover" },
  INST_INTRO: { en: "Bonga Nai starts in six sub-counties, 17 wards in all. Every ward listed here has counter staff and an assigned department contact." },
  INST_MAKADARA_TITLE: { en: "Makadara Sub-County" },
  INST_MAKADARA_DESC: { en: "Wards: Viwandani · Harambee · Makongeni · Maringo/Hamza" },
  INST_LANGATA_TITLE: { en: "Lang'ata Sub-County" },
  INST_LANGATA_DESC: { en: "Wards: Karen · Nairobi West · Mugumo-ini · South C · Nyayo Highrise" },
  INST_KIBRA_TITLE: { en: "Kibra Sub-County" },
  INST_KIBRA_DESC: { en: "Wards: Laini Saba · Lindi · Makina · Woodley/Kenyatta Golf Course · Sarang'ombe" },
  INST_KASARANI_TITLE: { en: "Kasarani Sub-County" },
  INST_KASARANI_DESC: { en: "Ward: Ruai" },
  INST_EMBAKASI_NORTH_TITLE: { en: "Embakasi North Sub-County" },
  INST_EMBAKASI_NORTH_DESC: { en: "Ward: Dandora" },
  INST_KAMUKUNJI_TITLE: { en: "Kamukunji Sub-County" },
  INST_KAMUKUNJI_DESC: { en: "Ward: Eastleigh" },

  // Final CTA ----------------------------------------------------------—---
  FINAL_TITLE: { en: "Have a complaint about a county service?" },
  FINAL_TEXT: {
    en:
      "It takes a few minutes. You get a case number, SMS updates, and an officer accountable for a deadline.",
  },
  FINAL_CTA: { en: "Report an Issue" },

  // Footer -------------------------------------------------------------—---
  FOOTER_CHANNELS: { en: "Ways to Reach Us" },
  FOOTER_LINKS: { en: "Useful Links" },
  FOOTER_ACCESS: { en: "Access" },
  FOOTER_LEGAL: { en: "Legal" },
  FOOTER_PORTAL_WEB: { en: "This Portal" },
  FOOTER_ANDROID: { en: "Counter Desks" },
  FOOTER_WHATSAPP: { en: "SMS Updates" },
  FOOTER_GREEN_LINE: { en: "County Help Line" },
  FOOTER_FAQ: { en: "Frequently Asked Questions" },
  FOOTER_CITIZEN_LOGIN: { en: "Citizen Sign in" },
  FOOTER_EMPLOYEE_LOGIN: { en: "County Staff Access" },
  FOOTER_PRIVACY: { en: "Privacy Notice" },
  FOOTER_TERMS: { en: "Terms of Use" },
  FOOTER_ACCESSIBILITY: { en: "Accessibility" },
  FOOTER_CONTACT: { en: "Contact the County" },
  CONTACT_HOTLINE: { en: "Help Line" },
  CONTACT_EMAIL: { en: "Email" },
  CONTACT_POST: { en: "Postal Address" },
  FOOTER_FOLLOW: { en: "Follow the County" },
  SOCIAL_FACEBOOK: { en: "Facebook" },
  SOCIAL_X: { en: "X (formerly Twitter)" },
  SOCIAL_YOUTUBE: { en: "YouTube" },
  FOOTER_COPYRIGHT: {
    en: "Bonga Nai · Nairobi City County Government. All rights reserved.",
  },

  // Misc ---------------------------------------------------------------—---
  FAB_LABEL: { en: "Chat with us" },
  PLACEHOLDER_PENDING: { en: "Page being configured" },
  EXTERNAL_LINK_NOTE: { en: "opens in a new window" },
} as const;

export type LandingCopyKey = keyof typeof LANDING_COPY;

// ---------------------------------------------------------------------------
// Structured section data
// ---------------------------------------------------------------------------

// County contact details ----------------------------------------------------
//
// The phone lines and email are the ones the county sent for Bonga Nai on
// 2026-10-12 (0725 624 489 is staffed 24/7). They replace the lines and email
// on nairobi.go.ke on purpose; the postal address is from that site's footer
// (2026-09-22). Deliberately NOT i18n copy: a phone number, an email address
// and a postal address read identically in every language.
//
// `hotline` is the single source of truth for the number — routes.ts builds
// GREEN_LINE/PHONE from it, so editing it here also updates every help-line
// CTA (utility bar, channels section, footer). Keep it digits-only. Where the
// numbers are shown on screen, use `hotlines`: the county publishes several
// lines, and each is its own tel: link — one link over them all could only
// ever dial the first. The BRD's dedicated Nai Pepea call-centre number is
// not yet assigned; until it is, the county's published help line is used.
export interface HotlineNumber {
  tel: string;
  display: string;
  /** Short qualifier shown after the number in running text, e.g. "24/7". */
  note?: string;
  /** Label on the number's help-line tile. */
  labelKey?: LandingCopyKey;
}

export const CONTACT = {
  hotline: "+254725624489",
  // The same line as the utility strip shows it, in international form.
  hotlineDisplay: "+254 725 624 489",
  hotlines: [
    { tel: "+254725624489", display: "0725 624 489", note: "24/7", labelKey: "HELPLINE_LINE_24_7" },
    { tel: "+254730047047", display: "0730 047 047", labelKey: "HELPLINE_LINE_MOBILE" },
    { tel: "+254207247047", display: "020 724 7047", labelKey: "HELPLINE_LINE_LANDLINE" },
  ] as ReadonlyArray<HotlineNumber>,
  email: "lydiagatheru@yahoo.com",
  poBox: "City Hall, P.O. Box 30075-00100, Nairobi, Kenya",
} as const;

export interface SocialLink {
  /** Also selects the brand mark drawn in LandingFooter. */
  id: "facebook" | "x" | "youtube";
  labelKey: LandingCopyKey;
  href: string;
}

// Official Nairobi City County accounts, as linked from nairobi.go.ke. The
// county also runs an Instagram account (nairobi_citycountygovernment); the
// footer has no Instagram mark yet, so it is not listed.
export const SOCIAL_LINKS: SocialLink[] = [
  { id: "facebook", labelKey: "SOCIAL_FACEBOOK", href: "https://www.facebook.com/countyGovernment047/" },
  { id: "x", labelKey: "SOCIAL_X", href: "https://twitter.com/047County" },
];

export interface NavItem {
  labelKey: LandingCopyKey;
  route?: keyof LandingRoutes;
  /** Literal destination (an in-page "#section" anchor) when no route applies. */
  href?: string;
}

// About and Help jump to the page's own sections (their DOM ids come from
// sectionDomId): there is no separate about or FAQ page yet.
export const NAV_ITEMS: NavItem[] = [
  { labelKey: "NAV_HOME", route: "HOME" },
  { labelKey: "NAV_SUBMIT", route: "REGISTER_COMPLAINT" },
  { labelKey: "NAV_TRACK", route: "TRACK_COMPLAINT" },
  { labelKey: "NAV_ABOUT_PORTAL", href: "#pgr-landing-steps" },
  { labelKey: "NAV_HELP_FAQ", href: "#pgr-landing-channels" },
];

export interface ManifestationType {
  id: string;
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
  /** CSS var (HSL triple) filling the card's round icon. */
  accentVar: string;
  route: keyof LandingRoutes;
}

// The design's four service categories. `id` is the matching department code
// in Bonga's catalogue; it also keys the card photo the deployment entry
// supplies (LandingArtwork.categories). Every card opens the complaint form,
// where the citizen picks the exact type.
export const MANIFESTATION_TYPES: ManifestationType[] = [
  { id: "mobility_works", icon: RoadIcon, titleKey: "TYPE_MOBILITY_TITLE", descKey: "TYPE_MOBILITY_DESC", accentVar: "--pgrl-top-gold", route: "REGISTER_COMPLAINT" },
  { id: "health_wellness_and_nutrition", icon: HeartPulse, titleKey: "TYPE_HEALTH_TITLE", descKey: "TYPE_HEALTH_DESC", accentVar: "--pgrl-top-leaf", route: "REGISTER_COMPLAINT" },
  { id: "green_nairobi", icon: Leaf, titleKey: "TYPE_GREEN_TITLE", descKey: "TYPE_GREEN_DESC", accentVar: "--pgrl-top-leaf", route: "REGISTER_COMPLAINT" },
  { id: "finance_and_economic_planning_affairs", icon: Store, titleKey: "TYPE_MARKETS_TITLE", descKey: "TYPE_MARKETS_DESC", accentVar: "--pgrl-top-gold", route: "REGISTER_COMPLAINT" },
];

export interface HowStep {
  icon: IconComponent;
  titleKey: LandingCopyKey;
}

export const HOW_STEPS: HowStep[] = [
  { icon: Send, titleKey: "HOW_STEP_1" },
  { icon: Hash, titleKey: "HOW_STEP_2" },
  { icon: UserCheck, titleKey: "HOW_STEP_3" },
  { icon: Clock, titleKey: "HOW_STEP_4" },
  { icon: ArrowUpCircle, titleKey: "HOW_STEP_5" },
  { icon: CheckCircle2, titleKey: "HOW_STEP_6" },
];

export interface ChannelItem {
  id: string;
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
  ctaKey?: LandingCopyKey;
  route?: keyof LandingRoutes;
  /** Literal destination (e.g. an in-page "#section" anchor) when no route applies. */
  href?: string;
  /** Chip shown on the current channel ("You are here"). */
  badgeKey?: LandingCopyKey;
  external?: boolean;
}

export const CHANNELS: ChannelItem[] = [
  { id: "web", icon: Globe, titleKey: "CHANNEL_WEB_TITLE", descKey: "CHANNEL_WEB_DESC", ctaKey: "CHANNEL_WEB_CTA", route: "REGISTER_COMPLAINT", badgeKey: "CHANNEL_WEB_BADGE" },
  { id: "callcentre", icon: Phone, titleKey: "CHANNEL_LINE_TITLE", descKey: "CHANNEL_LINE_DESC", ctaKey: "CHANNEL_LINE_CTA", route: "GREEN_LINE" },
  // In-page jump to the "Areas We Cover" section (its DOM id from sectionDomId).
  { id: "counter", icon: MapPin, titleKey: "CHANNEL_INPERSON_TITLE", descKey: "CHANNEL_INPERSON_DESC", ctaKey: "CHANNEL_INPERSON_CTA", href: "#pgr-landing-institutions" },
  { id: "sms", icon: Bell, titleKey: "CHANNEL_SMS_TITLE", descKey: "CHANNEL_SMS_DESC", ctaKey: "CHANNEL_SMS_CTA", route: "TRACK_COMPLAINT" },
];

export interface HelplineItem {
  id: string;
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
  /** Dialable number (tel: href). */
  href: string;
  /** How the number reads on screen. */
  numberDisplay: string;
  /** More than one line for the same service: each number renders as its own
   *  tel: link (href/numberDisplay then describe the first). */
  numbers?: ReadonlyArray<HotlineNumber>;
}

// The help lines shown on the landing page: Nairobi City County Customer
// Service only. The county asked on 2026-10-12 for the police, ambulance and
// fire numbers to come off the page. The tiles take their numbers and labels
// from CONTACT.hotlines. Override via the MDMS LandingSection items
// (labelKey / descKey / navigationUrl "tel:…").
export const HELPLINES: HelplineItem[] = [
  { id: "county", icon: Phone, titleKey: "HELPLINE_COUNTY_TITLE", descKey: "HELPLINE_CS_NOTE", href: `tel:${CONTACT.hotline}`, numberDisplay: CONTACT.hotlines[0].display, numbers: CONTACT.hotlines },
];

export interface InstitutionItem {
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
}

// County > Sub-County > Ward — the pilot geography from BRD §6.1.
export const INSTITUTIONS: InstitutionItem[] = [
  // Order follows the BRD's ward table (§6.1): the four multi-ward
  // sub-counties first, then the three single-ward ones.
  { id: "makadara", icon: Landmark, titleKey: "INST_MAKADARA_TITLE", descKey: "INST_MAKADARA_DESC" },
  { id: "langata", icon: Landmark, titleKey: "INST_LANGATA_TITLE", descKey: "INST_LANGATA_DESC" },
  { id: "kibra", icon: Landmark, titleKey: "INST_KIBRA_TITLE", descKey: "INST_KIBRA_DESC" },
  { id: "kasarani", icon: Landmark, titleKey: "INST_KASARANI_TITLE", descKey: "INST_KASARANI_DESC" },
  { id: "embakasi-north", icon: Landmark, titleKey: "INST_EMBAKASI_NORTH_TITLE", descKey: "INST_EMBAKASI_NORTH_DESC" },
  { id: "kamukunji", icon: Landmark, titleKey: "INST_KAMUKUNJI_TITLE", descKey: "INST_KAMUKUNJI_DESC" },
];

export interface NewsItem {
  id: string;
  /** Pre-formatted display date (news is CMS content — not run through i18n). */
  dateLabel: string;
  /** ISO date for the <time> element. */
  dateTime: string;
  tag: string;
  title: string;
  excerpt: string;
  source: string;
  href: string;
  imageUrl?: string;
}

// PLACEHOLDERS. These describe the pilot as scoped in the BRD so the section is
// not empty in a demo; replace them with real county communications via the
// `news` prop before go-live.
export const DEFAULT_NEWS: NewsItem[] = [
  {
    id: "pilot-scope",
    dateLabel: "Pilot phase",
    dateTime: "2026-09-01",
    tag: "Programme",
    title: "Bonga Nai opens in Makadara and Kibra",
    excerpt:
      "The pilot covers two sub-counties and nine wards, with complaint types configured for 17 county departments so the service can scale without re-configuration.",
    source: "Nairobi City County Government",
    href: "#",
  },
  {
    id: "help-line",
    dateLabel: "Pilot phase",
    dateTime: "2026-09-01",
    tag: "Help Line",
    title: "Call agents log complaints on your behalf",
    excerpt:
      "Agents working two shifts capture your name, mobile number, ward, category and description, then read your case number back to you before the call ends.",
    source: "Nairobi City County Government",
    href: "#",
  },
  {
    id: "counter-desks",
    dateLabel: "Pilot phase",
    dateTime: "2026-09-01",
    tag: "Counter Desks",
    title: "Counter desks accept walk-in complaints at ward and sub-county offices",
    excerpt:
      "Counter employees register your complaint in the same system and hand you your case reference, so a visit in person is tracked exactly like an online report.",
    source: "Nairobi City County Government",
    href: "#",
  },
];
