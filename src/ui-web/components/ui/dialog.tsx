import { XIcon } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type * as React from "react";
import { cn } from "../../lib/utils.ts";

let before: HTMLElement | null = null;
if (typeof document !== "undefined")
  document.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement;
    if (!t.closest?.('[role="dialog"], [role="menu"], [role="alertdialog"]')) before = t;
  });

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({ className, children, wide, onCloseAutoFocus, ...props }: React.ComponentProps<typeof D.Content> & { wide?: boolean }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <D.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-2xl border bg-popover p-6 text-popover-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          wide ? "max-w-[min(1100px,96vw)]" : "max-w-lg",
          className,
        )}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e);
          const now = document.activeElement;
          if (e.defaultPrevented || !before?.isConnected || (now && now !== document.body)) return;
          e.preventDefault();
          before.focus();
        }}
        {...props}
      >
        {children}
        <D.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring" aria-label="Close">
          <XIcon className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
