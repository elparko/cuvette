import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-px text-xs font-medium [&_svg]:size-3", {
  variants: {
    tone: {
      default: "border-border text-muted-foreground",
      ok: "border-transparent bg-ok-bg text-ok",
      bad: "border-transparent bg-bad-bg text-bad",
      warn: "border-transparent bg-warn-bg text-warn",
      info: "border-transparent bg-info-bg text-info",
      mag: "border-transparent bg-mag-bg text-mag",
      solid: "border-transparent bg-primary text-primary-foreground",
    },
  },
  defaultVariants: { tone: "default" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
