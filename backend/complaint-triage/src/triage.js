// Core logic, independent of Kafka so it can be unit tested.

import { DEFAULT_COMPILED, buildLanguageMatchers, scrub } from './scrub.js';
import { combine, isLevel, rulesLevel } from './priority.js';
import { buildContext, contextToObject } from './catalog.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const builtInPatterns = { get: async () => DEFAULT_COMPILED };
const noVocabulary = { get: async () => new Map() };
const emptyCatalog = { get: async () => new Map() };

// Field names (not values) of the complaint as received from Kafka, one level deep.
function describeFields(service) {
  return Object.entries(service || {}).map(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? `${k}{${Object.keys(v).join(',')}}` : k,
  );
}

export function createTriage({
  cfg, store, llm, patterns = builtInPatterns, vocabulary = noVocabulary, catalog = emptyCatalog,
  triageConfig = null, log = console, wait = sleep,
}) {
  // Detection matchers = MDMS word lists + localization vocabulary. Rebuilt only
  // when either source object changes (they're replaced on refresh, not mutated).
  const matcherCache = new WeakMap(); // patterns -> WeakMap(vocab -> matchers)
  function languageMatchers(P, vocab) {
    let byVocab = matcherCache.get(P);
    if (!byVocab) matcherCache.set(P, (byVocab = new WeakMap()));
    let m = byVocab.get(vocab);
    if (!m) byVocab.set(vocab, (m = buildLanguageMatchers(P.languageWords, vocab)));
    return m;
  }

  // Work out a level for one complaint. Never throws for AI problems.
  async function assess(service) {
    const rules = rulesLevel(service.serviceCode, cfg.rules);
    const P = await patterns.get(service.tenantId);
    const vocab = await vocabulary.get(service.tenantId);
    const { text, clean, found, languages } = scrub(service.description, P, {
      languageMatchers: languageMatchers(P, vocab),
    });
    if (!clean) {
      log.info(`${service.serviceRequestId}: personal details may remain after scrubbing; skipping AI`);
      if (cfg.logModelInput) {
        log.info(JSON.stringify({
          event: 'model-input', serviceRequestId: service.serviceRequestId,
          receivedFields: describeFields(service), sentToModel: null, blocked: true,
        }));
      }
      return { level: rules, source: 'rules', reason: 'scrub check failed', rules, languages };
    }
    // Non-personal complaint details (type name, category, department, county
    // target time, photo yes/no, channel) so the model can judge short or
    // meaningless descriptions. Sent even when the description is empty.
    const fields = triageConfig ? (await triageConfig.get(service.tenantId)).fields : cfg.contextFields;
    const context = buildContext(service, await catalog.get(service.tenantId), fields, {
      // Every context value gets the same personal-detail check as the description.
      isClean: (v) => {
        const r = scrub(v, P);
        return r.clean && r.found.length === 0;
      },
      log,
    });
    let ai = null;
    if (cfg.logModelInput) {
      // Audit/testing aid: exactly what goes to the model (already scrubbed),
      // plus which fields the service received. The original text is never logged.
      log.info(
        JSON.stringify({
          event: 'model-input',
          serviceRequestId: service.serviceRequestId,
          receivedFields: describeFields(service),
          sentToModel: llm.enabled ? { ...contextToObject(context), description: text } : null,
        }),
      );
    }
    if (llm.enabled) ai = await llm.classify(context, text);
    const out = combine(rules, ai, cfg.llm.minConfidence);
    return { ...out, reason: ai?.reason || '', confidence: ai?.confidence, rules, scrubbed: found.length, languages };
  }

  function audit(id, result, event) {
    // Reason and source are kept in logs only; the database stores just the level.
    log.info(
      JSON.stringify({
        event,
        serviceRequestId: id,
        priority: result.level,
        source: result.source,
        rulesLevel: result.rules,
        confidence: result.confidence,
        reason: result.reason,
        languages: result.languages,
        model: result.source === 'ai' ? cfg.llm.model : undefined,
      }),
    );
  }

  async function onCreate(service) {
    const { tenantId, serviceRequestId: id } = service;
    if (isLevel(service.additionalDetail?.priority)) return 'already-set';

    const result = await assess(service);
    for (let i = 0; i < cfg.createRetries; i++) {
      if (await store.setPriority(tenantId, id, result.level)) {
        audit(id, result, 'priority-set');
        return 'set';
      }
      // Row not inserted by the persister yet.
      await wait(cfg.createRetryDelayMs);
    }
    log.warn(`${id}: complaint row not found after ${cfg.createRetries} tries; priority not saved`);
    return 'not-found';
  }

  // Only job on update: make sure the priority is still there. Nothing else is touched.
  async function onUpdate(service) {
    const { tenantId, serviceRequestId: id } = service;
    if (isLevel(service.additionalDetail?.priority)) return 'kept';

    // The update payload has no priority, so once the persister applies it the
    // stored priority will be gone. Read it now, before that happens, to reuse it.
    const before = await store.getPriority(tenantId, id);
    await wait(cfg.updateSettleMs);
    const after = await store.getPriority(tenantId, id);
    if (!after.exists) return 'not-found';
    if (isLevel(after.priority)) return 'kept';

    let result;
    if (isLevel(before.priority)) {
      result = { level: before.priority, source: 'restored', reason: 'restored after update' };
    } else {
      result = await assess(service);
    }
    await store.setPriority(tenantId, id, result.level);
    audit(id, result, 'priority-restored');
    return 'restored';
  }

  return { assess, onCreate, onUpdate };
}
