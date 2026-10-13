// Content model + built-in copy deck for the PGR public landing page.
//
// Every user-visible string resolves in three steps (see useLandingCopy.ts):
//   1. MDMS/i18next translation for key `PGR_LANDING_<KEY>` — wins when seeded.
//   2. Built-in copy below (`en`; other locales come from seeded MDMS keys).
//   3. The raw key (never expected to surface).
//
// ── Deployment: County Government of Bomet, Kenya ("Bomet Feedback Hub") ──
// Every factual claim below is taken from the county's own onboarding workbook
// ("Bomet Feedback Hub: Project Plan & Tracker", tabs: Boundary Hierarchy,
// Complaint Workflow, Departments, Complaint Types - Administration /
// Health / Water & Sanitation, Employee Details, Assumptions):
//   • Pilot departments  — Health, Water & Sanitation (Assumptions 8.1).
//     Administration complaint types are configured too, so it is listed third.
//   • Boundary hierarchy — County > Sub-County > Ward: 5 sub-counties, 25 wards.
//   • Routing            — citizen picks type, sub-type, sub-county and ward;
//     Health + Administration route to the Sub-County Administrator, Water &
//     Sanitation to the Department Director.
//   • Escalation         — on SLA breach: Sub-County Administrator → Department
//     Director → Chief Officer → CECM.
//   • SLAs               — per sub-type, 1 day (unsafe water) to 30 days
//     (corruption, procurement, HR discipline).
//   • Intake             — portal (name + phone, no National ID), call-centre
//     agents logging calls manually, counter staff per pilot ward; SMS
//     acknowledgement via the county gateway.
// Do NOT add a claim here that the workbook does not support — this is the
// public-facing promise of the service.
//
// News defaults are placeholders; production deployments pass real items via
// the `news` prop on <PGRLandingPage />.

import type * as React from "react";
import {
  Stethoscope,
  Droplets,
  Scale,
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
  ShieldAlert,
  Siren,
} from "lucide-react";
import type { LandingRoutes } from "./routes";

