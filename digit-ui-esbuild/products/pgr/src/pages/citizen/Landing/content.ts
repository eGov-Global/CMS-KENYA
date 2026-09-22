// Content model + built-in copy deck for the PGR public landing page.
//
// Every user-visible string resolves in three steps (see useLandingCopy.ts):
//   1. MDMS/i18next translation for key `PGR_LANDING_<KEY>` — wins when seeded.
//   2. Built-in copy below (`en`; other locales come from seeded MDMS keys).
//   3. The raw key (never expected to surface).
//
// ── Deployment: Nairobi City County Government, Kenya ("Nai Pepea") ──
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
// News defaults are placeholders; production deployments pass real items via
// the `news` prop on <PGRLandingPage />.

import type * as React from "react";
import {
  Building2,
  Leaf,
  Coins,
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
import type { LandingRoutes } from "./routes";

// Loose icon type: lucide-react@1.x has no LucideIcon export.
export type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const LANDING_COPY = {
  // Chrome ------------------------------------------------------------------
  GOV_NAME: { en: "Nairobi City County Government" },
  PORTAL_NAME: { en: "Nai Pepea" },
  ORG_NAMES: { en: "Office of the County Chief Officer · Public Participation, Citizen Engagement and Customer Service" },
  FOOTER_ORG: { en: "Nairobi City County Government" },
  TAGLINE: { en: "You report it. The County acts on it." },
  // The county's own slogan, as carried on its crest.
  MOTTO_VALUES: { en: "Let's Make Nairobi Work" },
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

  // Hero -----------------------------------------------------------------—--
  HERO_EYEBROW: { en: "Nairobi City County Government · Kenya" },
  HERO_TITLE: { en: "Nai Pepea" },
  HERO_PILOT_NOTICE: {
    en:
      "Pilot phase: complaints are handled for Makadara and Kibra Sub-Counties. Other parts of Nairobi will follow as the service scales up to all 85 wards.",
  },
  HERO_LEDE: {
    en:
      "Nai Pepea means fresh air. Report a problem with a county service, get a case number within seconds, and follow it until it is resolved. Every case is assigned to an officer in the responsible department and escalated automatically if it misses its deadline.",
  },
  HERO_CTA_SUBMIT: { en: "Report an Issue" },
  HERO_CTA_TRACK: { en: "Track a Complaint" },
  HERO_TRUST_CONFIDENTIAL: { en: "No National ID needed, just your name and mobile number" },
  HERO_TRUST_CASE_NUMBER: { en: "Unique case number" },
  HERO_TRUST_NOTIFICATIONS: { en: "SMS acknowledgement with your case number" },
  HERO_CHANNELS_LABEL: { en: "Also available through:" },
  HERO_PHOTO_CAPTION: { en: "Uhuru Park and the city centre, Nairobi" },
  // Hand-lettered tagline over the hero photo and on the phone photo card.
  HERO_SCRIPT: { en: "A Cleaner, Greener Nairobi" },
  // Speech bubble on the circular photos beside the steps and channels.
  ORB_TAGLINE: { en: "Your Voice Matters" },
  // Headline figures under the hero — every one from the BRD (§1, §3, §5.2, §6).
  STAT_SUBCOUNTIES_VALUE: { en: "2" },
  STAT_SUBCOUNTIES_LABEL: { en: "pilot sub-counties" },
  STAT_WARDS_VALUE: { en: "9" },
  STAT_WARDS_LABEL: { en: "wards in the pilot" },
  STAT_SLA_VALUE: { en: "72 h" },
  STAT_SLA_LABEL: { en: "to resolve, then automatic escalation" },
  STAT_DEPARTMENTS_VALUE: { en: "17" },
  STAT_DEPARTMENTS_LABEL: { en: "departments in the complaint catalogue" },
  HERO_CHANNEL_APP: { en: "Counter desks at ward and sub-county offices" },
  HERO_CHANNEL_WA: { en: "SMS case updates" },
  HERO_CHANNEL_LINE: { en: "County help line" },

  // Service areas ("types" section) -------------------------------------—--
  TYPES_EYEBROW: { en: "Service areas" },
  TYPES_TITLE: { en: "What You Can Report" },
  TYPES_INTRO: {
    en:
      "Pick the department your complaint is about, then choose a complaint type, a sub-type and your ward. That is what routes the case to the right officer and starts its deadline.",
  },
  TYPE_URBAN_TITLE: { en: "Urban Development & Planning" },
  TYPE_URBAN_DESC: {
    en:
      "Illegal construction, planning permit delays, and other development-control issues in your ward. Illegal construction cases carry a 72-hour deadline; permit delays 48 hours.",
  },
  TYPE_ENVIRONMENT_TITLE: { en: "Environment / Green Nairobi" },
  TYPE_ENVIRONMENT_DESC: {
    en:
      "Illegal dumping, water contamination and other environmental hazards. Water contamination is a 24-hour case; illegal dumping 48 hours.",
  },
  TYPE_FINANCE_TITLE: { en: "Finance & Economic Planning" },
  TYPE_FINANCE_DESC: {
    en:
      "Incorrect billing, payments not reflected, land rates disputes and clearances, illegal clamping and parking ticket disputes. Illegal clamping is a 4-hour case.",
  },
  TYPE_BOROUGHS_TITLE: { en: "Boroughs & Sub-County Administration" },
  TYPE_BOROUGHS_DESC: {
    en:
      "Market stall disputes, illegal hawking and other matters handled by your Sub-County Administrator and the Borough Managers.",
  },
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
      "Customer Service assigns every case to the Department Representative or the Director of the department concerned. Whoever receives it is directly responsible for resolving it.",
  },
  HOW_NOTE_RECORD: {
    en:
      "If the 72-hour deadline passes without a resolution, the case moves up on its own: Director → Chief Officer (24 more hours) → County Executive Committee Member (CECM), the final tier.",
  },
  HOW_NOTE_CHANNELS: {
    en:
      "You are notified by SMS when your case is registered, assigned, escalated, resolved and closed. The same deadline applies to every complaint, whichever channel you used.",
  },

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
  // Phase 1 channel for Nai Pepea).
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
      "Nai Pepea is operated by the Nairobi City County Government through the Office of the County Chief Officer for Public Participation, Citizen Engagement and Customer Service. We are committed to protecting your privacy and to handling your personal information securely, transparently and in line with the Data Protection Act, 2019.",
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
  INST_INTRO: { en: "Nai Pepea starts in two sub-counties. Every ward listed here has counter staff and an assigned department contact." },
  INST_MAKADARA_TITLE: { en: "Makadara Sub-County" },
  INST_MAKADARA_DESC: { en: "Wards: Harambee · Maringo/Hamza · Makongeni · Viwandani" },
  INST_KIBRA_TITLE: { en: "Kibra Sub-County" },
  INST_KIBRA_DESC: { en: "Wards: Sarang'ombe · Makina · Laini Saba · Silanga · Mashimoni" },

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
    en: "Nai Pepea · Nairobi City County Government. All rights reserved.",
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
// Taken from the county's public website (nairobi.go.ke header and footer,
// 2026-09-22). Deliberately NOT i18n copy: a phone number, an email address
// and a postal address read identically in every language.
//
// `hotline` is the single source of truth for the number — routes.ts builds
// GREEN_LINE/PHONE from it, so editing it here also updates every help-line
// CTA (utility bar, channels section, footer). Keep it digits-only; use
// `hotlineDisplay` for anything shown on screen. The BRD's dedicated Nai
// Pepea call-centre number is not yet assigned; until it is, the county's
// published help line is used.
export const CONTACT = {
  hotline: "+254725624489",
  hotlineDisplay: "+254 725 624 489 · 020 222 4281",
  email: "info@nairobi.go.ke",
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
  route: keyof LandingRoutes;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "NAV_HOME", route: "HOME" },
  { labelKey: "NAV_SUBMIT", route: "REGISTER_COMPLAINT" },
  { labelKey: "NAV_TRACK", route: "TRACK_COMPLAINT" }
];

