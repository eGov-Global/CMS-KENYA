/** First-save setup of the landing-page masters on a tenant that lacks them.
 *
 * Every Kenya tenant was onboarded before these masters existed, so it has
 * neither the two MDMS schemas nor the gateway actions that let MDMS_ADMIN
 * write rows to them. Without this the Builder loaded empty, previewed a blank
 * page and every save was refused (403 from Kong). `ensureLandingSetup` adds
 * whatever is missing and leaves the rest alone, so it is safe on every save.
 *
 * Schema definitions: COPY of utilities/default-data-handler/src/main/
 * resources/schema/rainmaker-pgr-landing.json (the deploy-time source of truth;
 * a vitest keeps the two in step). The configurator image is built from
 * configurator/ + ui-shared/ only, so it cannot import that file. The actions
 * mirror the ACCESSCONTROL-ACTIONS-TEST / ROLEACTIONS seed rows for the same
 * masters.
 */
import { digitClient } from '@/providers/bridge';

export interface LandingSchema {
  code: string;
  description: string;
  definition: Record<string, unknown>;
}

export const LANDING_SCHEMAS: LandingSchema[] = [
  {
    "code": "RAINMAKER-PGR.LandingSection",
    "description": "One row per public-landing section (config-driven landing, CCSD-2005). `type` picks the section component; not an enum, so new types need no schema recreation (schema _update is unsupported) — the runtime registry and the Configurator catalog enforce the list. `order` sorts, `enabled` toggles, `status` gates DRAFT vs PUBLISHED. Text travels as PGR_LANDING_* localization keys, media as a filestore id, items as the section's cards/links/steps.",
    "definition": {
      "type": "object",
      "title": "LandingSection",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "required": [
        "code",
        "type",
        "order",
        "enabled"
      ],
      "x-unique": [
        "code"
      ],
      "properties": {
        "code": {
          "type": "string"
        },
        "type": {
          "type": "string",
          "description": "Section component key. v1 catalog: hero | navigation | types | steps | channels | privacy | news | institutions | cta | footer. Not enum-constrained (schema _update is unsupported); enforced by the LandingRenderer registry + Configurator picker so new types are addable without recreating the schema."
        },
        "order": {
          "type": "number"
        },
        "enabled": {
          "type": "boolean"
        },
        "status": {
          "type": "string",
          "enum": [
            "DRAFT",
            "PUBLISHED"
          ]
        },
        "version": {
          "type": "number"
        },
        "roles": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "titleKey": {
          "type": "string"
        },
        "subtitleKey": {
          "type": "string"
        },
        "bodyKey": {
          "type": "string"
        },
        "media": {
          "type": "object",
          "properties": {
            "imageId": {
              "type": "string"
            },
            "altKey": {
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "code"
            ],
            "properties": {
              "code": {
                "type": "string"
              },
              "labelKey": {
                "type": "string"
              },
              "descKey": {
                "type": "string"
              },
              "iconId": {
                "type": "string"
              },
              "navigationUrl": {
                "type": "string"
              },
              "enabled": {
                "type": "boolean"
              },
              "order": {
                "type": "number"
              }
            },
            "additionalProperties": false
          }
        },
        "theme": {
          "type": "object",
          "properties": {
            "accent": {
              "type": "string"
            },
            "bg": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      },
      "x-ref-schema": [],
      "additionalProperties": false
    }
  },
  {
    "code": "RAINMAKER-PGR.LandingPageConfig",
    "description": "Singleton (code=default) page-level landing config: master enable, global section-order override, default locale, page theme tokens, SEO keys, WhatsApp FAB toggle, and the publish pointer (config-driven landing, CCSD-2005).",
    "definition": {
      "type": "object",
      "title": "LandingPageConfig",
      "$schema": "http://json-schema.org/draft-07/schema#",
      "required": [
        "code"
      ],
      "x-unique": [
        "code"
      ],
      "properties": {
        "code": {
          "type": "string"
        },
        "enabled": {
          "type": "boolean"
        },
        "defaultLocale": {
          "type": "string"
        },
        "showWhatsAppFab": {
          "type": "boolean"
        },
        "showUtilityBar": {
          "type": "boolean"
        },
        "sectionOrder": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "seo": {
          "type": "object",
          "properties": {
            "titleKey": {
              "type": "string"
            },
            "descriptionKey": {
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        "theme": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        },
        "publish": {
          "type": "object",
          "properties": {
            "status": {
              "type": "string"
            },
            "publishedVersion": {
              "type": "number"
            },
            "publishedAt": {
              "type": "number"
            }
          },
          "additionalProperties": false
        }
      },
      "x-ref-schema": [],
      "additionalProperties": false
    }
  }
];

export const ACTIONS_SCHEMA = 'ACCESSCONTROL-ACTIONS-TEST.actions-test';
export const ROLEACTIONS_SCHEMA = 'ACCESSCONTROL-ROLEACTIONS.roleactions';
export const LANDING_WRITE_ROLE = 'MDMS_ADMIN';

/** Gateway actions the Builder's saves go through, one per master and verb. */
export const LANDING_ACTIONS = LANDING_SCHEMAS.flatMap((s) =>
  (['create', 'update'] as const).map((verb) => ({ url: `/mdms-v2/v2/_${verb}/${s.code}`, displayName: `${verb} ${s.code}` })),
);

export interface LandingSetupResult {
  schemasCreated: string[];
  actionsCreated: string[];
}

type Row = { data: Record<string, unknown>; isActive?: boolean };

/** MDMS v2 writes are accepted (202) and land in the database a moment later
 *  through the persister. Anything that references a just-created row — a
 *  role-action's actionid, a row of a just-created schema — must wait for it. */
async function waitFor(check: () => Promise<boolean>, what: string, timeoutMs = 15000): Promise<void> {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeoutMs) throw new Error(`${what} did not become visible within ${timeoutMs / 1000}s — please try again`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/** Create whichever of the two schemas the tenant lacks. Returns the codes created. */
export async function ensureLandingSchemas(tenantId: string): Promise<string[]> {
  const codes = LANDING_SCHEMAS.map((s) => s.code);
  const existing = new Set((await digitClient.mdmsSchemaSearch(tenantId, codes)).map((s: { code?: unknown }) => String(s.code)));
  const created: string[] = [];
  for (const s of LANDING_SCHEMAS) {
    if (existing.has(s.code)) continue;
    await digitClient.mdmsSchemaCreate(tenantId, s.code, s.description, s.definition);
    created.push(s.code);
  }
  if (created.length) {
    await waitFor(async () => {
      const found = new Set((await digitClient.mdmsSchemaSearch(tenantId, codes)).map((x: { code?: unknown }) => String(x.code)));
      return codes.every((c) => found.has(c));
    }, 'The landing page schemas');
  }
  return created;
}

/** Every row of a master, active and inactive — ids must not be reused. */
async function allRows(tenantId: string, schema: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (const isActive of [true, false]) {
    for (let offset = 0; ; offset += 1000) {
      const page = (await digitClient.mdmsSearch(tenantId, schema, { limit: 1000, offset, isActive })) as Row[];
      rows.push(...page);
      if (page.length < 1000) break;
    }
  }
  return rows;
}

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

/** Create the missing gateway actions for the landing masters and grant them
 *  to MDMS_ADMIN (the role the Builder's user must already hold to be here).
 *  Returns the action URLs created. */
export async function ensureLandingActions(tenantId: string): Promise<string[]> {
  const actions = await allRows(tenantId, ACTIONS_SCHEMA);
  const roleActions = await allRows(tenantId, ROLEACTIONS_SCHEMA);
  let nextActionId = Math.max(0, ...actions.map((r) => num(r.data.id))) + 1;
  let nextRoleActionId = Math.max(0, ...roleActions.map((r) => num(r.data.id))) + 1;
  const granted = new Set(
    roleActions.filter((r) => r.isActive !== false && r.data.rolecode === LANDING_WRITE_ROLE).map((r) => num(r.data.actionid)),
  );
  const created: string[] = [];
  const ids: Array<{ url: string; id: number; isNew: boolean }> = [];
  for (const a of LANDING_ACTIONS) {
    const existing = actions.find((r) => r.isActive !== false && r.data.url === a.url);
    if (existing) {
      ids.push({ url: a.url, id: num(existing.data.id), isNew: false });
      continue;
    }
    const id = nextActionId++;
    await digitClient.mdmsCreate(tenantId, ACTIONS_SCHEMA, String(id), {
      id, name: 'MDMS', url: a.url, displayName: a.displayName, orderNumber: 1, parentModule: '',
      enabled: true, serviceCode: 'MDMS v2', code: 'null', path: '',
    });
    ids.push({ url: a.url, id, isNew: true });
  }
  const fresh = ids.filter((x) => x.isNew).map((x) => String(x.id));
  if (fresh.length) {
    // A grant references its action; the persister must have written it first.
    await waitFor(async () => {
      const rows = (await digitClient.mdmsSearch(tenantId, ACTIONS_SCHEMA, { uniqueIdentifiers: fresh, limit: fresh.length })) as Row[];
      return rows.length >= fresh.length;
    }, 'The landing page permissions');
  }
  for (const x of ids) {
    if (granted.has(x.id)) continue;
    await digitClient.mdmsCreate(tenantId, ROLEACTIONS_SCHEMA, `${LANDING_WRITE_ROLE}.${x.id}`, {
      id: nextRoleActionId++, rolecode: LANDING_WRITE_ROLE, actionid: x.id, actioncode: '', tenantId,
    });
    created.push(x.url);
  }
  return created;
}

export async function ensureLandingSetup(tenantId: string): Promise<LandingSetupResult> {
  return { schemasCreated: await ensureLandingSchemas(tenantId), actionsCreated: await ensureLandingActions(tenantId) };
}

/** True for a gateway refusal (Kong's AccessDeniedException / HTTP 403). */
export function isAccessDenied(e: unknown): boolean {
  const err = e as { statusCode?: number; message?: string } | null;
  return err?.statusCode === 403 || /AccessDenied|not authorized/i.test(String(err?.message ?? ''));
}
