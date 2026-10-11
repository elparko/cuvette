import { Switch as S } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";

export function Switch({ className, ...props }: React.ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        "peer inline-flex h-[22px] w-10 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent-brand data-[state=unchecked]:bg-switch-off",
        className,
      )}
      {...props}
    >
      <S.Thumb className="pointer-events-none block size-[18px] rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[19px] data-[state=unchecked]:translate-x-px" />
    </S.Root>
  );
}