export interface ManifestationType {
  id: string;
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
  /** CSS var (HSL triple) driving the card's accent tint. */
  accentVar: string;
  route: keyof LandingRoutes;
}

// The four pilot departments with confirmed escalation contacts (BRD §3, §6.2).
// `id` is the department code from ansible/nairobi-mdms (resolve.ts inherits
// icon/accent from the matching default item by code).
export const MANIFESTATION_TYPES: ManifestationType[] = [
  { id: "DEPT_06", icon: Building2, titleKey: "TYPE_URBAN_TITLE", descKey: "TYPE_URBAN_DESC", accentVar: "--pgrl-type-complaint", route: "REGISTER_COMPLAINT" },
  { id: "DEPT_07", icon: Leaf, titleKey: "TYPE_ENVIRONMENT_TITLE", descKey: "TYPE_ENVIRONMENT_DESC", accentVar: "--pgrl-type-petition", route: "REGISTER_COMPLAINT" },
  { id: "DEPT_03", icon: Coins, titleKey: "TYPE_FINANCE_TITLE", descKey: "TYPE_FINANCE_DESC", accentVar: "--pgrl-type-grievance", route: "REGISTER_COMPLAINT" },
  { id: "DEPT_10", icon: Landmark, titleKey: "TYPE_BOROUGHS_TITLE", descKey: "TYPE_BOROUGHS_DESC", accentVar: "--pgrl-type-report", route: "REGISTER_COMPLAINT" },
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

export interface InstitutionItem {
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
}

// County > Sub-County > Ward — the pilot geography from BRD §6.1.
export const INSTITUTIONS: InstitutionItem[] = [
  { icon: Landmark, titleKey: "INST_MAKADARA_TITLE", descKey: "INST_MAKADARA_DESC" },
  { icon: Landmark, titleKey: "INST_KIBRA_TITLE", descKey: "INST_KIBRA_DESC" },
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
    title: "Nai Pepea opens in Makadara and Kibra",
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
