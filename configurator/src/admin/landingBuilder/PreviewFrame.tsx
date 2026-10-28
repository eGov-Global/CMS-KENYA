/** Live preview — the primary workspace (P4, CCSD-2009).
 *
 * Embeds the PRODUCTION landing page and drives it over the same-origin
 * postMessage bridge: pushes {config, staged localization messages, locale}
 * (debounced), highlight-on-hover (both directions), scroll-on-select, and
 * receives hover/select events from the page (click-to-edit). Zoom scales the
 * frame; viewport controls its width. Nothing persists through this path.
 */
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useBuilder, buildPreviewConfig, isDirty } from './builderStore';
import { BUILDER_LOCALES, getLoadedMessages } from './localization';
import type { InspectorTab, LandingPageData, LandingSectionData, LocEdits } from './types';

const LANDING_PATH = '/digit-ui/landing?builderPreview=1';
const VIEWPORT_WIDTH: Record<string, number> = { desktop: 1280, tablet: 768, mobile: 390 };

export function PreviewFrame() {
  const { state, dispatch } = useBuilder();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  // The page's built-in layout, reported with the ready handshake.
  const [defaults, setDefaults] = useState<{ sections: LandingSectionData[]; page: LandingPageData } | null>(null);
  const seededRef = useRef(false);
  // Inline edits arrive in the message handler, which is bound once; read the live locale.
  const localeRef = useRef(state.displayLocale);
  useEffect(() => { localeRef.current = state.displayLocale; }, [state.displayLocale]);
  const debounceRef = useRef<number>();

  const post = (payload: Record<string, unknown>) =>
    frameRef.current?.contentWindow?.postMessage(payload, window.location.origin);

  // In: ready handshake + hover/select events from the embedded page.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'pgrl-preview-ready') {
        setReady(true);
        const d = msg.defaults;
        if (d && typeof d === 'object' && Array.isArray(d.sections)) {
          setDefaults({ sections: d.sections as LandingSectionData[], page: (d.page ?? {}) as LandingPageData });
        }
      }
      else if (msg.type === 'pgrl-preview-hover')
        dispatch({ type: 'hover', code: typeof msg.code === 'string' ? msg.code : null });
      else if (msg.type === 'pgrl-preview-pick-media' && typeof msg.code === 'string') {
        // A picture on the page was clicked: that section's Media library opens.
        dispatch({ type: 'select', id: msg.code, tab: 'media', focusField: 'media.imageId' });
      }
      else if (msg.type === 'pgrl-preview-edit' && typeof msg.key === 'string' && typeof msg.text === 'string') {
        // Text typed on the page: staged like an Inspector edit, for the language shown.
        dispatch({ type: 'patchLoc', locale: localeRef.current, key: msg.key, text: msg.text, coalesce: `inline:${msg.key}` });
        if (typeof msg.code === 'string') dispatch({ type: 'select', id: msg.code });
      }
      else if (msg.type === 'pgrl-preview-select' && typeof msg.code === 'string') {
        dispatch({
          type: 'select',
          id: msg.code,
          tab: (msg.field ? 'content' : undefined) as InspectorTab | undefined,
          focusField: typeof msg.field === 'string' ? msg.field : null,
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [dispatch]);

  // A tenant with no saved rows: once the page has reported its built-in
  // layout and the MDMS load has finished empty, seed the Builder from that
  // layout as unsaved rows. Once per mount, so an operator who deletes every
  // section does not get them back.
  useEffect(() => {
    if (!defaults || state.loading || state.error || seededRef.current) return;
    seededRef.current = true;
    if (state.sections.some((s) => s.state !== 'deleted')) return;
    dispatch({ type: 'seedDefaults', sections: defaults.sections, page: defaults.page });
  }, [defaults, state.loading, state.error, state.sections, dispatch]);

  // Out: config + staged localization + display locale (≤150 ms debounce).
  useEffect(() => {
    if (!ready || state.loading) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // Push the FULL loaded message map with staged edits layered on top —
      // the iframe's i18n store never loads the rainmaker-pgr module, so
      // partial pushes would leave saved-but-unedited custom text rendering
      // as deck fallbacks (and this also makes retracted edits revert
      // naturally, since the original text is always in the map).
      const messages: LocEdits = {};
      const locales = new Set([
        ...BUILDER_LOCALES.map((l) => l.code),
        ...Object.keys(state.locEdits),
      ]);
      locales.forEach((lng) => {
        const out: Record<string, string> = {
          ...getLoadedMessages(lng),
          ...(state.locEdits[lng] ?? {}),
        };
        if (Object.keys(out).length) messages[lng] = out;
      });
      post({
        type: 'pgrl-preview-config',
        config: buildPreviewConfig(state),
        messages,
        locale: state.displayLocale,
      });
    }, 150);
    return () => window.clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.loading, state.sections, state.page, state.locEdits, state.previewMode, state.displayLocale]);

  // Out: hover highlight (from the section list) + scroll on select.
  useEffect(() => {
    if (!ready) return;
    post({ type: 'pgrl-preview-highlight', code: state.hovered ?? (state.selected !== 'page' ? state.selected : null) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.hovered, state.selected]);

  useEffect(() => {
    if (!ready || state.selected === 'page') return;
    post({ type: 'pgrl-preview-scroll', code: state.selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.selected]);

  // Hover a section card -> auto-scroll the preview to it (debounced so a
  // quick sweep across the list doesn't thrash the page).
  const hoverScrollRef = useRef<number>();
  useEffect(() => {
    if (!ready || !state.hovered) return;
    window.clearTimeout(hoverScrollRef.current);
    hoverScrollRef.current = window.setTimeout(
      () => post({ type: 'pgrl-preview-scroll', code: state.hovered! }),
      250,
    );
    return () => window.clearTimeout(hoverScrollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.hovered]);

  const width = VIEWPORT_WIDTH[state.viewport] ?? 1280;
  const dirty = isDirty(state);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-muted/40">
      <div className="flex items-center gap-2 border-b border-border bg-card/60 px-3 py-1.5 text-xs">
        <span className="font-medium">Live Preview</span>
        <Badge variant="outline" className={state.previewMode === 'draft' ? 'border-amber-500 text-amber-600' : 'border-emerald-600 text-emerald-700'}>
          {state.previewMode === 'draft' ? 'Draft' : 'Published'}
        </Badge>
        <span className="text-muted-foreground">
          {dirty ? '● Unsaved changes — preview only' : '✓ In sync with saved config'}
        </span>
        <span className="ml-auto text-muted-foreground">Click any element to edit it</span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div
          className="mx-auto origin-top rounded-md border border-border bg-white shadow-sm"
          style={{ width, transform: `scale(${state.zoom})`, transformOrigin: 'top center' }}
        >
          <iframe
            ref={frameRef}
            title="Landing page preview"
            src={LANDING_PATH}
            style={{ width, height: 'calc(100vh - 160px)', border: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
