import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { post } from "../lib/api.ts";
import { Button } from "./ui/button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu.tsx";

const MODELS = [
  { id: "claude-opus-5-5", name: "Opus 5.5", help: "Most capable" },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", help: "Balanced" },
  { id: "claude-haiku-5-5", name: "Haiku 5.5", help: "Fastest and cheapest" },
  { id: "claude-fable-5-1", name: "Fable 5.1", help: "" },
];

export function ModelMenu({ model, busy, openSettings }: { model: string; busy: boolean; openSettings: () => void }) {
  const current = MODELS.find((m) => model.includes(m.id));
  const change = async (id: string) => {
    const r = await post<{ text?: string }>("api/setting", { name: "model", value: `claude:${id}`, scope: "session" });
    if (r?.text) toast(r.text);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-0 shrink rounded-full" aria-label={`Model: ${current?.name ?? model}`}>
          <span className="text-muted-foreground">Model</span>
          <span className="min-w-0 truncate font-semibold">{current?.name ?? model}</span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{busy ? "Wait until the step ends" : "Next message. The new model reads the history again."}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current?.id ?? ""} onValueChange={(v) => void change(v)}>
          {MODELS.map((m) => (
            <DropdownMenuRadioItem key={m.id} value={m.id} disabled={busy}>
              <span className="flex-1 font-medium">{m.name}</span>
              {m.help && <span className="text-xs text-muted-foreground">{m.help}</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openSettings}>Other models and effort…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
