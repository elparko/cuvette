import { describe, expect, test } from "vitest";
import { decodeKey, emptyEd, footerKeys, splitKeys,inputKeys, keyRows, layout, press, type Ed, type EdOut, type InputKeys } from "../src/tui/editor.ts";

function feed(style: InputKeys, keys: string[], start: string | Ed = "", width = 80) {
  let st = typeof start === "string" ? emptyEd(start) : start;
  const outs: EdOut[] = [];
  for (const k of keys) {
    const r = press(st, decodeKey(k), style, width);
    st = r.st;
    if (r.out) outs.push(r.out);
  }
  return { st, outs, text: st.text, cur: st.cur };
}

const at = (text: string, cur: number): Ed => ({ ...emptyEd(text), cur });
const chars = (s: string) => [...s];

describe("key decoding", () => {
  test.each([
    ["\x1bb", { key: "char", text: "b", alt: true }],
    ["\x1b\x7f", { key: "backspace", alt: true }],
    ["\x1b[1;3D", { key: "left", alt: true }],
    ["\x1b\x1b[D", { key: "left", alt: true }],
    ["\x1b[1;9C", { key: "right", cmd: true }],
    ["\x1b[3;3~", { key: "delete", alt: true }],
    ["\x1b[13;2u", { key: "enter", shift: true }],
    ["\x1b[127;3u", { key: "backspace", alt: true }],
    ["\x1b[97;5u", { key: "char", text: "a", ctrl: true }],
    ["\x1b[122;9u", { key: "char", text: "z", cmd: true }],
    ["\x1b[27u", { key: "escape" }],
    ["\x17", { key: "char", text: "w", ctrl: true }],
    ["\x1f", { key: "char", text: "_", ctrl: true }],
    ["\x1bOH", { key: "home" }],
    ["\x1b[Z", { key: "tab", shift: true }],
    ["é", { key: "char", text: "é" }],
    ["\x1b[97;5:3u", { key: "none" }],
  ])("%j", (seq, want) => {
    expect(decodeKey(seq)).toEqual(want);
  });
});

