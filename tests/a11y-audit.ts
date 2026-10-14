import type { Page } from "./chrome.ts";

export interface Finding {
  where: string;
  detail: string;
}

const IN_PAGE = String.raw`
(() => {
  if (window.__a11y) return;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = "#000";
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const mix = (f, a, b) => [0, 1, 2].map((i) => f[i] * a + b[i] * (1 - a));
  const cumOpacity = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
    return o;
  };
  const canvasColor = () => (matchMedia("(forced-colors: active)").matches ? [255, 255, 255] : getComputedStyle(document.documentElement).colorScheme.includes("dark") ? [18, 18, 18] : [255, 255, 255]);
  const backdrop = (el) => {
    const layers = [];
    let unknown = "";
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage.includes("url(")) {
        unknown = e.tagName.toLowerCase() + "." + String(e.className).slice(0, 40);
        break;
      }
      const c = rgba(cs.backgroundColor);
      const a = c[3] * cumOpacity(e);
      if (a > 0) layers.push([c, a]);
      if (a >= 0.999) break;
    }
    let bg = canvasColor();
    for (const [c, a] of layers.reverse()) bg = mix(c, a, bg);
    return { bg, unknown };
  };
  const sel = (el) => {
    if (!el || !el.tagName) return "?";
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    const label = el.getAttribute("aria-label");
    if (label) s += '[aria-label="' + label.slice(0, 40) + '"]';
    for (const a of ["data-type", "data-act", "role", "name", "data-setting", "type"]) if (el.getAttribute(a)) s += "[" + a + "=" + el.getAttribute(a) + "]";
    const cls = String(el.getAttribute("class") || "").split(/\s+/).filter((c) => c && !/[:\[\]\/]/.test(c)).slice(0, 3);
    if (cls.length) s += "." + cls.join(".");
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
    if (text && !label) s += ' "' + text + '"';
    return s;
  };
  const shown = (el) => {
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const rgb = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TITLE", "HEAD", "META", "LINK", "OPTION", "OPTGROUP", "SVG", "PATH", "CANVAS"]);

  const contrast = () => {
    const out = [];
    const skipped = new Set();
    const check = (el, color, label, ownBg) => {
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight) >= 700);
      const need = large || el.closest("[aria-hidden='true']") ? 3 : 4.5;
      const fg = rgba(color);
      const b = backdrop(ownBg || el);
      if (b.unknown) {
        skipped.add(b.unknown);
        return;
      }
      const a = fg[3] * cumOpacity(el);
      const eff = mix(fg, a, b.bg);
      const r = ratio(eff, b.bg);
      if (r < need - 0.005) out.push({ where: sel(el), detail: label + " " + r.toFixed(2) + " < " + need + " (" + rgb(eff) + " on " + rgb(b.bg) + ", " + size + "px)" });
    };
    for (const el of document.body.querySelectorAll("*")) {
      if (SKIP_TAGS.has(el.tagName.toUpperCase())) continue;
      if (el.closest(":disabled, [aria-disabled='true']")) continue;
      if (!shown(el)) continue;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        const t = el.getAttribute("type");
        if (["checkbox", "radio", "hidden", "range", "file", "color", "image"].includes(t)) continue;
        const cs = getComputedStyle(el);
        const hasText = el.tagName === "SELECT" || t === "submit" || t === "button" || el.value;
        if (hasText) check(el, cs.color, "field text");
        else if (el.getAttribute("placeholder")) check(el, getComputedStyle(el, "::placeholder").color, "placeholder");
        continue;
      }
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (own) check(el, getComputedStyle(el).color, "text");
    }
    return { out, skipped: [...skipped] };
  };

  const edge = (el) => {
    const cs = getComputedStyle(el);
    const parent = backdrop(el.parentElement);
    if (parent.unknown) return null;
    const own = rgba(cs.backgroundColor);
    const bgEff = mix(own, own[3], parent.bg);
    const bw = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
    const bc = rgba(cs.borderTopColor);
    const border = bw ? ratio(mix(bc, bc[3], parent.bg), parent.bg) : 0;
    return { border, fill: ratio(bgEff, parent.bg), best: Math.max(border, ratio(bgEff, parent.bg)) };
  };

  const fields = () => {
    const out = [];
    for (const el of document.body.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), textarea, select, [role=combobox]")) {
      if (!shown(el) || el.disabled || el.closest("table.sheet")) continue;
      let e = edge(el);
      if (!e) continue;
      for (let up = el.parentElement, i = 0; e.best < 3 && i < 2 && up; up = up.parentElement, i++) {
        const u = edge(up);
        if (u && u.border >= 3) e = u;
      }
      if (e.best < 3) out.push({ where: sel(el), detail: "field edge " + e.best.toFixed(2) + " < 3 (border " + e.border.toFixed(2) + ", fill " + e.fill.toFixed(2) + ")" });
    }
    for (const el of document.body.querySelectorAll("[role=switch], [role=checkbox], input[type=checkbox], input[type=radio]")) {
      if (!shown(el) || el.disabled) continue;
      const cs = getComputedStyle(el);
      const parent = backdrop(el.parentElement);
      if (parent.unknown || el.matches("input")) continue;
      const own = rgba(cs.backgroundColor);
      const r = ratio(mix(own, own[3], parent.bg), parent.bg);
      const bc = rgba(cs.borderTopColor);
      const br = parseFloat(cs.borderTopWidth) > 0 ? ratio(mix(bc, bc[3], parent.bg), parent.bg) : 0;
      if (Math.max(r, br) < 3 && el.getAttribute("aria-checked") !== "true") out.push({ where: sel(el), detail: "switch off edge " + Math.max(r, br).toFixed(2) + " < 3" });
    }
    return out;
  };

  const iconButtons = () => {
    const out = [];
    for (const el of document.body.querySelectorAll("button, a[href], [role=button], [role=tab]")) {
      if (el.matches("[role=switch], [role=checkbox], [role=radio]")) continue;
      if (!shown(el) || el.disabled || el.getAttribute("aria-disabled") === "true") continue;
      if ((el.textContent || "").trim()) continue;
      const cs = getComputedStyle(el);
      const b = backdrop(el);
      if (b.unknown) continue;
      const fg = rgba(cs.color);
      const r = ratio(mix(fg, fg[3] * cumOpacity(el), b.bg), b.bg);
      if (r < 3) out.push({ where: sel(el), detail: "icon " + r.toFixed(2) + " < 3" });
    }
    return out;
  };

  const parseShadows = (v) => {
    const parts = [];
    let depth = 0, cur = "";
    for (const ch of v) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        parts.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts.filter((p) => p !== "none").map((p) => {
      const inset = /\binset\b/.test(p);
      const colorMatch = /(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\)|oklch\([^)]*\)|#[0-9a-f]+)/i.exec(p);
      const rest = p.replace(colorMatch ? colorMatch[0] : "", "").replace("inset", "");
      const nums = rest.match(/-?[\d.]+px/g)?.map((x) => parseFloat(x)) || [];
      return { color: colorMatch ? colorMatch[0] : "", inset, x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0 };
    });
  };

  const ringOf = (el, cands, host) => {
    const cs = getComputedStyle(el);
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) {
      const c = rgba(cs.outlineColor);
      cands.push({ kind: "outline", w: parseFloat(cs.outlineWidth), ratio: ratio(mix(c, c[3], host.bg), host.bg) });
    }
    for (const s of parseShadows(cs.boxShadow)) {
      if (s.spread < 1 && s.blur < 1) continue;
      const c = rgba(s.color);
      if (!c[3]) continue;
      cands.push({ kind: "shadow", w: s.spread, ratio: ratio(mix(c, c[3], host.bg), host.bg) });
    }
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") {
      const c = rgba(cs.borderTopColor);
      cands.push({ kind: "border", w: parseFloat(cs.borderTopWidth), ratio: ratio(mix(c, c[3], host.bg), host.bg) });
    }
  };

  const focusInfo = (el) => {
    const cands = [];
    ringOf(el, cands, backdrop(el.parentElement || el));
    let up = el.parentElement;
    for (let i = 0; i < 3 && up && up !== document.body; i++, up = up.parentElement) {
      if (up.matches(":focus-within") && !up.matches("main, section, aside, nav, [role=dialog]")) ringOf(up, cands, backdrop(up.parentElement || up));
    }
    return { cands };
  };

  const FOCUSABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=true], [role=button], [role=tab], [role=menuitem], [role=radio], [role=switch], [role=checkbox], [role=link]';
  const interactive = () => [...document.querySelectorAll(FOCUSABLE)].filter((e) => shown(e) && !e.disabled && e.getAttribute("aria-hidden") !== "true" && !e.closest("[inert]"));

  const hasName = (el) => {
    if (el.getAttribute("aria-label")?.trim()) return true;
    const lb = el.getAttribute("aria-labelledby");
    if (lb && lb.split(/\s+/).some((id) => document.getElementById(id)?.textContent.trim())) return true;
    if (el.labels && [...el.labels].some((l) => l.textContent.trim())) return true;
    if (el.matches("select, textarea, input")) return !!el.getAttribute("title")?.trim();
    if ((el.textContent || "").trim()) return true;
    if (el.querySelector("img[alt]:not([alt=''])")) return true;
    if (el.querySelector("svg title")) return true;
    if (el.getAttribute("title")?.trim()) return true;
    return false;
  };

  const headings = () => {
    const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")].filter((h) => h.checkVisibility({ checkVisibilityCSS: true }) && !h.closest("[aria-hidden=true]"));
    return hs.map((h) => ({ level: h.getAttribute("aria-level") ? +h.getAttribute("aria-level") : +h.tagName[1], where: sel(h) }));
  };

  const landmarks = () => {
    const list = [...document.querySelectorAll("main, [role=main], nav, [role=navigation], aside, [role=complementary], header, [role=banner], footer, [role=contentinfo], section[aria-label], section[aria-labelledby], [role=region], form[aria-label], [role=search]")].filter(shown);
    return list.map((e) => {
      const r = e.getAttribute("role");
      const t = e.tagName.toLowerCase();
      const role = r || ({ main: "main", nav: "navigation", aside: "complementary", header: e.closest("main, section, article, aside, nav") ? "none" : "banner", footer: e.closest("main, section, article, aside, nav") ? "none" : "contentinfo", section: "region", form: "form" }[t] || t);
      const lb = e.getAttribute("aria-labelledby");
      const name = e.getAttribute("aria-label") || (lb && document.getElementById(lb)?.textContent.trim()) || "";
      return { role, name, where: sel(e) };
    }).filter((x) => x.role !== "none");
  };

  const hasPositionedAncestor = (e, kinds) => {
    for (let a = e; a && a !== document.body; a = a.parentElement) if (kinds.includes(getComputedStyle(a).position)) return true;
    return false;
  };

  const clipped = () => {
    const out = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (!shown(el) || SKIP_TAGS.has(el.tagName.toUpperCase())) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      const hidesX = !["visible", "auto", "scroll"].includes(cs.overflowX);
      const hidesY = !["visible", "auto", "scroll"].includes(cs.overflowY);
      const wide = hidesX && el.scrollWidth > el.clientWidth + 1;
      const tall = hidesY && el.scrollHeight > el.clientHeight + 1;
      if (!wide && !tall) continue;
      if (el.matches("pre, code") && cs.overflowX !== "hidden") continue;
      out.push({ where: sel(el), detail: (wide ? "text is wider than its box by " + (el.scrollWidth - el.clientWidth) + "px" : "text is taller than its box by " + (el.scrollHeight - el.clientHeight) + "px") + (cs.textOverflow === "ellipsis" ? " (ellipsis)" : "") + (cs.webkitLineClamp !== "none" ? " (line clamp)" : "") + (el.closest("[title]") ? " (has a title)" : "") });
    }
    return out;
  };

  const inView = (e) => {
    const r = e.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const ar = a.getBoundingClientRect();
      if (cx < ar.left || cx > ar.right || cy < ar.top || cy > ar.bottom) return false;
    }
    return true;
  };

  const overlaps = () => {
    const out = [];
    const list = interactive().filter((e) => !hasPositionedAncestor(e, ["fixed", "sticky"]) && inView(e));
    const rects = list.map((e) => [e, e.getBoundingClientRect()]);
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const [a, ra] = rects[i], [b, rb] = rects[j];
        if (a.contains(b) || b.contains(a)) continue;
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w > 2 && h > 2) out.push({ where: sel(a), detail: "overlaps " + sel(b) + " by " + Math.round(w) + "x" + Math.round(h) });
      }
    const hidden = list.filter((e) => {
      const r = e.getBoundingClientRect();
      return r.right > innerWidth + 1 && !e.closest("[data-sheet-scroll], .sheetwrap, .sheet, pre, .tablewrap, [style*='overflow']");
    });
    for (const e of hidden) out.push({ where: sel(e), detail: "control ends at " + Math.round(e.getBoundingClientRect().right) + "px, past the " + innerWidth + "px width" });
    return out;
  };

  const targets = (min) => {
    const out = [];
    const list = interactive().filter((e) => !e.closest("p, li, .msg, .plantext, .blocktext, label") || e.matches("button, summary, input, select, textarea, [role=tab], [role=radio]"));
    const rects = list.map((e) => [e, e.getBoundingClientRect()]);
    for (const [e, r] of rects) {
      if (r.width >= min - 0.5 && r.height >= min - 0.5) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const crowded = rects.some(([o, ro]) => {
        if (o === e || o.contains(e) || e.contains(o)) return false;
        const dx = Math.max(ro.left - cx, 0, cx - ro.right), dy = Math.max(ro.top - cy, 0, cy - ro.bottom);
        return Math.hypot(dx, dy) < min / 2;
      });
      if (crowded) out.push({ where: sel(e), detail: "target " + Math.round(r.width) + "x" + Math.round(r.height) + " and another target is closer than " + min / 2 + "px" });
    }
    return out;
  };

  const motion = () => {
    const out = [];
    const run = document.getAnimations().filter((a) => a.playState === "running");
    for (const a of run) {
      const t = a.effect?.getTiming();
      const target = a.effect?.target;
      if (!t || !target) continue;
      const long = t.iterations === Infinity || Number(t.duration) * (t.iterations || 1) > 50;
      if (long && !target.closest(".animate-spin")) out.push({ where: sel(target), detail: (a.animationName || a.transitionProperty || "animation") + " runs " + t.duration + "ms x " + t.iterations });
    }
    for (const el of [document.documentElement, ...document.body.querySelectorAll("*")]) {
      const cs = getComputedStyle(el);
      if (cs.scrollBehavior === "smooth") out.push({ where: sel(el), detail: "smooth scroll" });
    }
    return out;
  };

  window.__a11y = { hasPositionedAncestor, clipped, overlaps, targets, motion, rgba, ratio, backdrop, sel, shown, contrast, fields, iconButtons, focusInfo, interactive, hasName, headings, landmarks, parseShadows, mix, rgb };
})()
`;

