// Floating WhatsApp action. Renders nothing while the WHATSAPP route is "#",
// which is the case for Bomet. The label expands on hover so the icon is not
// the only cue.

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { useLandingCopy } from "../useLandingCopy";
import { FOCUS_RING } from "../tokens";

export interface WhatsAppFabProps {
  href: string;
}

export function WhatsAppFab({ href }: WhatsAppFabProps) {
  const { c } = useLandingCopy();
  if (!href || href === "#") return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${c("FAB_LABEL")} (${c("EXTERNAL_LINK_NOTE")})`}
      className={
        "group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-50 flex min-h-[56px] min-w-[56px] " +
        "items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 !text-[#0b3d2e] no-underline shadow-lg " +
        // Brand-blue focus ring: the FAB floats over the light page,
        // where the accent ring is ~1.5:1 — invisible.
        "motion-safe:transition-transform hover:scale-105 print:hidden " +
        FOCUS_RING
      }
    >
      <MessageCircle aria-hidden className="h-7 w-7" />
      <span className="hidden text-sm font-bold sm:group-hover:inline sm:group-focus-visible:inline">
        WhatsApp
      </span>
    </a>
  );
}
