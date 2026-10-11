import type * as React from "react";
import { cn } from "../../lib/utils.ts";

export const fieldClass =
  "h-9 w-full min-w-0 rounded-lg border bg-field px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldClass, "h-auto py-2", className)} {...props} />;
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClass, "w-auto appearance-none bg-[length:10px_6px] bg-[right_12px_center] bg-no-repeat pr-8 select-chevron", className)} {...props} />;
}