export const installAudit = (page: Page) => page.eval(IN_PAGE);

export const contrastFindings = async (page: Page): Promise<Finding[]> => {
  await installAudit(page);
  const r = await page.eval<{ out: Finding[]; skipped: string[] }>(`__a11y.contrast()`);
  const f = await page.eval<Finding[]>(`__a11y.fields()`);
  const i = await page.eval<Finding[]>(`__a11y.iconButtons()`);
  return [...r.out, ...f, ...i];
};

export const namesFindings = async (page: Page): Promise<Finding[]> => {
  await installAudit(page);
  return page.eval<Finding[]>(`(() => {
    const out = [];
    for (const el of __a11y.interactive()) {
      if (el.matches("[role=tab], button, a[href], input, select, textarea, summary, [role=button], [role=menuitem], [role=radio], [role=switch], [role=checkbox], [role=link]") && !__a11y.hasName(el)) out.push({ where: __a11y.sel(el), detail: "no accessible name" });
    }
    for (const img of document.querySelectorAll("img")) if (__a11y.shown(img) && !img.hasAttribute("alt")) out.push({ where: __a11y.sel(img), detail: "image without alt" });
    for (const s of document.querySelectorAll("svg")) if (__a11y.shown(s) && !s.closest("button, a, [aria-hidden=true]") && !s.getAttribute("aria-hidden") && !s.getAttribute("role") && !s.querySelector("title")) out.push({ where: __a11y.sel(s), detail: "svg without hidden marker or name" });
    return out;
  })()`);
};

