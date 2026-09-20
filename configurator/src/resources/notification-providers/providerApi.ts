// Client for the novu-bridge provider-management endpoints (Novu-native).
//
// These four endpoints live under Kong's keyless SPA route
// `/novu-bridge/novu-adapter/v1/providers*` and are same-origin behind
// nginx/Kong — exactly like the read-only integrations list the
// NotificationProviderList already renders (see dataProvider.ts
// customFetchList). We reuse that pattern: origin-relative fetch + the same
// DIGIT bearer token pulled from the shared digitClient's auth info. No new
// auth plumbing, and — importantly — credentials are only ever sent on an
// explicit submit and are never persisted anywhere on the client.
import { digitClient } from '@/providers/bridge';

const BASE = '/novu-bridge/novu-adapter/v1/providers';

export type Channel = 'SMS' | 'EMAIL' | 'WHATSAPP';

/** Novu integration projection returned by the bridge (never carries secrets). */
export interface Integration {
  _id?: string;
  channel?: string;
  providerId?: string;
  name?: string;
  identifier?: string;
  active?: boolean;
  primary?: boolean;
}

export interface CreateProviderInput {
  channel: Channel;
  providerId: string;
  name: string;
  identifier?: string;
  credentials: Record<string, unknown>;
}

export interface TemplatesResponse {
  data: { workflowId: string; name: string; channels?: string[] }[];
  total: number;
}

export interface VerifyResponse {
  ok: boolean;
  active: boolean;
  detail?: string;
}

export interface TestSendPayload {
  channel: Channel;
  to: { phone?: string; email?: string };
  workflowId?: string;
  body?: string;
  subject?: string;
  contentSid?: string;
  variables?: string[];
}

export interface TestSendResponse {
  ok: boolean;
  novuStatus?: string;
  transactionId?: string;
}

/** One reconciled Twilio Content template that maps onto a PGR routing tuple.
 *  These rows are ready to persist verbatim as MDMS
 *  RAINMAKER-PGR.NotificationProviderTemplate `data` (the bridge already dropped
 *  the transport-only extras). The MDMS uniqueIdentifier is the x-unique join
 *  `<provider>.<channel>.<audience>.<action>.<toState>.<locale>`. */
export interface TwilioMatchedTemplate {
  provider: string;
  channel: string;
  audience: string;
  action: string;
  toState: string;
  locale: string;
  templateId: string;
  templateName?: string;
  variables: string[];
  approvalStatus?: string;
  active?: boolean;
}

/** A Twilio Content template the bridge could NOT map to a PGR routing tuple —
 *  diagnostics only (never persisted). */
export interface TwilioUnmatchedTemplate {
  templateId: string;
  templateName?: string;
  approvalStatus?: string;
  skipReason?: string;
}

export interface TwilioTemplatesResponse {
  matched: TwilioMatchedTemplate[];
  unmatched: TwilioUnmatchedTemplate[];
  total: number;
}

/** Same-origin base — the novu-bridge route is served behind Kong/nginx on the
 *  page's own origin. Falls back to a relative URL in non-browser contexts. */
function origin(): string {
  return typeof window !== 'undefined' && window.location ? window.location.origin : '';
}

async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = digitClient.getAuthInfo().token;
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${origin()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* non-JSON body — leave data empty and fall through to status handling */
  }

  if (!response.ok) {
    const errors = data.Errors as { message?: string; code?: string }[] | undefined;
    const msg =
      errors?.map((e) => e.message || e.code).join(', ') ||
      (data.message as string) ||
      (data.detail as string) ||
      (data.error as string) ||
      `Request failed (${response.status})`;
    throw new Error(msg);
  }
  return data as T;
}

/** POST /providers — create a Novu integration. Credentials go straight through
 *  to Novu over TLS; the response never echoes them back. */
export function createProvider(input: CreateProviderInput): Promise<Integration> {
  return call<Integration>(BASE, 'POST', input);
}

