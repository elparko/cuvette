import { EyeIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "../lib/utils.ts";
import { Tooltip } from "./ui/tooltip.tsx";

export function InfoTip({ children, label = "More information", side = "top", className, inMenu }: { children: React.ReactNode; label?: string; side?: "top" | "bottom" | "left" | "right"; className?: string; inMenu?: boolean }) {
  return (
    <Tooltip content={children} side={side}>
      <span tabIndex={inMenu ? undefined : 0} role={inMenu ? undefined : "img"} aria-label={inMenu ? undefined : label} aria-hidden={inMenu || undefined} className={cn("inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", className)}>
        <EyeIcon className="size-3.5" />
      </span>
    </Tooltip>
  );
}
