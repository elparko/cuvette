import json
import os
import sys
import urllib.error
import urllib.request
from html import escape
from urllib.parse import urlsplit

from PySide6 import QtCore, QtWidgets

MODES = ["watch", "follow", "teach", "plan"]


class Signals(QtCore.QObject):
    done = QtCore.Signal(object, object)


class Job(QtCore.QRunnable):
    def __init__(self, base, token, path, body, callback):
        super().__init__()
        self.base, self.token, self.path, self.body = base, token, path, body
        self.signals = Signals()
        self.signals.done.connect(callback)

    def emit(self, code, data):
        try:
            self.signals.done.emit(code, data)
        except RuntimeError:
            pass

    def run(self):
        sep = "&" if "?" in self.path else "?"
        url = f"{self.base}{self.path}{sep}t={self.token}"
        data = None if self.body is None else json.dumps(self.body).encode()
        req = urllib.request.Request(url, data=data, method="GET" if data is None else "POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                self.emit(r.status, json.loads(r.read() or b"{}"))
        except urllib.error.HTTPError as e:
            self.emit(e.code, None)
        except Exception:
            self.emit(0, None)


class Panel(QtWidgets.QDockWidget):
    def __init__(self, url, parent):
        super().__init__("Guided analysis", parent)
        parts = urlsplit(url)
        self.base = f"{parts.scheme}://{parts.netloc}"
        self.token = dict(p.split("=", 1) for p in parts.query.split("&") if "=" in p).get("t", "")
        self.since = 0
        self.card_sig = ""
        self.polling = False
        self.pool = QtCore.QThreadPool.globalInstance()

        body = QtWidgets.QWidget()
        lay = QtWidgets.QVBoxLayout(body)
        lay.setContentsMargins(6, 6, 6, 6)

        top = QtWidgets.QHBoxLayout()
        self.status = QtWidgets.QLabel("Connecting")
        self.mode = QtWidgets.QComboBox()
        self.mode.addItems(MODES)
        self.mode.activated.connect(lambda _: self.post("/api/mode", {"mode": self.mode.currentText()}))
        top.addWidget(self.status, 1)
        top.addWidget(QtWidgets.QLabel("Mode"))
        top.addWidget(self.mode)
        lay.addLayout(top)

        self.log = QtWidgets.QTextBrowser()
        self.log.setOpenExternalLinks(False)
        lay.addWidget(self.log, 1)

        self.cards = QtWidgets.QVBoxLayout()
        holder = QtWidgets.QWidget()
        holder.setLayout(self.cards)
        scroll = QtWidgets.QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(holder)
        scroll.setMaximumHeight(280)
        self.card_scroll = scroll
        scroll.hide()
        lay.addWidget(scroll)

        row = QtWidgets.QHBoxLayout()
        self.input = QtWidgets.QLineEdit()
        self.input.setPlaceholderText("Ask the agent")
        self.input.returnPressed.connect(self.send)
        send = QtWidgets.QPushButton("Send")
        send.clicked.connect(self.send)
        stop = QtWidgets.QPushButton("Stop")
        stop.clicked.connect(lambda: self.post("/api/stop", {}))
        row.addWidget(self.input, 1)
        row.addWidget(send)
        row.addWidget(stop)
        lay.addLayout(row)

        self.setWidget(body)
        self.setMinimumWidth(340)
        self.timer = QtCore.QTimer(self)
        self.timer.timeout.connect(self.poll)
        self.timer.start(1000)
        self.poll()

    def post(self, path, body, then=None):
        job = Job(self.base, self.token, path, body, then or (lambda *_: None))
        self.pool.start(job)

    def poll(self):
        if self.polling:
            return
        self.polling = True
        self.pool.start(Job(self.base, self.token, f"/api/feed?since={self.since}", None, self.on_feed))

    def send(self):
        text = self.input.text().strip()
        if not text:
            return

        def done(code, _):
            if code == 409:
                self.line("The agent is busy. Wait or press Stop.", "#c0392b")
            elif code == 200:
                self.input.clear()

        self.post("/api/send", {"text": text}, done)

    def line(self, text, color=None, italic=False, indent=False):
        t = escape(text).replace("\n", "<br>")
        style = ("color:%s;" % color if color else "") + ("font-style:italic;" if italic else "")
        pad = "&nbsp;&nbsp;&nbsp;" if indent else ""
        self.log.append(f'<p style="margin:2px 0;{style}">{pad}{t}</p>')

    def on_feed(self, code, feed):
        self.polling = False
        if code != 200 or feed is None:
            self.status.setText("Disconnected")
            return
        for e in feed["entries"]:
            self.add_entry(e)
        self.since = feed["next"]
        self.status.setText("Working" if feed["busy"] else "Ready")
        if not self.mode.view().isVisible():
            self.mode.setCurrentText(feed["mode"])
        self.draw_cards(feed)

    def add_entry(self, e):
        k = e["kind"]
        if k == "user":
            self.line("You: " + e["text"], "#2f6fdb")
        elif k == "assistant":
            self.line(e["text"])
        elif k == "tool_result":
            self.line(("Step: " if e["ok"] else "Failed: ") + e["text"], None if e["ok"] else "#c0392b")
            if e.get("route"):
                self.line("By hand: " + e["route"], "#888888", indent=True)
        elif k == "notice":
            self.line(e["text"], "#888888", italic=True)
        elif k == "error":
            self.line(e["text"], "#c0392b")
        elif k == "question":
            self.line("Question: " + e["title"], "#888888", italic=True)
        elif k == "answer":
            self.line("Answer: " + e["text"], "#888888", italic=True)
        elif k == "follow_step" and e["status"] != "waiting":
            self.line(f"Step {e['step']}: {e['status']}", "#888888", italic=True)
        elif k == "permission":
            self.line("Permission: " + e["text"], "#888888", italic=True)

    def clear_cards(self):
        while self.cards.count():
            w = self.cards.takeAt(0).widget()
            if w:
                w.deleteLater()

    def card(self, title, text, evidence=None):
        box = QtWidgets.QGroupBox(title)
        lay = QtWidgets.QVBoxLayout(box)
        if text:
            label = QtWidgets.QLabel(text)
            label.setWordWrap(True)
            lay.addWidget(label)
        if evidence:
            ev = QtWidgets.QPlainTextEdit(evidence)
            ev.setReadOnly(True)
            ev.setLineWrapMode(QtWidgets.QPlainTextEdit.NoWrap)
            ev.setStyleSheet("font-family: Menlo, Consolas, monospace;")
            ev.setMaximumHeight(110)
            lay.addWidget(ev)
        self.cards.addWidget(box)
        return lay

    def draw_cards(self, feed):
        sig = json.dumps([feed["openQuestions"], feed["pendingPermissions"], feed["pendingFollow"]], sort_keys=True)
        if sig == self.card_sig:
            return
        self.card_sig = sig
        self.clear_cards()
        for q in feed["openQuestions"]:
            lay = self.card(q["title"], q["text"], q.get("evidence"))
            rec = q.get("recommendation")
            for o in q["options"]:
                is_rec = rec is not None and rec["value"] == o["value"]
                b = QtWidgets.QPushButton(o["label"] + (" (recommended)" if is_rec else ""))
                b.clicked.connect(lambda _=False, qid=q["qid"], v=o["value"]: self.post("/api/answer", {"qid": qid, "value": v}))
                lay.addWidget(b)
            if rec:
                why = QtWidgets.QLabel("Recommended: " + str(rec.get("reason", "")))
                why.setWordWrap(True)
                lay.addWidget(why)
        for p in feed["pendingPermissions"]:
            lay = self.card(f"Allow {p['tool']}?", p.get("touches"), p.get("code"))
            row = QtWidgets.QHBoxLayout()
            for label, ok in (("Allow", True), ("Deny", False)):
                b = QtWidgets.QPushButton(label)
                b.clicked.connect(lambda _=False, rid=p["rid"], ok=ok: self.post("/api/permission", {"rid": rid, "ok": ok}))
                row.addWidget(b)
            lay.addLayout(row)
        for s in feed["pendingFollow"]:
            lay = self.card(f"Step {s['step']}: do this by hand", s["text"])
            note = QtWidgets.QLineEdit()
            note.setPlaceholderText("Numbers you got (optional)")
            lay.addWidget(note)
            row = QtWidgets.QHBoxLayout()
            done = QtWidgets.QPushButton("Done")
            done.clicked.connect(lambda _=False, st=s["step"], n=note: self.post("/api/follow", {"step": st, "note": n.text()}))
            agent = QtWidgets.QPushButton("Let the agent do it")
            agent.clicked.connect(lambda _=False, st=s["step"]: self.post("/api/follow", {"step": st, "agentDoes": True}))
            row.addWidget(done)
            row.addWidget(agent)
            lay.addLayout(row)
        self.card_scroll.setVisible(self.cards.count() > 0)


def main():
    url = sys.argv[1]
    open_path = sys.argv[2] if len(sys.argv) > 2 else None
    from smile_msi.gui import main as gui

    original = gui.MainWindow.__init__

    def init(self, *a, **kw):
        original(self, *a, **kw)
        self._ga_panel = Panel(url, self)
        self.addDockWidget(QtCore.Qt.RightDockWidgetArea, self._ga_panel)
        snap = os.environ.get("GA_PANEL_SNAPSHOT")
        if snap:
            QtCore.QTimer.singleShot(int(os.environ.get("GA_PANEL_SNAPSHOT_MS", "12000")), lambda: (self.grab().save(snap), QtWidgets.QApplication.quit()))

    gui.MainWindow.__init__ = init
    sys.exit(gui.run(argv=[sys.argv[0]], open_path=open_path))


if __name__ == "__main__":
    main()
