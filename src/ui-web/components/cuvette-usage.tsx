import { DownloadIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { UsageReport } from "../../core/account.ts";
import { bridge, call, withT } from "../lib/api.ts";
import { dateText, groupUsage, tokensText, usd } from "../lib/usage.ts";
import { Button } from "./ui/button.tsx";

const DAY = 86_400_000;

export function CuvetteUsage() {
  const [report, setReport] = useState<UsageReport | null>(null);
  const [msg, setMsg] = useState("");
  const [range] = useState(() => ({ from: new Date(Date.now() - 30 * DAY).toISOString(), to: new Date().toISOString() }));

  useEffect(() => {
    call<UsageReport>("api/cuvette/usage", range)
      .then(setReport)
      .catch((e: Error) => setMsg(e.message));
  }, [range]);

  const exportCsv = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!bridge.saveFile) return;
    e.preventDefault();
    void bridge.saveFile(e.currentTarget.getAttribute("href")!, "cuvette-usage.csv");
  };

  const analyses = report ? groupUsage(report) : [];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-muted-foreground">The last 30 days. The cost is the list price of the tokens.</p>
        <Button asChild variant="outline" size="sm">
          <a href={withT(`api/cuvette/usage.csv?${new URLSearchParams(range)}`)} download="cuvette-usage.csv" onClick={exportCsv}>
            <DownloadIcon className="size-3.5" /> Export CSV
          </a>
        </Button>
      </div>
      {msg && <p role="alert" className="text-sm">{msg}</p>}
      {report && !analyses.length && <p className="text-sm text-muted-foreground">No analysis yet.</p>}
      {analyses.length > 0 && (
        <table className="w-full text-left text-[13px]">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">Date</th>
              <th className="py-1 pr-3 font-medium">Model</th>
              <th className="py-1 pr-3 font-medium">Tokens</th>
              <th className="py-1 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr key={a.key} className="border-t align-top">
                <td className="py-1 pr-3">{dateText(a.at)}</td>
                <td className="py-1 pr-3 font-mono text-xs">{a.models.join(", ")}</td>
                <td className="py-1 pr-3">{tokensText(a.inputTokens, a.outputTokens, a.cacheTokens)}</td>
                <td className="py-1 text-right tabular-nums">{usd(a.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
