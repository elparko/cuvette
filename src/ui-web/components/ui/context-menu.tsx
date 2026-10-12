import { ContextMenu as M } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";

export const ContextMenu = M.Root;
export const ContextMenuTrigger = M.Trigger;
export const ContextMenuSeparator = ({ className, ...props }: React.ComponentProps<typeof M.Separator>) => <M.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;

export function ContextMenuContent({ className, ...props }: React.ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content className={cn("z-50 min-w-[12rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)} {...props} />
    </M.Portal>
  );
}

export function ContextMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof M.Item> & { destructive?: boolean }) {
  return (
    <M.Item
      className={cn("relative flex cursor-default items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0", destructive && "text-destructive data-[highlighted]:bg-bad-bg", className)}
      {...props}
    />
  );
}