describe("mac style in each terminal", () => {
  const text = "hello brave world";
  test.each([
    ["Terminal.app, iTerm2 natural text editing, Ghostty", "\x1bb"],
    ["iTerm2 with Option as Esc+", "\x1b\x1b[D"],
    ["iTerm2 normal, WezTerm, VS Code, kitty", "\x1b[1;3D"],
    ["kitty protocol with all keys as codes", "\x1b[57417;3u"],
    ["Ctrl+Left", "\x1b[1;5D"],
  ])("Option+Left: %s", (_, seq) => {
    expect(feed("mac", [seq], text).cur).toBe(12);
  });

  test.each([
    ["Terminal.app, Ghostty", "\x1bf"],
    ["iTerm2 with Esc+", "\x1b\x1b[C"],
    ["xterm form", "\x1b[1;3C"],
  ])("Option+Right: %s", (_, seq) => {
    expect(feed("mac", [seq], at(text, 0)).cur).toBe(5);
  });

  test.each([
    ["ESC DEL: Option as Meta, Esc+, Ghostty, WezTerm, VS Code", "\x1b\x7f"],
    ["Ctrl+W: iTerm2 natural text editing", "\x17"],
    ["ESC Ctrl+H", "\x1b\b"],
    ["kitty protocol", "\x1b[127;3u"],
  ])("Option+Backspace: %s", (_, seq) => {
    expect(feed("mac", [seq], text).text).toBe("hello brave ");
  });

  test.each([
    ["ESC d", "\x1bd"],
    ["xterm form", "\x1b[3;3~"],
    ["iTerm2 with Esc+", "\x1b\x1b[3~"],
  ])("Fn+Option+Backspace: %s", (_, seq) => {
    expect(feed("mac", [seq], at(text, 0)).text).toBe(" brave world");
  });

  const two = "one\ntwo three";
  test.each([
    ["Ctrl+A: Ghostty, VS Code, iTerm2 natural text editing", "\x01"],
    ["Home", "\x1b[H"],
    ["Home in application mode", "\x1bOH"],
    ["Home as ESC [1~", "\x1b[1~"],
    ["Cmd+Left with kitty protocol", "\x1b[1;9D"],
  ])("Cmd+Left: %s", (_, seq) => {
    expect(feed("mac", [seq], two).cur).toBe(4);
  });

  test.each([
    ["Ctrl+E", "\x05"],
    ["End", "\x1b[F"],
    ["End in application mode", "\x1bOF"],
    ["End as ESC [4~", "\x1b[4~"],
    ["Cmd+Right with kitty protocol", "\x1b[1;9C"],
  ])("Cmd+Right: %s", (_, seq) => {
    expect(feed("mac", [seq], at(two, 0)).cur).toBe(3);
  });

  test.each([
    ["Ctrl+U: Ghostty, VS Code, iTerm2 natural text editing", "\x15"],
    ["kitty protocol", "\x1b[127;9u"],
  ])("Cmd+Backspace: %s", (_, seq) => {
    expect(feed("mac", [seq], two).text).toBe("one\n");
  });

  test.each([
    ["Shift+Enter with kitty protocol", "\x1b[13;2u"],
    ["Option+Enter as ESC CR", "\x1b\r"],
    ["Option+Enter with kitty protocol", "\x1b[13;3u"],
    ["line feed from a terminal key binding", "\n"],
  ])("new line: %s", (_, seq) => {
    const r = feed("mac", [...chars("ab"), seq, ...chars("cd")]);
    expect(r.text).toBe("ab\ncd");
    expect(r.outs).toEqual([]);
  });

  test("Enter sends; a backslash before Enter makes a new line", () => {
    expect(feed("mac", [...chars("ab"), "\r"]).outs).toEqual(["submit"]);
    const r = feed("mac", [...chars("ab\\"), "\r", ...chars("cd")]);
    expect(r.text).toBe("ab\ncd");
    expect(r.outs).toEqual([]);
  });

  test("Up and Down move between lines, then go to the past messages", () => {
    const r = feed("mac", ["\x1b[A"], "first line\nsecond");
    expect(r.cur).toBe(6);
    expect(feed("mac", ["\x1b[A", "\x1b[A"], "first line\nsecond").outs).toEqual(["up"]);
    expect(feed("mac", ["\x1b[B"], "first line\nsecond").outs).toEqual(["down"]);
    expect(feed("mac", ["\x1b[B"], at("first line\nsecond", 3)).cur).toBe(14);
  });

  test("Up and Down move through wrapped rows", () => {
    expect(layout("abcdefghij", 5).map((r) => [r.start, r.end])).toEqual([[0, 5], [5, 10], [10, 10]]);
    expect(feed("mac", ["\x1b[A"], "abcdefghij", 5).cur).toBe(5);
    expect(feed("mac", ["\x1b[A", "\x1b[A"], at("abcdefghij", 7), 5).cur).toBe(2);
  });

  test("Ctrl+Z and Cmd+Z undo one word at a time", () => {
    const typed = chars("ab cd");
    expect(feed("mac", [...typed, "\x1a"]).text).toBe("ab ");
    expect(feed("mac", [...typed, "\x1a", "\x1a"]).text).toBe("");
    expect(feed("mac", [...typed, "\x1b[122;9u", "\x1b[122;9u", "\x1b[122;9u"]).text).toBe("");
    expect(feed("mac", [...typed, "\x1b\x7f", "\x1a"]).text).toBe("ab cd");
  });

  test("Ctrl+K deletes to the line end and Ctrl+Y puts it back", () => {
    const r = feed("mac", ["\x0b"], at("keep this", 4));
    expect(r.text).toBe("keep");
    expect(feed("mac", ["\x0b", "\x01", "\x19"], at("keep this", 4)).text).toBe(" thiskeep");
  });

  test("Backspace and Delete delete before and after the cursor", () => {
    expect(feed("mac", ["\x7f"], at("abc", 2)).text).toBe("ac");
    expect(feed("mac", ["\x1b[3~"], at("abc", 2)).text).toBe("ab");
    expect(feed("mac", ["\x1b[D", "\x1b[D", "X"], "abc").text).toBe("aXbc");
  });

  test("Esc, Tab, Ctrl+C and Ctrl+O stay with the app", () => {
    expect(feed("mac", ["\x1b"], "abc").outs).toEqual(["escape"]);
    expect(feed("mac", ["\t", "\x03", "\x0f", "\x1b[Z"], "abc").text).toBe("abc");
  });

  test("a multi-line chunk is inserted as text and does not send", () => {
    const r = feed("mac", ["line one\rline two\r\nthree"]);
    expect(r.text).toBe("line one\nline two\nthree");
    expect(r.outs).toEqual([]);
  });
});

