import { ArrowRightIcon, MoonIcon, ShieldCheckIcon } from "lucide-react";
import { useState } from "react";
import type { AppCtx } from "../App.tsx";
import { FolderChooser } from "../components/folder-chooser.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { askNotify, post } from "../lib/api.ts";
import { SessionGrid, type Sessions } from "./sessions.tsx";

export async function runSample(ctx: AppCtx) {
  askNotify();
  const r = await post("api/open", { sample: true });
  if (r) ctx.opened();
  return !!r;
}

export function StartPage({ ctx, sessions }: { ctx: AppCtx; sessions: Sessions }) {
  const [busy, setBusy] = useState(false);
  const s = ctx.state;
  const recent = sessions.list.filter((x) => !x.moved).slice(0, 6);
  const note = s.opening ? "Opening the session…" : s.error;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Analyze your data</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">Choose the folder that holds your data. Cuvette does not change your files. It writes the results to a new folder inside it.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4 text-ok" /> Your files stay as they are
            </div>
            <FolderChooser start={s.folder || s.start} onOpened={ctx.opened} big />
            {note && (
              <p className="text-sm text-bad" role="alert">
                {note}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-muted">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MoonIcon className="size-4 text-accent-brand" /> No data ready? Try the sample
            </div>
            <p className="text-sm text-muted-foreground">The sample is a sleep study: 10 patients, two drugs, hours of extra sleep. It takes about 2 minutes.</p>
            <Button
              variant="outline"
              className="mt-auto self-start"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (!(await runSample(ctx))) setBusy(false);
              }}
            >
              Run the sample analysis <ArrowRightIcon />
            </Button>
          </CardContent>
        </Card>
      </div>

      {recent.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent sessions</h2>
            <Button variant="link" onClick={() => ctx.go("sessions")}>
              Show all sessions
            </Button>
          </div>
          <SessionGrid list={recent} onOpen={(id) => sessions.open(id, ctx.opened)} />
        </section>
      )}
    </div>
  );
}
