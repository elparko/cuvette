(() => {
  if (window.cuvetteDesktop) return;
  const invoke = (cmd, args, opts) => window.__TAURI_INTERNALS__.invoke(cmd, args, opts);
  const token = () => new URLSearchParams(location.search).get("t") || "";
  const withT = (p) => p + "?t=" + encodeURIComponent(token());
  const say = (text) => (typeof toast === "function" ? toast(text) : console.log(text));
  window.cuvetteDesktop = {
    chooseFolder: (start) => invoke("choose_folder", { start: start || null }),
    reveal: (path) => invoke("reveal", { path: String(path) }),
    notify: (title, body) => invoke("notify", { title: String(title || "Cuvette"), body: String(body || "") }).catch(() => {}),
    saveFile: async (url, name) => {
      try {
        const r = await fetch(url, { headers: { "x-token": token() } });
        if (!r.ok) throw new Error("The file did not load: HTTP " + r.status);
        const data = new Uint8Array(await r.arrayBuffer());
        const saved = await invoke("save_file", data, { headers: { "x-name": encodeURIComponent(name || "file") } });
        if (saved) say("Saved " + saved);
        return saved;
      } catch (e) {
        say(e.message || String(e));
        return null;
      }
    },
    open: async (folder) => {
      try {
        const s = await (await fetch(withT("api/state"))).json();
        if (s.setup) return say("Finish the first start. Then open " + folder + ".");
        const r = await fetch(withT("api/open"), { method: "POST", headers: { "content-type": "application/json", "x-token": token() }, body: JSON.stringify({ folder }) });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "HTTP " + r.status);
        try { page = "session"; } catch (e) {}
        if (typeof boot === "function") setTimeout(boot, 300);
        else location.reload();
      } catch (e) {
        say(e.message || String(e));
      }
    },
    page: (name) => {
      if (typeof show === "function") show(name);
    },
  };
})();
