import { useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type KeyboardEvent } from "react";

// One Tab stop for a list of items. The arrow keys, Home and End move the focus in the list.
export function useRoving(ids: string[]) {
  const [active, setActive] = useState("");
  const current = ids.includes(active) ? active : ids[0];
  const box = useRef<HTMLElement | null>(null);
  const before = useRef(ids);
  const key = ids.join("\n");

  // After a delete or a move of the focused item, the focus goes to the item in its place, not to the page.
  // A menu or a dialog of the item can have the focus between. A focus that the scientist moves to another place cancels this.
  const pending = useRef("");
  useEffect(() => {
    const away = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && !box.current?.contains(t) && !t.closest?.('[role="menu"], [role="dialog"], [role="alertdialog"]')) pending.current = "";
    };
    const out = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && box.current?.contains(t) && !e.relatedTarget) queueMicrotask(() => t.isConnected && (pending.current = ""));
    };
    document.addEventListener("focusin", away);
    document.addEventListener("focusout", out);
    return () => {
      document.removeEventListener("focusin", away);
      document.removeEventListener("focusout", out);
    };
  }, []);

  useEffect(() => {
    const was = before.current;
    before.current = ids;
    const gone = pending.current;
    if (!gone || ids.includes(gone) || !was.includes(gone) || !ids.length) return;
    pending.current = "";
    const f = document.activeElement;
    if (f && f !== document.body) return;
    const id = ids[Math.min(was.indexOf(gone), ids.length - 1)]!;
    box.current?.querySelector<HTMLElement>(`[data-rove="${CSS.escape(id)}"]`)?.focus();
  }, [key]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-rove]:not(:disabled)")];
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const here = items[at]!.getBoundingClientRect();
    let next: HTMLElement | undefined;
    if (e.key === "ArrowRight") next = items[at + 1];
    else if (e.key === "ArrowLeft") next = items[at - 1];
    else if (e.key === "Home") next = items[0];
    else if (e.key === "End") next = items.at(-1);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const down = e.key === "ArrowDown";
      const rows = items.filter((x) => (down ? x.getBoundingClientRect().top > here.top + 1 : x.getBoundingClientRect().top < here.top - 1));
      if (rows.length) {
        const row = down ? Math.min(...rows.map((x) => x.getBoundingClientRect().top)) : Math.max(...rows.map((x) => x.getBoundingClientRect().top));
        next = rows.filter((x) => Math.abs(x.getBoundingClientRect().top - row) <= 1).sort((a, b) => Math.abs(a.getBoundingClientRect().left - here.left) - Math.abs(b.getBoundingClientRect().left - here.left))[0];
      }
    } else return;
    e.preventDefault();
    if (!next) return;
    next.focus();
    next.scrollIntoView?.({ block: "nearest" });
  };

  const onFocus = (e: ReactFocusEvent<HTMLElement>) => {
    const id = (e.target as HTMLElement).closest("[data-rove]")?.getAttribute("data-rove");
    if (!id) return;
    setActive(id);
    pending.current = id;
  };

  const ref = (el: HTMLElement | null) => {
    box.current = el;
  };

  return { tabIndex: (id: string) => (id === current ? 0 : -1), onKeyDown, onFocus, ref };
}
