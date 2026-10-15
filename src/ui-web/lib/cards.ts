export function patchCards(box: HTMLElement, html: string, seen: Map<string, string>): Set<Element> {
  const kept_ = new Set<Element>();
  const t = document.createElement("template");
  t.innerHTML = html;
  const before = new Map<string, Element>();
  for (const c of box.children) if (c instanceof HTMLElement && c.dataset.card) before.set(c.dataset.card, c);
  const next: Element[] = [];
  const kept = new Map<string, string>();
  for (const n of [...t.content.children]) {
    const id = n instanceof HTMLElement ? n.dataset.card : undefined;
    const text = n.outerHTML;
    const old = id ? before.get(id) : undefined;
    if (id) kept.set(id, text);
    const keep = !!old && seen.get(id!) === text;
    if (keep) kept_.add(old!);
    next.push(keep ? old! : n);
  }
  seen.clear();
  for (const [id, text] of kept) seen.set(id, text);
  let at: ChildNode | null = box.firstChild;
  for (const n of next) {
    if (n === at) at = at.nextSibling;
    else box.insertBefore(n, at);
  }
  while (at) {
    const after: ChildNode | null = at.nextSibling;
    at.remove();
    at = after;
  }
  return kept_;
}

export const cardTakesFocus = (active: Element | null, body: Element, cards: Element | null) => !active || active === body || !!cards?.contains(active);
