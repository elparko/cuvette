import { CheckIcon } from "lucide-react";
import { DropdownMenu as M } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";

export const DropdownMenu = M.Root;
export const DropdownMenuTrigger = M.Trigger;
export const DropdownMenuRadioGroup = M.RadioGroup;

export function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content
        sideOffset={sideOffset}
        className={cn("z-50 min-w-[12rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)}
        {...props}
      />
    </M.Portal>
  );
}

const itemClass = "relative flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0";

export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return <M.Item className={cn(itemClass, destructive && "text-destructive data-[highlighted]:bg-bad-bg", className)} {...props} />;
}

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof M.RadioItem>) {
  return (
    <M.RadioItem className={cn(itemClass, "py-2 pl-8", className)} {...props}>
      <span className="absolute left-2.5 top-2.5 flex size-4 items-center justify-center">
        <M.ItemIndicator>
          <CheckIcon className="size-4 text-accent-brand" />
        </M.ItemIndicator>
      </span>
      {children}
    </M.RadioItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof M.Separator>) {
  return <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}
