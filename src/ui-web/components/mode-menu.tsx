import { ChevronDownIcon, EyeIcon, GraduationCapIcon, ListChecksIcon, MousePointerClickIcon } from "lucide-react";
import { post } from "../lib/api.ts";
import { Button } from "./ui/button.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "./ui/dropdown-menu.tsx";

export const MODES = [
  { id: "watch", name: "Watch", help: "The agent runs the steps.", icon: EyeIcon },
  { id: "follow", name: "Follow", help: "You run the steps.", icon: MousePointerClickIcon },
  { id: "teach", name: "Teach", help: "You work. The agent checks.", icon: GraduationCapIcon },
  { id: "plan", name: "Plan", help: "The agent plans only.", icon: ListChecksIcon },
];

export function ModeMenu({ mode }: { mode: string }) {
  const m = MODES.find((x) => x.id === mode) ?? MODES[0]!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full" aria-label={`Mode: ${m.name}`}>
          <m.icon className="text-muted-foreground" />
          <span className="text-muted-foreground">Mode</span>
          <span className="font-semibold">{m.name}</span>
          <ChevronDownIcon className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Who runs the steps</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={m.id} onValueChange={(v) => void post("api/mode", { mode: v })}>
          {MODES.map((x) => (
            <DropdownMenuRadioItem key={x.id} value={x.id} className="items-start">
              <span className="flex flex-col">
                <span className="font-medium">{x.name}</span>
                <span className="text-xs text-muted-foreground">{x.help}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