/** GET /providers/templates — read-only discovery of Novu delivery workflows.
 *  `channel` filters server-side by the workflow's Novu step types; these are
 *  Novu workflows, NOT provider templates (Twilio has no SMS template registry —
 *  SMS/EMAIL text lives in MDMS NotificationTemplate, approved WhatsApp
 *  ContentSids in NotificationProviderTemplate). */
export function pullTemplates(channel: string, providerId: string): Promise<TemplatesResponse> {
  const qs = new URLSearchParams();
  if (channel) qs.set('channel', channel);
  if (providerId) qs.set('providerId', providerId);
  const q = qs.toString();
  return call<TemplatesResponse>(`${BASE}/templates${q ? `?${q}` : ''}`, 'GET');
}

/** POST /providers/verify — connectivity/active check for one integration. */
export function verifyProvider(integrationId: string): Promise<VerifyResponse> {
  return call<VerifyResponse>(`${BASE}/verify`, 'POST', { integrationId });
}

/** GET /providers/twilio-templates — pull the operator's OWN approved Twilio
 *  WhatsApp Content templates, already reconciled server-side against the PGR
 *  routing tuples. `matched[]` rows are persist-ready MDMS
 *  NotificationProviderTemplate `data`; `unmatched[]` is diagnostics-only.
 *  Twilio secrets stay server-side — this endpoint only returns the SID mapping.
 *  Surfaces bridge errors (e.g. NB_NO_TWILIO_INTEGRATION) through call()'s
 *  Errors/message extraction so the caller can prompt the operator to add the
 *  Twilio provider first. Mirrors the CLI persist-provider-templates.py pull. */
export function syncTwilioTemplates(): Promise<TwilioTemplatesResponse> {
  return call<TwilioTemplatesResponse>(`${BASE}/twilio-templates`, 'GET');
}

/** POST /providers/test-send — dispatch one live test message via Novu. */
export function testSend(payload: TestSendPayload): Promise<TestSendResponse> {
  return call<TestSendResponse>(`${BASE}/test-send`, 'POST', payload);
}

// ---------------------------------------------------------------------------
// Per-channel provider + credential-field metadata (drives the Add dialog).
// ---------------------------------------------------------------------------

export interface CredField {
  key: string;
  /** i18n key for the label. */
  labelKey: string;
  /** English fallback for the label. */
  labelDefault: string;
  type: 'text' | 'password' | 'checkbox';
  placeholder?: string;
  required?: boolean;
}

export const CHANNELS: Channel[] = ['SMS', 'EMAIL', 'WHATSAPP'];

/** Default providerId per channel (SMS/WhatsApp → twilio, Email → nodemailer). */
export const DEFAULT_PROVIDER: Record<Channel, string> = {
  SMS: 'twilio',
  WHATSAPP: 'twilio',
  EMAIL: 'nodemailer',
};