export const structureFindings = async (page: Page): Promise<Finding[]> => {
  await installAudit(page);
  return page.eval<Finding[]>(`(() => {
    const out = [];
    const modal = !!document.querySelector("[role=dialog]");
    const hs = modal ? [] : __a11y.headings();
    let prev = 0;
    for (const h of hs) {
      if (prev && h.level > prev + 1) out.push({ where: h.where, detail: "heading jumps from h" + prev + " to h" + h.level });
      prev = h.level;
    }
    if (hs.length && hs[0].level !== 1 && !hs.some((h) => h.level === 1)) out.push({ where: hs[0].where, detail: "no h1 on the page (first heading h" + hs[0].level + ")" });
    const lm = modal ? [] : __a11y.landmarks();
    const seen = new Map();
    for (const l of lm) {
      const key = l.role + "|" + l.name;
      if (seen.has(key)) out.push({ where: l.where, detail: "landmark " + l.role + " repeats the name '" + l.name + "'" });
      seen.set(key, 1);
    }
    for (const role of ["main", "banner", "contentinfo"]) if (lm.filter((l) => l.role === role).length > 1) out.push({ where: role, detail: "more than one " + role + " landmark" });
    if (!modal && !lm.some((l) => l.role === "main")) out.push({ where: "page", detail: "no main landmark" });
    const FOCUSABLE = "a[href], button, input, select, textarea, summary, [tabindex]";
    for (const el of document.querySelectorAll("*")) {
      if (!__a11y.shown(el)) continue;
      const cs = getComputedStyle(el);
      const holds = el.matches(FOCUSABLE) || el.querySelector(FOCUSABLE);
      if (cs.order !== "0" && holds) out.push({ where: __a11y.sel(el), detail: "CSS order " + cs.order + " puts the visual order out of line with the Tab order" });
      if (/reverse/.test(cs.flexDirection) && cs.display.includes("flex") && el.querySelector(FOCUSABLE)) out.push({ where: __a11y.sel(el), detail: "flex direction " + cs.flexDirection + " puts the visual order out of line with the Tab order" });
    }
    for (const el of document.querySelectorAll("[tabindex]")) if (+el.getAttribute("tabindex") > 0) out.push({ where: __a11y.sel(el), detail: "tabindex above 0 changes the Tab order" });
    for (const el of document.querySelectorAll("[aria-controls], [aria-labelledby], [aria-describedby], [aria-activedescendant]"))
      for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby", "aria-activedescendant"])
        for (const id of (el.getAttribute(attr) || "").split(/\\s+/).filter(Boolean)) if (!document.getElementById(id)) out.push({ where: __a11y.sel(el), detail: attr + " points to a missing id " + id });
    return out;
  })()`);
};