// Loose icon type: lucide-react@1.x has no LucideIcon export.
export type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const LANDING_COPY = {
  // Chrome ------------------------------------------------------------------
  GOV_NAME: { en: "County Government of Bomet" },
  PORTAL_NAME: { en: "Bomet Feedback Hub" },
  // Two-line wordmark in the header/footer lockup (replaces the one-line PORTAL_NAME there).
  WORDMARK_LINE1: { en: "Bomet" },
  WORDMARK_LINE2: { en: "County Government" },
  ORG_NAMES: { en: "Office of the Ombudsman · Health · Water & Sanitation" },
  FOOTER_ORG: { en: "County Government of Bomet" },
  TAGLINE: { en: "You report it. The County acts on it." },
  // The county's own motto, as carried on the crest.
  MOTTO_VALUES: { en: "The Greatest Good For The Greatest Number" },
  SKIP_LINK: { en: "Skip to main content" },
  UTILITY_PHONE_LABEL: { en: "County Government of Bomet" },
  UTILITY_GREEN_LINE: { en: "County Call Centre" },
  // No operating-hours note: the county has not published call-centre hours.
  UTILITY_GREEN_LINE_FREE: { en: "" },
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
  HERO_EYEBROW: { en: "County Government of Bomet · Kenya" },
  HERO_TITLE: { en: "Bomet Feedback Hub" },
  HERO_PILOT_NOTICE: {
    en:
      "Pilot phase: complaints are handled for Health and Water & Sanitation in all five sub-counties, Sotik, Chepalungu, Bomet East, Bomet Central and Konoin.",
  },
  HERO_LEDE: {
    en:
      "Report a problem with a county service, get a case number, and follow it until it is resolved. Every case is routed to the officer responsible for your ward, and escalated automatically if it misses its deadline.",
  },
  HERO_CTA_SUBMIT: { en: "Report an Issue" },
  HERO_CTA_TRACK: { en: "Track a Complaint" },
  HERO_TRUST_CONFIDENTIAL: { en: "No National ID needed, just your name and phone number" },
  HERO_TRUST_CASE_NUMBER: { en: "Unique case number" },
  HERO_TRUST_NOTIFICATIONS: { en: "SMS acknowledgement with your case number" },
  HERO_CHANNELS_LABEL: { en: "Also available through:" },
  HERO_CHANNEL_APP: { en: "Counter desks in the pilot wards" },
  HERO_CHANNEL_WA: { en: "SMS case updates" },
  HERO_CHANNEL_LINE: { en: "County call centre" },

  // Service areas ("types" section) -------------------------------------—--
  TYPES_TITLE: { en: "What You Can Report" },
  TYPES_INTRO: {
    en:
      "Pick the service your complaint is about. You then choose a category, a sub-category and your ward. That is what routes the case to the right officer and sets its deadline.",
  },
  TYPE_HEALTH_TITLE: { en: "Health Services" },
  TYPE_HEALTH_DESC: {
    en:
      "Maternal and newborn emergencies, ambulance delays, drug stock-outs, oxygen and equipment failures, staff absence or conduct, long waiting times, facility sanitation, referral delays, SHA service denial, illegal charges. Emergency categories carry deadlines of one to five days.",
  },
  TYPE_WATER_TITLE: { en: "Water & Sanitation" },
  TYPE_WATER_DESC: {
    en:
      "Contaminated or unsafe water, pipe leaks and low pressure, sewer and manhole overflows, water outages, billing and meter disputes, broken kiosks and boreholes, blocked drains and flooding. Unsafe water is a one-day case.",
  },
  TYPE_ADMIN_TITLE: { en: "Administration & Governance" },
  TYPE_ADMIN_DESC: {
    en:
      "Staff misconduct, corruption and bribery, abuse of office, procurement and tender irregularities, exclusion from public participation, stalled or poor-quality projects, unanswered information requests, public nuisance.",
  },
  TYPE_CTA: { en: "Report an issue" },

  // How it works -----------------------------------------------------------
  HOW_TITLE: { en: "How It Works" },
  HOW_STEP_LABEL: { en: "Step" },
  HOW_STEP_1: { en: "Report through the portal, the call centre or a counter desk" },
  HOW_STEP_2: { en: "Receive your case number by SMS" },
  HOW_STEP_3: { en: "The Ombudsman's Office routes it to your sub-county" },
  HOW_STEP_4: { en: "The responsible officer works the case" },
  HOW_STEP_5: { en: "A missed deadline escalates the case automatically" },
  HOW_STEP_6: { en: "You confirm the outcome and rate the service" },
  HOW_NOTE_TITLE: { en: "Who handles your case, and what happens if it stalls" },
  HOW_NOTE_NOTIFY: {
    en:
      "Health and Administration cases go to the Sub-County Administrator for your area. Water & Sanitation cases go to the Department Director for the whole county.",
  },
  HOW_NOTE_RECORD: {
    en:
      "If the deadline passes without a resolution, the case moves up on its own: Sub-County Administrator → Department Director → Chief Officer → County Executive Committee Member (CECM).",
  },
  HOW_NOTE_CHANNELS: {
    en:
      "Deadlines are set per category: one day for unsafe water, two days for a sewer overflow, seven days for a water outage or absent staff, and up to 30 days for corruption and procurement cases.",
  },

  // Channels -----------------------------------------------------------—---
  CHANNELS_TITLE: { en: "Ways to Reach Us" },
  CHANNELS_INTRO: {
    en:
      "Every channel creates the same case in the same system, with the same case number and the same deadline. Choose whichever is easiest for you.",
  },
  CHANNEL_WEB_TITLE: { en: "This Portal" },
  CHANNEL_WEB_DESC: {
    en:
      "Register with your name and phone number, no National ID required. Submit, attach photos, and see the full history of your case.",
  },
  CHANNEL_WEB_CTA: { en: "Report an issue" },
  CHANNEL_WEB_BADGE: { en: "You are here" },
  CHANNEL_LINE_TITLE: { en: "County Call Centre" },
  CHANNEL_LINE_DESC: {
    en:
      "Agents log your complaint while you are on the call and read your case number back to you.",
  },
  CHANNEL_LINE_CTA: { en: "Call the centre" },
  CHANNEL_INPERSON_TITLE: { en: "Counter Desks" },
  CHANNEL_INPERSON_DESC: {
    en:
      "County counter staff in the pilot wards log walk-in complaints for you and hand over a written case reference before you leave.",
  },
  CHANNEL_SMS_TITLE: { en: "SMS Updates" },
  CHANNEL_SMS_DESC: {
    en:
      "When your complaint is registered you get an SMS with your case number, then further SMS as its status changes. No smartphone or data needed.",
  },
  // Retained key: referenced directly by WhatsAppFab, which renders nothing
  // while the WHATSAPP route is "#" (WhatsApp is not a Bomet pilot channel).
  CHANNEL_WA_CTA: { en: "Chat on WhatsApp" },

  // Privacy ------------------------------------------------------------—---
  PRIVACY_TITLE: { en: "Your Privacy and Your Data" },
  PRIVACY_P1: {
    en:
      "The County Government of Bomet protects the personal information you submit in line with the Data Protection Act, 2019.",
  },
  // No identity-shielding exists in the product (no create-flow field, no
  // backend flag), so this states only what the service actually does.
  PRIVACY_P2: {
    en:
      "Your details are used to register, route and resolve your complaint and to send you SMS updates. They are seen by the authorised county officers handling your case and are not shared with unauthorised third parties. If you tick \"Keep my details confidential\" when you report, your name and phone number are hidden from the officers working the case; only staff cleared to view confidential complaints can see them.",
  },
  PRIVACY_LINK: { en: "Read the Privacy Notice" },

  // Privacy policy (full page) ---------------------------------------------
  PRIVACY_PAGE_TITLE: { en: "Privacy Notice" },
  PRIVACY_PAGE_P1: {
    en:
      "The Bomet Feedback Hub is operated by the County Government of Bomet. We are committed to protecting your privacy and to handling your personal information securely, transparently and in line with the Data Protection Act, 2019.",
  },
  PRIVACY_PAGE_P2: {
    en:
      "When you report an issue you consent to the collection and processing of the information you provide so that your complaint can be registered, routed, investigated and resolved. This includes your name, phone number, the ward and location of the issue, the complaint category, your description of the problem, and any photographs or documents you choose to attach. Registration does not require a National ID.",
  },
  PRIVACY_PAGE_P3: {
    en:
      "Your information is accessed only by authorised county officers responsible for handling your complaint, the Office of the Ombudsman, the sub-county administrators, and the department officers in the escalation chain. It is not shared with unauthorised third parties and is never used for commercial or marketing purposes. A complaint you mark as confidential hides your name and phone number from the officers working it; only staff cleared to view confidential complaints can see them.",
  },
  PRIVACY_PAGE_P4: {
    en:
      "Your phone number is used to send case notifications by SMS. Technical information such as device data, IP address and system usage may also be collected to keep the service secure and working properly. We apply appropriate technical and organisational safeguards against unauthorised access, alteration, disclosure or loss.",
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
  INST_TITLE: { en: "Areas We Cover" },
  INST_SOTIK_TITLE: { en: "Sotik Sub-County" },
  INST_SOTIK_DESC: { en: "Wards: Ndanai/Abosi · Chemagel · Kipsonoi · Rongena/Manaret · Kapletundo" },
  INST_CHEPALUNGU_TITLE: { en: "Chepalungu Sub-County" },
  INST_CHEPALUNGU_DESC: { en: "Wards: Kong'asis · Nyangores · Sigor · Chebunyo · Siongiroi" },
  INST_BOMET_EAST_TITLE: { en: "Bomet East Sub-County" },
  INST_BOMET_EAST_DESC: { en: "Wards: Merigi · Kembu · Longisa · Kipreres · Chemaner" },
  INST_BOMET_CENTRAL_TITLE: { en: "Bomet Central Sub-County" },
  INST_BOMET_CENTRAL_DESC: { en: "Wards: Silibwet Township · Nadaraweta · Singorwet · Chesoen · Mutarakwa" },
  INST_KONOIN_TITLE: { en: "Konoin Sub-County" },
  INST_KONOIN_DESC: { en: "Wards: Chepchabas · Kimulot · Mogogosiek · Boito · Embomos" },

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
  FOOTER_GREEN_LINE: { en: "County Call Centre" },
  FOOTER_FAQ: { en: "Frequently Asked Questions" },
  FOOTER_CITIZEN_LOGIN: { en: "Citizen Sign in" },
  FOOTER_EMPLOYEE_LOGIN: { en: "County Staff Access" },
  FOOTER_PRIVACY: { en: "Privacy Notice" },
  FOOTER_TERMS: { en: "Terms of Use" },
  FOOTER_ACCESSIBILITY: { en: "Accessibility" },
  FOOTER_CONTACT: { en: "Contact the County" },
  CONTACT_HOTLINE: { en: "Hotline" },
  CONTACT_EMAIL: { en: "Email" },
  CONTACT_POST: { en: "Postal Address" },
  FOOTER_FOLLOW: { en: "Follow the County" },
  SOCIAL_FACEBOOK: { en: "Facebook" },
  SOCIAL_X: { en: "X (formerly Twitter)" },
  SOCIAL_YOUTUBE: { en: "YouTube" },
  FOOTER_COPYRIGHT: {
    en: "Bomet Feedback Hub · County Government of Bomet. All rights reserved.",
  },

  // Misc ---------------------------------------------------------------—---
  FAB_LABEL: { en: "Chat with us" },
  PLACEHOLDER_PENDING: { en: "Page being configured" },
  EXTERNAL_LINK_NOTE: { en: "opens in a new window" },

  // --- keys introduced by the enhanced landing (photo hero, stats, helplines, section eyebrows) ---
  HERO_PHOTO_CAPTION: { en: "Bomet County highlands" },
  HERO_SCRIPT: { en: "The Greatest Good For The Greatest Number" },
  ORB_TAGLINE: { en: "Your Voice Matters" },
  STAT_SUBCOUNTIES_VALUE: { en: "5" },
  STAT_SUBCOUNTIES_LABEL: { en: "sub-counties, county-wide" },
  STAT_WARDS_VALUE: { en: "25" },
  STAT_WARDS_LABEL: { en: "wards covered" },
  STAT_SLA_VALUE: { en: "1–30 days" },
  STAT_SLA_LABEL: { en: "deadline per category, then automatic escalation" },
  STAT_DEPARTMENTS_VALUE: { en: "3" },
  STAT_DEPARTMENTS_LABEL: { en: "service areas you can report on" },
  TYPES_EYEBROW: { en: "Service areas" },
  HOW_EYEBROW: { en: "From report to resolution" },
  CHANNELS_EYEBROW: { en: "Channels" },
  CAROUSEL_PREV: { en: "Previous channels" },
  CAROUSEL_NEXT: { en: "Next channels" },
  CHANNEL_INPERSON_CTA: { en: "Find a desk" },
  CHANNEL_SMS_CTA: { en: "Track your case" },
  HELPLINES_EYEBROW: { en: "Emergency" },
  HELPLINES_TITLE: { en: "Emergency and Help Lines" },
  HELPLINES_INTRO: {
    en:
      "In an emergency call the national lines first. For a county service, the County Call Centre logs the complaint for you and reads your case number back.",
  },
  HELPLINE_POLICE_TITLE: { en: "Police" },
  HELPLINE_POLICE_DESC: { en: "Crime, accidents and threats to safety" },
  HELPLINE_AMBULANCE_TITLE: { en: "Ambulance" },
  HELPLINE_AMBULANCE_DESC: { en: "Medical emergencies" },
  HELPLINE_COUNTY_TITLE: { en: "County Call Centre" },
  HELPLINE_COUNTY_DESC: { en: "County services — call agents log your complaint for you" },
  HELPLINES_CALL: { en: "Call" },
  PRIVACY_EYEBROW: { en: "Privacy & data" },
  INST_EYEBROW: { en: "Where we work" },
  INST_INTRO: {
    en:
      "The Feedback Hub runs in all five sub-counties of Bomet, 25 wards in all. Health and Administration cases go to your Sub-County Administrator; Water & Sanitation cases go to the Department Director for the whole county.",
  },
} as const;

export type LandingCopyKey = keyof typeof LANDING_COPY;

// ---------------------------------------------------------------------------
// Structured section data
// ---------------------------------------------------------------------------

// County contact details ----------------------------------------------------
//
// Taken from the county's public website (bomet.go.ke header and footer).
// Deliberately NOT i18n copy: a phone number, an email address
// and a postal address read identically in every language.
//
// `hotline` is the single source of truth for the number — routes.ts builds
// GREEN_LINE/PHONE from it, so editing it here also updates every help-line
// CTA (utility bar, channels section, footer). Keep it in tel: form. Where
// the numbers are shown on screen, use `hotlines` (one tel: link each); Bomet
// publishes a single call-centre line.
export const CONTACT = {
  hotline: "+254746036036",
  hotlineDisplay: "0746 036 036",
  hotlines: [{ tel: "+254746036036", display: "0746 036 036" }],
  email: "info@bomet.go.ke",
  poBox: "P.O. Box 19-20400, Bomet, Kenya",
} as const;

export interface SocialLink {
  /** Also selects the brand mark drawn in LandingFooter. */
  id: "facebook" | "x" | "youtube";
  labelKey: LandingCopyKey;
  href: string;
}

// Official County Government of Bomet accounts, as linked from bomet.go.ke.
export const SOCIAL_LINKS: SocialLink[] = [
  { id: "facebook", labelKey: "SOCIAL_FACEBOOK", href: "https://www.facebook.com/036Bomet" },
  { id: "x", labelKey: "SOCIAL_X", href: "https://x.com/036Bometcounty" },
  { id: "youtube", labelKey: "SOCIAL_YOUTUBE", href: "https://www.youtube.com/@GPSBometCounty" },
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

// The service areas a citizen can report on. `id` is the complaint-type code
// (resolve.ts inherits icon/accent from the matching default item by code).
export const MANIFESTATION_TYPES: ManifestationType[] = [
  { id: "HealthServices", icon: Stethoscope, titleKey: "TYPE_HEALTH_TITLE", descKey: "TYPE_HEALTH_DESC", accentVar: "--pgrl-type-complaint", route: "REGISTER_COMPLAINT" },
  { id: "WaterandSewage", icon: Droplets, titleKey: "TYPE_WATER_TITLE", descKey: "TYPE_WATER_DESC", accentVar: "--pgrl-type-petition", route: "REGISTER_COMPLAINT" },
  { id: "Administration", icon: Scale, titleKey: "TYPE_ADMIN_TITLE", descKey: "TYPE_ADMIN_DESC", accentVar: "--pgrl-type-grievance", route: "REGISTER_COMPLAINT" },
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
  numbers?: ReadonlyArray<{ tel: string; display: string }>;
}

// Emergency helplines shown on the landing page. Override any card via the
// MDMS LandingSection items (labelKey / descKey / navigationUrl "tel:…").
// Kenya's national emergency numbers, then the county line (CONTACT). No
// county fire brigade line is published for Bomet, so none is listed.
export const HELPLINES: HelplineItem[] = [
  { id: "police", icon: ShieldAlert, titleKey: "HELPLINE_POLICE_TITLE", descKey: "HELPLINE_POLICE_DESC", href: "tel:999", numberDisplay: "999" },
  { id: "ambulance", icon: Siren, titleKey: "HELPLINE_AMBULANCE_TITLE", descKey: "HELPLINE_AMBULANCE_DESC", href: "tel:112", numberDisplay: "112" },
  { id: "county", icon: Phone, titleKey: "HELPLINE_COUNTY_TITLE", descKey: "HELPLINE_COUNTY_DESC", href: `tel:${CONTACT.hotline}`, numberDisplay: CONTACT.hotlineDisplay },
];

export interface InstitutionItem {
  id?: string;
  icon: IconComponent;
  titleKey: LandingCopyKey;
  descKey: LandingCopyKey;
}

// County > Sub-County > Ward — the pilot geography from BRD §6.1.
export const INSTITUTIONS: InstitutionItem[] = [
  { id: "sotik", icon: Landmark, titleKey: "INST_SOTIK_TITLE", descKey: "INST_SOTIK_DESC" },
  { id: "chepalungu", icon: Landmark, titleKey: "INST_CHEPALUNGU_TITLE", descKey: "INST_CHEPALUNGU_DESC" },
  { id: "bomet-east", icon: Landmark, titleKey: "INST_BOMET_EAST_TITLE", descKey: "INST_BOMET_EAST_DESC" },
  { id: "bomet-central", icon: Landmark, titleKey: "INST_BOMET_CENTRAL_TITLE", descKey: "INST_BOMET_CENTRAL_DESC" },
  { id: "konoin", icon: Landmark, titleKey: "INST_KONOIN_TITLE", descKey: "INST_KONOIN_DESC" },
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
    id: "pilot-departments",
    dateLabel: "Pilot phase",
    dateTime: "2026-08-01",
    tag: "Programme",
    title: "Feedback Hub opens with Health and Water & Sanitation",
    excerpt:
      "The pilot covers two departments across all five sub-counties. Administration complaint categories are configured and follow the same routing and escalation rules.",
    source: "County Government of Bomet",
    href: "#",
  },
  {
    id: "call-centre",
    dateLabel: "Pilot phase",
    dateTime: "2026-08-01",
    tag: "Call Centre",
    title: "Call centre agents log complaints on your behalf",
    excerpt:
      "Agents capture your name, phone number, ward, category and description, then read your case number back to you before the call ends.",
    source: "County Government of Bomet",
    href: "#",
  },
  {
    id: "counter-desks",
    dateLabel: "Pilot phase",
    dateTime: "2026-08-01",
    tag: "Counter Desks",
    title: "Counter desks accept walk-in complaints in the pilot wards",
    excerpt:
      "Counter staff register your complaint in the same system and hand you a written case reference, so a visit in person is tracked exactly like an online report.",
    source: "County Government of Bomet",
    href: "#",
  },
];
