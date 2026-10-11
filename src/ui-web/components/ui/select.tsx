import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as S } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";
import { fieldClass } from "./input.tsx";

export function Select({ value, onValueChange, options, label, className, disabled, placeholder }: { value: string; onValueChange: (v: string) => void; options: { value: string; label: React.ReactNode }[]; label: string; className?: string; disabled?: boolean; placeholder?: string }) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger aria-label={label} className={cn(fieldClass, "inline-flex w-auto items-center justify-between gap-2 text-left", className)}>
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDownIcon className="size-4 opacity-60" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className="z-50 max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="relative flex cursor-default items-center rounded-lg py-1.5 pr-8 pl-2.5 text-sm outline-none select-none data-[highlighted]:bg-muted">
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2.5">
                  <CheckIcon className="size-4 text-accent-brand" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