export const focusOrder = async (page: Page, max = 120) => {
  await installAudit(page);
  await page.eval(`(() => { document.activeElement?.blur(); window.scrollTo(0, 0); const b = document.body; b.tabIndex = -1; b.focus(); b.removeAttribute("tabindex"); getSelection()?.removeAllRanges(); })()`);
  const seq: { sel: string; top: number; left: number; region: string; ring: string; ratio: number; el: number }[] = [];
  const seenEls = new Set<string>();
  for (let i = 0; i < max; i++) {
    await page.press("Tab");
    const s = await page.eval<null | { sel: string; top: number; left: number; region: string; ring: string; ratio: number; id: string }>(`(() => {
      const e = document.activeElement;
      if (!e || e === document.body || e === document.documentElement) return null;
      if (!e.__id) e.__id = "e" + (window.__ids = (window.__ids || 0) + 1);
      const r = e.getBoundingClientRect();
      const info = __a11y.focusInfo(e);
      const best = info.cands.length ? Math.max(...info.cands.map((c) => c.ratio)) : 0;
      const reg = e.closest("dialog, [role=dialog], [role=menu], aside, header, main, nav, [role=tabpanel], section");
      let off = scrollY;
      for (let a = e.parentElement; a; a = a.parentElement) off += a.scrollTop;
      return { sel: __a11y.sel(e), top: r.top + off, left: r.left, region: (__a11y.hasPositionedAncestor(e, ["fixed", "sticky"]) ? "sticky " : "") + (reg ? __a11y.sel(reg) : "body"), ring: info.cands.map((c) => c.kind + ":" + c.w + ":" + c.ratio.toFixed(2)).join(","), ratio: best, id: e.__id };
    })()`);
    if (!s) break;
    if (seenEls.has(s.id)) break;
    seenEls.add(s.id);
    seq.push({ ...s, el: i });
  }
  const missed = await page.eval<string[]>(`__a11y.interactive().filter((e) => e.tabIndex >= 0 && !e.__id && !e.closest("[inert]") && !e.matches("[role=tablist], [role=toolbar], [role=radiogroup]")).map((e) => __a11y.sel(e))`);
  return { seq, missed };
};

export const layoutFindings = async (page: Page): Promise<Finding[]> => {
  await installAudit(page);
  return page.eval<Finding[]>(`[...__a11y.clipped(), ...__a11y.overlaps(), ...(document.documentElement.scrollWidth > innerWidth + 1 ? [{ where: "page", detail: "the page is " + document.documentElement.scrollWidth + "px wide in " + innerWidth + "px" }] : [])]`);
};

export const targetFindings = async (page: Page, min = 24): Promise<Finding[]> => {
  await installAudit(page);
  return page.eval<Finding[]>(`__a11y.targets(${min})`);
};

export const motionFindings = async (page: Page): Promise<Finding[]> => {
  await installAudit(page);
  return page.eval<Finding[]>(`__a11y.motion()`);
};
