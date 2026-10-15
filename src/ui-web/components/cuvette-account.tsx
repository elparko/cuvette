import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { call } from "../lib/api.ts";
import { cn } from "../lib/utils.ts";
import { Button } from "./ui/button.tsx";

interface Account {
  hasToken: boolean;
  accountId?: string;
  balanceUsd?: number;
  notice: string;
  amounts: number[];
}

export function CuvetteAccount({ createLabel, onCreated }: { createLabel: string; onCreated?: () => void | Promise<void> }) {
  const [acc, setAcc] = useState<Account | null>(null);
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      setAcc(await call<Account>("api/cuvette", {}));
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setMsg("Making the account…");
    try {
      await call("api/firststart/cuvette", {});
      await load();
      await onCreated?.();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const buy = async () => {
    try {
      const r = await call<{ url: string }>("api/cuvette/buy", { amount });
      window.open(r.url, "_blank", "noopener,noreferrer");
      setMsg("The payment page is open. After you pay, select Refresh.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      {acc && <p className="text-[13px] text-muted-foreground">{acc.notice}</p>}
      {acc && !acc.hasToken && (
        <div>
          <Button onClick={create}>{createLabel}</Button>
        </div>
      )}
      {acc?.hasToken && (
        <>
          <p className="text-sm">
            Credit: <span className="font-semibold tabular-nums">{acc.balanceUsd === undefined ? "unknown" : `$${acc.balanceUsd.toFixed(2)}`}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Amount of credit" className="inline-flex rounded-lg bg-muted p-[3px]">
              {acc.amounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={a === amount}
                  onClick={() => setAmount(a)}
                  className={cn("h-7 rounded-md px-3 text-[13px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40", a === amount && "bg-card font-medium text-foreground shadow-sm")}
                >
                  ${a}
                </button>
              ))}
            </div>
            <Button onClick={buy}>Buy credit</Button>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCwIcon className="size-3.5" /> Refresh
            </Button>
          </div>
        </>
      )}
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
