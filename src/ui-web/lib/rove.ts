import { useState, type FocusEvent, type KeyboardEvent } from "react";

// One Tab stop for a list of items. The arrow keys, Home and End move the focus in the list.
export function useRoving(ids: string[]) {
  const [active, setActive] = useState("");
  const current = ids.includes(active) ? active : ids[0];

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

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const id = (e.target as HTMLElement).closest("[data-rove]")?.getAttribute("data-rove");
    if (id) setActive(id);
  };

  return { tabIndex: (id: string) => (id === current ? 0 : -1), onKeyDown, onFocus };
}
