import { describe, expect, test } from "vitest";

import { CHROME, type Page } from "./chrome.ts";

import { LONG, until, useApp, wait } from "./a11y-app.ts";

const a = useApp();
const page = new Proxy({} as Page, { get: (_, k) => (a.page as any)[k] });

describe.skipIf(!CHROME)("accessibility of the browser app: the pages and the dialogs", () => {
  const { setView, frames, post, freshFolder, openSession, goPage, programsPage, sendStream, showCards, numbered, everywhere, audit, orderProblems, pointerOpen, contextOpen, trapCheck } = a;
  test("the sessions, programs and settings pages: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    for (const name of ["Sessions", "Programs", "Settings"]) {
      await setView(1280, "light");
      if (name === "Programs") await programsPage();
      else await goPage(name);
      await wait(300);
      out.push(...(await audit("page " + name)));
    }
    const sections = await page.eval<string[]>(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].map((b) => b.textContent)`);
    expect(sections.length).toBeGreaterThan(3);
    for (const sec of sections) {
      await setView(1280, "light");
      await page.eval(`[...document.querySelectorAll('nav[aria-label="Setting sections"] button')].find((b) => b.textContent === ${JSON.stringify(sec)}).click()`);
      await wait(300);
      out.push(...(await audit("settings " + sec)));
    }
    expect(out).toEqual([]);
  }, LONG);

  test("the dialogs, the tooltip, the toast and the command list: contrast, names and headings", async () => {
    await openSession();
    const out: string[] = [];
    const recent = "aside [data-rove]";
    const closeDialog = async () => {
      await page.press("Escape");
      expect(await until(page, `!document.querySelector('[role="dialog"]')`)).toBe(true);
    };
    await contextOpen(recent);
    expect(await until(page, `document.querySelector('[role="menu"]')`)).toBe(true);
    out.push(...(await audit("session menu")));
    await page.eval(`[...document.querySelectorAll('[role="menuitem"]')].find((x) => x.textContent.includes("Rename")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(300);
    out.push(...(await audit("rename dialog")));
    await closeDialog();

    await page.eval(`(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 30;
      c.getContext("2d").fillRect(0, 0, 40, 30);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.dataset.full = c.toDataURL();
      b.title = "small.png";
      b.innerHTML = '<img alt="small.png" width="40" height="30" src="' + c.toDataURL() + '">';
      document.querySelector('[role="log"]').appendChild(b);
      b.click();
    })()`);
    expect(await until(page, `document.querySelector('[role="dialog"] img')?.naturalWidth > 0`)).toBe(true);
    await wait(300);
    out.push(...(await audit("image viewer")));
    await closeDialog();

    await setView(1280, "light");
    await page.eval(`[...document.querySelectorAll("button")].find((b) => b.offsetParent && b.textContent.includes("Open a folder")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await closeDialog();

    await programsPage();
    await page.eval(`[...document.querySelectorAll("main button")].find((b) => b.textContent.includes("Add an adapter")).click()`);
    expect(await until(page, `document.querySelector('[role="dialog"]')`)).toBe(true);
    await wait(300);
    out.push(...(await audit("add an adapter dialog")));
    await closeDialog();
    await goPage("Analysis");

    await setView(1280, "light");
    await page.eval(`document.querySelector('aside button[aria-label="Hide the sidebar"]').focus()`);
    expect(await until(page, `document.querySelector('[role="tooltip"]')`)).toBe(true);
    out.push(...(await audit("tooltip")));
    await page.eval(`document.activeElement.blur()`);

    await page.eval(`window.toast("A notice for the scientist")`);
    expect(await until(page, `document.querySelector("[data-sonner-toast]")`)).toBe(true);
    out.push(...(await audit("toast")));

    await page.eval(`(() => { const ta = document.querySelector("#msg"); ta.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), "value").set.call(ta, "/"); ta.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    expect(await until(page, `document.querySelector("#cmd-list")`)).toBe(true);
    out.push(...(await audit("command list")));
    expect(out).toEqual([]);
  }, LONG);
});