/** Credential fields the operator must fill for a given channel + providerId. */
export function credFields(channel: Channel, providerId: string): CredField[] {
  if (providerId === 'nodemailer' || channel === 'EMAIL') {
    return [
      { key: 'host', labelKey: 'app.providers.cred.host', labelDefault: 'SMTP Host', type: 'text', placeholder: 'smtp.example.com', required: true },
      // Novu validates nodemailer `port` as a STRING — keep this a text input so it
      // serializes as "587" not 587 (a numeric port → 422 from Novu).
      { key: 'port', labelKey: 'app.providers.cred.port', labelDefault: 'SMTP Port', type: 'text', placeholder: '587', required: true },
      { key: 'user', labelKey: 'app.providers.cred.user', labelDefault: 'SMTP User', type: 'text', placeholder: 'apikey / username', required: true },
      { key: 'password', labelKey: 'app.providers.cred.password', labelDefault: 'SMTP Password', type: 'password', required: true },
      { key: 'from', labelKey: 'app.providers.cred.from', labelDefault: 'From', type: 'text', placeholder: 'noreply@example.com', required: true },
      { key: 'secure', labelKey: 'app.providers.cred.secure', labelDefault: 'Use TLS (secure)', type: 'checkbox' },
    ];
  }
  // Novu's built-in generic-sms provider — the shell behind any plain-HTTP SMS
  // gateway novu-bridge knows how to shape a body for (Ozeki, Bongatech, Jasmin —
  // see SmsProviderOverridesFactory). The operator types `generic-sms` as the
  // Provider ID. Field keys are Novu's own credential keys for this provider.
  // For Jasmin's REST API: baseUrl http://jasmin-host:8080/secure/send,
  // apiKeyRequestHeader `Authorization`, apiKey `Basic <base64 user:pass>`,
  // idPath `data`. Then set NOVU_BRIDGE_SMS_PROVIDER / _OTP_SMS_PROVIDER=jasmin
  // and NOVU_BRIDGE_SMS_INTEGRATION_IDENTIFIER to this integration's identifier.
  if (providerId === 'generic-sms') {
    return [
      { key: 'baseUrl', labelKey: 'app.providers.cred.base_url', labelDefault: 'Send endpoint URL', type: 'text', placeholder: 'http://jasmin-host:8080/secure/send', required: true },
      { key: 'apiKeyRequestHeader', labelKey: 'app.providers.cred.api_key_header', labelDefault: 'Auth header name', type: 'text', placeholder: 'Authorization', required: true },
      { key: 'apiKey', labelKey: 'app.providers.cred.api_key', labelDefault: 'Auth header value', type: 'password', placeholder: 'Basic <base64 username:password>', required: true },
      { key: 'secretKeyRequestHeader', labelKey: 'app.providers.cred.secret_key_header', labelDefault: 'Second header name (optional)', type: 'text' },
      { key: 'secretKey', labelKey: 'app.providers.cred.secret_key', labelDefault: 'Second header value (optional)', type: 'password' },
      { key: 'from', labelKey: 'app.providers.cred.from', labelDefault: 'From', type: 'text', placeholder: 'sender id / source address' },
      { key: 'idPath', labelKey: 'app.providers.cred.id_path', labelDefault: 'Message-id JSON path in reply', type: 'text', placeholder: 'data', required: true },
      { key: 'datePath', labelKey: 'app.providers.cred.date_path', labelDefault: 'Date JSON path in reply (optional)', type: 'text' },
    ];
  }
  // Twilio (SMS + WhatsApp share the same integration).
  const fromPlaceholder = channel === 'WHATSAPP' ? 'whatsapp:+15551234567' : '+15551234567';
  return [
    { key: 'accountSid', labelKey: 'app.providers.cred.account_sid', labelDefault: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxx', required: true },
    { key: 'token', labelKey: 'app.providers.cred.token', labelDefault: 'Auth Token', type: 'password', required: true },
    { key: 'from', labelKey: 'app.providers.cred.from', labelDefault: 'From', type: 'text', placeholder: fromPlaceholder, required: true },
  ];
}

/** Coarse channel for a row served by the integrations projection. WhatsApp is
 *  stored as a Twilio `sms` integration (Novu has no whatsapp channel here), so
 *  the create path marks WhatsApp integrations in the identifier/name — the only
 *  round-trippable fields (credentials are never echoed back). Derive WHATSAPP
 *  from that marker so the row keeps its designation across refetches; the Test
 *  dialog still lets the operator pick SMS vs WhatsApp explicitly. */
export function rowChannel(record: {
  channel?: unknown;
  identifier?: unknown;
  name?: unknown;
}): Channel {
  if (String(record.channel ?? '').toUpperCase() === 'EMAIL') return 'EMAIL';
  const marker = `${record.identifier ?? ''} ${record.name ?? ''}`;
  return /(^|[\s\-_])whatsapp/i.test(marker) ? 'WHATSAPP' : 'SMS';
}
