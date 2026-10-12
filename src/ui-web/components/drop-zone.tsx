import { FolderInputIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { dropFolder } from "../lib/drop.ts";

export function DropZone({ choose, disabled, browserHint, children }: { choose: (folder: string) => void; disabled?: boolean; browserHint: string; children: ReactNode }) {
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const drag = (e: Event) => setOver((e as CustomEvent<string>).detail === "enter");
    const drop = (e: Event) => {
      setOver(false);
      const folder = dropFolder((e as CustomEvent).detail);
      if (!folder) return setMsg("Cuvette could not read the path of the dropped item.");
      setMsg("");
      if (!disabled) choose(folder);
    };
    window.addEventListener("cuvette-drag", drag);
    window.addEventListener("cuvette-drop", drop);
    return () => {
      window.removeEventListener("cuvette-drag", drag);
      window.removeEventListener("cuvette-drop", drop);
    };
  }, [choose, disabled]);

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <div
      className="relative flex flex-col gap-3"
      onDragEnter={(e) => hasFiles(e) && setOver(true)}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setOver(false);
        const name = e.dataTransfer.items[0]?.webkitGetAsEntry?.()?.name;
        setMsg(`${name ? `Your browser does not give the path of "${name}".` : "Your browser does not give the path of the dropped item."} ${browserHint}`);
      }}
    >
      {children}
      {msg && <p role="alert" className="text-sm text-bad">{msg}</p>}
      {over && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent-brand bg-card/90 text-sm font-medium" role="status">
          <FolderInputIcon className="size-5 text-accent-brand" /> Drop a folder to open it
        </div>
      )}
    </div>
  );
}
