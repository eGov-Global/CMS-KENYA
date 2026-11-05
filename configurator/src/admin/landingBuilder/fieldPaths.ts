import type { LandingSectionData } from './types';

/** Read a dotted field path from a section draft (media.imageId, media.images.left). */
export const getPath = (obj: Record<string, unknown> | undefined, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), obj);

/** The patch that sets a dotted field path on a section draft. The schema nests
 *  at most two levels (media.imageId, theme.accent, media.images.<slot>). */
export const setPath = (draft: LandingSectionData, path: string, value: unknown): Partial<LandingSectionData> => {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { [head]: value } as Partial<LandingSectionData>;
  const nested = { ...((draft as Record<string, unknown>)[head] as Record<string, unknown> | undefined) };
  if (rest.length === 1) {
    nested[rest[0]] = value;
  } else {
    const inner = { ...((nested[rest[0]] as Record<string, unknown> | undefined) ?? {}) };
    if (value === undefined) delete inner[rest.slice(1).join('.')]; else inner[rest.slice(1).join('.')] = value;
    nested[rest[0]] = inner;
  }
  return { [head]: nested } as Partial<LandingSectionData>;
};

/** Human label for a named picture slot (media.images.<slot>). */
export function slotLabel(slot: string): string {
  const known: Record<string, string> = { pattern: 'Pattern strip', left: 'Left photo', right: 'Right photo', skyline: 'Skyline', portrait: 'Portrait photo', emblem: 'Emblem' };
  if (known[slot]) return known[slot];
  if (slot.startsWith('card-')) return `Card photo: ${slot.slice(5).replace(/[_-]+/g, ' ')}`;
  return slot.replace(/[_-]+/g, ' ');
}