describe("emacs style", () => {
  const t = "foo-bar baz.qux";
  test("readline keys", () => {
    expect(feed("emacs", ["\x01"], t).cur).toBe(0);
    expect(feed("emacs", ["\x05"], at(t, 0)).cur).toBe(t.length);
    expect(feed("emacs", ["\x02"], t).cur).toBe(t.length - 1);
    expect(feed("emacs", ["\x06"], at(t, 0)).cur).toBe(1);
    expect(feed("emacs", ["\x0b"], at(t, 3)).text).toBe("foo");
    expect(feed("emacs", ["\x15"], at(t, 3)).text).toBe("-bar baz.qux");
    expect(feed("emacs", ["\x17"], t).text).toBe("foo-bar ");
    expect(feed("emacs", ["\x17", "\x19"], t).text).toBe(t);
    expect(feed("emacs", ["\x04"], at(t, 0)).text).toBe("oo-bar baz.qux");
  });

  test("Meta keys", () => {
    expect(feed("emacs", ["\x1bb"], t).cur).toBe(12);
    expect(feed("emacs", ["\x1bf"], at(t, 0)).cur).toBe(3);
    expect(feed("emacs", ["\x1bd"], at(t, 0)).text).toBe("-bar baz.qux");
    expect(feed("emacs", ["\x1b\x7f"], t).text).toBe("foo-bar baz.");
    expect(feed("emacs", [...chars("xy"), "\x1f"], t).text).toBe(t);
  });

  test("Alt+Enter makes a new line; Cmd keys from the kitty protocol do nothing", () => {
    expect(feed("emacs", ["\x1b\r"], "a").text).toBe("a\n");
    expect(feed("emacs", ["\x1b[1;9D", "\x1b[122;9u"], "abc")).toMatchObject({ text: "abc", cur: 3 });
  });
});

