import http from 'node:http';
import { Kafka, logLevel } from 'kafkajs';
import { loadConfig } from './src/config.js';
import { createStore } from './src/store.js';
import { createLlmClient } from './src/llm.js';
import { createTriage } from './src/triage.js';
import { createPatternSource } from './src/mdms.js';
import { createLocalizationVocabulary } from './src/localization.js';
import { createComplaintCatalog, CONTEXT_FIELDS } from './src/catalog.js';
import { createTriageConfigSource } from './src/triageConfig.js';

const cfg = loadConfig();
const unknown = cfg.contextFields.filter((f) => !CONTEXT_FIELDS.includes(f));
if (unknown.length) {
  console.error(`MODEL_CONTEXT_FIELDS has unknown fields: ${unknown.join(', ')} (allowed: ${CONTEXT_FIELDS.join(', ')})`);
  process.exit(1);
}
const store = createStore(cfg.db);
const llm = createLlmClient(cfg.llm);
const patterns = createPatternSource(cfg.mdms);
const vocabulary = createLocalizationVocabulary(cfg.localization);
const catalog = createComplaintCatalog(cfg.catalog);
const triageConfig = createTriageConfigSource({ ...cfg.triageConfig, defaultContextFields: cfg.contextFields });
const triage = createTriage({ cfg, store, llm, patterns, vocabulary, catalog, triageConfig });

let kafkaReady = false;

const kafka = new Kafka({ clientId: 'complaint-triage', brokers: cfg.kafka.brokers, logLevel: logLevel.WARN });
const consumer = kafka.consumer({ groupId: cfg.kafka.groupId });

consumer.on(consumer.events.GROUP_JOIN, () => {
  kafkaReady = true;
});
consumer.on(consumer.events.CRASH, () => {
  kafkaReady = false;
});

async function handle(topic, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    console.warn(`skipping non-JSON message on ${topic}`);
    return;
  }
  const service = msg?.service || msg?.ServiceWrapper?.service;
  if (!service?.serviceRequestId || !service?.tenantId) return;

  if (cfg.kafka.createTopic.test(topic)) await triage.onCreate(service);
  else if (cfg.kafka.updateTopic.test(topic)) await triage.onUpdate(service);
}

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topics: [cfg.kafka.createTopic, cfg.kafka.updateTopic], fromBeginning: false });
  await consumer.run({
    partitionsConsumedConcurrently: 3,
    eachMessage: async ({ topic, message }) => {
      try {
        await handle(topic, message.value?.toString() ?? '');
      } catch (err) {
        // Never block the partition on one bad complaint.
        console.error(`error handling message on ${topic}: ${err.stack || err.message}`);
      }
    },
  });
  console.log(
    `complaint-triage started; AI ${llm.enabled ? `enabled (${cfg.llm.model} @ ${cfg.llm.baseUrl})` : 'disabled (no LLM_API_KEY): rules only'}`,
  );
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    let dbOk = true;
    try {
      await store.ping();
    } catch {
      dbOk = false;
    }
    const ok = dbOk && kafkaReady;
    res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: ok ? 'UP' : 'DOWN', db: dbOk, kafka: kafkaReady, ai: llm.enabled }));
    return;
  }
  res.writeHead(404).end();
});
server.listen(cfg.port);

async function shutdown() {
  server.close();
  await consumer.disconnect().catch(() => {});
  await store.close().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch((err) => {
  console.error(`failed to start: ${err.stack || err.message}`);
  process.exit(1);
});
