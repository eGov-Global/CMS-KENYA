export const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function isLevel(v) {
  return typeof v === 'string' && LEVELS.includes(v);
}

export function rulesLevel(serviceCode, rules) {
  const base = rules.basePriority?.[serviceCode];
  if (isLevel(base)) return base;
  return isLevel(rules.defaultPriority) ? rules.defaultPriority : 'MEDIUM';
}

// Combine the rules level with the AI answer.
// - No AI answer, or low confidence: rules level.
// - The AI may raise freely, but may lower by at most one level, so it can't
//   bury a complaint the rules consider serious.
export function combine(rules, ai, minConfidence) {
  if (!ai || ai.confidence < minConfidence) return { level: rules, source: 'rules' };
  const r = LEVELS.indexOf(rules);
  const a = LEVELS.indexOf(ai.priority);
  if (a < r - 1) return { level: LEVELS[r - 1], source: 'ai' };
  return { level: ai.priority, source: 'ai' };
}
