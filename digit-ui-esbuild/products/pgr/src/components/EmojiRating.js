/* eslint-disable react/prop-types */
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { RATING_SCALE, ratingStep, ratingLabel, trRating as tr } from "../utils/ratingScale";

/**
 * Radio-group of five faces. One tap picks a level; arrow keys move between
 * them (roving tabindex, WAI-ARIA radio pattern). Each option is a full-height
 * column so the touch target stays ≥ 44 px even at 360 px wide.
 */
export function EmojiRatingInput({ value, onChange, label }) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(0);
  const refs = useRef([]);
  // Hover preview only where a real pointer hovers; on touch screens the synthetic
  // mouseenter would leave a face looking chosen without anything being selected.
  const canHover = typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;
  const preview = (v) => canHover && setHover(v);

  const select = (next) => {
    const step = ratingStep(next);
    if (!step) return;
    onChange(step.value);
    refs.current[step.value - 1]?.focus();
  };
  const onKeyDown = (e) => {
    // Arrows move from the option that has focus (WAI-ARIA radio group), so with
    // nothing chosen yet the first press from the first face lands on the second.
    const focused = refs.current.indexOf(e.target) + 1;
    const current = focused || Number(value) || 1;
    const moves = { ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1, Home: 1, End: RATING_SCALE.length };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(Math.min(RATING_SCALE.length, Math.max(1, moves[e.key])));
  };

  return (
    <div className="pgr-emoji-rating">
      <div role="radiogroup" aria-label={label} className="pgr-emoji-rating__row" onKeyDown={onKeyDown} onMouseLeave={() => preview(0)}>
        {RATING_SCALE.map((s, i) => {
          const selected = Number(value) === s.value;
          const lit = hover ? hover === s.value : selected;
          const dimmed = (hover || value) && !lit;
          const text = tr(t, s.key, s.fallback);
          return (
            <button
              key={s.value}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={text}
              tabIndex={value ? (selected ? 0 : -1) : i === 0 ? 0 : -1}
              className={`pgr-emoji-rating__option${lit ? " is-active" : ""}${dimmed ? " is-dimmed" : ""}`}
              onClick={() => select(s.value)}
              onMouseEnter={() => preview(s.value)}
            >
              <span className="pgr-emoji-rating__face" aria-hidden="true">{s.emoji}</span>
              <span className="pgr-emoji-rating__label">{text}</span>
            </button>
          );
        })}
      </div>
      <p className="pgr-emoji-rating__live" role="status" aria-live="polite">{value ? ratingLabel(t, value) : ""}</p>
    </div>
  );
}

/** Read-only "You rated 🙂 Happy" pill for details pages and timelines. */
export function EmojiRatingBadge({ rating, text }) {
  const { t } = useTranslation();
  const step = ratingStep(rating);
  if (!step) return null;
  return (
    <span className="pgr-emoji-rating__badge">
      {text ? <span className="pgr-emoji-rating__badge-text">{String(text).trim()}</span> : null}
      <span className="pgr-emoji-rating__badge-face" aria-hidden="true">{step.emoji}</span>
      <span className="pgr-emoji-rating__badge-label">{tr(t, step.key, step.fallback)}</span>
    </span>
  );
}

export { RATING_SCALE, ratingStep, ratingLabel };
export default EmojiRatingInput;
