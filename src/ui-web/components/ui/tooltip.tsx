import { Tooltip as T } from "radix-ui";
import type * as React from "react";

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "bottom" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  if (!content) return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