describe("vim style", () => {
  test("starts in insert mode; Esc goes to normal mode and does not stop the agent", () => {
    const r = feed("vim", [...chars("hello world"), "\x1b"]);
    expect(r.st.vim).toBe("normal");
    expect(r.cur).toBe(10);
    expect(r.outs).toEqual([]);
    expect(feed("vim", [...chars("hi"), "\x1b", "\x1b"]).outs).toEqual(["escape"]);
    expect(feed("vim", [...chars("hi"), "\x1b\x1b"]).outs).toEqual(["escape"]);
  });

  const normal = (text: string, cur = 0): Ed => ({ ...emptyEd(text), cur, vim: "normal" });

  test("motions", () => {
    const t = "hello big world";
    expect(feed("vim", ["w"], normal(t)).cur).toBe(6);
    expect(feed("vim", ["w", "w", "b"], normal(t)).cur).toBe(6);
    expect(feed("vim", ["$"], normal(t)).cur).toBe(14);
    expect(feed("vim", ["$", "0"], normal(t)).cur).toBe(0);
    expect(feed("vim", ["l", "l", "h"], normal(t)).cur).toBe(1);
    expect(feed("vim", ["j"], normal("ab\ncd", 1)).cur).toBe(4);
    expect(feed("vim", ["k"], normal("ab\ncd", 4)).cur).toBe(1);
    expect(feed("vim", ["k"], normal("ab\ncd", 1)).outs).toEqual(["up"]);
    expect(feed("vim", ["j"], normal("ab\ncd", 4)).outs).toEqual(["down"]);
  });

  test("x, dw, dd and u", () => {
    expect(feed("vim", ["x"], normal("abc")).text).toBe("bc");
    expect(feed("vim", ["d", "w"], normal("hello big world")).text).toBe("big world");
    expect(feed("vim", ["d", "d"], normal("one\ntwo\nthree", 5))).toMatchObject({ text: "one\nthree", cur: 4 });
    expect(feed("vim", ["d", "d"], normal("one\ntwo", 5))).toMatchObject({ text: "one", cur: 0 });
    expect(feed("vim", ["d", "d", "u"], normal("one\ntwo", 5)).text).toBe("one\ntwo");
    expect(feed("vim", ["d", "h"], normal("abc", 1)).text).toBe("abc");
  });

  test("i, a, A, I and o go to insert mode", () => {
    expect(feed("vim", ["i", "X"], normal("abc", 1)).text).toBe("aXbc");
    expect(feed("vim", ["a", "X"], normal("abc", 1)).text).toBe("abXc");
    expect(feed("vim", ["A", "X"], normal("abc", 1)).text).toBe("abcX");
    expect(feed("vim", ["I", "X"], normal("  abc", 3)).text).toBe("  Xabc");
    expect(feed("vim", ["o", "X"], normal("abc\ndef", 1)).text).toBe("abc\nX\ndef");
  });

  test("Enter sends from both modes and returns to insert mode", () => {
    const r = feed("vim", ["\r"], normal("abc"));
    expect(r.outs).toEqual(["submit"]);
    expect(r.st.vim).toBe("insert");
    expect(feed("vim", ["\r"], "abc").outs).toEqual(["submit"]);
    expect(feed("vim", ["\x1b[13;2u"], "abc").text).toBe("abc\n");
  });

  test("a typed chunk in normal mode runs as single keys", () => {
    expect(feed("vim", ["dd"], normal("abc")).text).toBe("");
  });
});

describe("help and footer", () => {
  test("each style lists its keys and the app keys", () => {
    for (const s of ["mac", "emacs", "vim", "classic"] as const) {
      const keys = keyRows(s).map((r) => r.keys);
      expect(keys).toContain("Shift+Tab");
      expect(keys).toContain("Ctrl+C twice");
    }
    expect(keyRows("mac").map((r) => r.keys)).toContain("Option+Backspace");
    expect(keyRows("vim")[0]!.keys).toBe("Esc (insert mode)");
  });

  test("the footer shows the vim mode and what Esc does", () => {
    expect(footerKeys("vim", "insert", true)).toBe("-- INSERT -- · Esc: normal mode · Esc again: stop the agent");
    expect(footerKeys("vim", "normal", true)).toBe("-- NORMAL -- · i: insert · Esc: stop the agent");
    expect(footerKeys("classic", "insert", false)).toBe("");
    expect(inputKeys("nonsense")).toBe("mac");
  });
});

describe("splitKeys and one-line fields", () => {
  test("a chunk with control keys splits into single keys, Enter too, because a paste comes as a bracketed paste; text and escape sequences stay whole", () => {
    expect(splitKeys("\x05\x15")).toEqual(["\x05", "\x15"]);
    expect(splitKeys("ab\x17cd")).toEqual(["ab", "\x17", "cd"]);
    expect(splitKeys("fast typing\r")).toEqual(["fast typing", "\r"]);
    expect(splitKeys("\x1b[127;3u")).toEqual(["\x1b[127;3u"]);
  });

  test("one-line mode: Enter submits even after a backslash; new-line keys and pasted breaks add no line", () => {
    const r = press(emptyEd("a\\"), decodeKey("\r"), "mac", 80, true);
    expect(r).toMatchObject({ out: "submit", st: { text: "a\\" } });
    expect(press(emptyEd("a"), decodeKey("\x1b[13;2u"), "mac", 80, true).st.text).toBe("a");
    expect(press(emptyEd("a"), { key: "text", text: "b\nc" }, "mac", 80, true).st.text).toBe("ab c");
    expect(press({ ...emptyEd("x"), vim: "normal", cur: 0 }, decodeKey("o"), "vim", 80, true).st.text).toBe("x");
  });
});
