import { ExternalLinkIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button.tsx";

const MAX = 16;
const STEP = 60;
const MOVE: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

// Wheel or pinch zooms at the pointer, drag or the arrow keys move the image, double-click switches between fit and 100%.
export function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<{ scale: number; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const fit = () => {
    const b = box.current;
    if (!b || !nat.w) return 1;
    return Math.min(b.clientWidth / nat.w, b.clientHeight / nat.h, 1);
  };
  const cur = view ?? { scale: fit(), x: 0, y: 0 };

  const zoomTo = (scale: number, at?: { x: number; y: number }) => {
    const b = box.current!.getBoundingClientRect();
    const c = at ? { x: at.x - b.left - b.width / 2, y: at.y - b.top - b.height / 2 } : { x: 0, y: 0 };
    const next = Math.min(MAX, Math.max(fit() / 2, scale));
    const k = next / cur.scale;
    setView({ scale: next, x: c.x - (c.x - cur.x) * k, y: c.y - (c.y - cur.y) * k });
  };

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo(cur.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), { x: e.clientX, y: e.clientY });
    };
    b.addEventListener("wheel", onWheel, { passive: false });
    return () => b.removeEventListener("wheel", onWheel);
  });

  const pct = Math.round(cur.scale * 100);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        ref={box}
        tabIndex={0}
        role="group"
        aria-roledescription="image viewer"
        aria-label={`${alt || "Image"}. Arrow keys move the image. Plus and minus zoom. 0 fits the image, 1 shows 100%.`}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-lg bg-muted outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring"
        style={{ cursor: drag.current ? "grabbing" : "grab" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          drag.current = { x: e.clientX, y: e.clientY };
          setView({ ...cur, x: cur.x + e.clientX - d.x, y: cur.y + e.clientY - d.y });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={(e) => {
          const at = { x: e.clientX, y: e.clientY };
          if (Math.abs(cur.scale - 1) >= 0.01) return zoomTo(1, at);
          if (fit() < 0.99) return setView(null);
          zoomTo(2, at);
        }}
        onKeyDown={(e) => {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const move = MOVE[e.key];
          if (move) setView({ ...cur, x: cur.x + move[0] * STEP, y: cur.y + move[1] * STEP });
          else if (e.key === "+" || e.key === "=") zoomTo(cur.scale * 1.5);
          else if (e.key === "-") zoomTo(cur.scale / 1.5);
          else if (e.key === "0") setView(null);
          else if (e.key === "1") zoomTo(1);
          else return;
          e.preventDefault();
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="absolute top-1/2 left-1/2 max-w-none"
          style={{ width: nat.w || undefined, transform: `translate(-50%, -50%) translate(${cur.x}px, ${cur.y}px) scale(${cur.scale})`, imageRendering: cur.scale > 2 ? "pixelated" : "auto", visibility: nat.w ? "visible" : "hidden" }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => zoomTo(cur.scale / 1.5)}>
          <MinusIcon />
        </Button>
        <span className="w-12 text-center tabular-nums">{pct}%</span>
        <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => zoomTo(cur.scale * 1.5)}>
          <PlusIcon />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setView(null)}>
          Fit
        </Button>
        <Button variant="outline" size="sm" onClick={() => zoomTo(1)}>
          100%
        </Button>
        <span className="min-w-0 flex-1 truncate px-2">
          {alt}
          {nat.w ? ` · ${nat.w} × ${nat.h} px` : ""} · Scroll or + and − to zoom. Drag or the arrow keys move the image. Double-click for 100%.
        </span>
        <Button variant="ghost" size="sm" asChild>
          <a href={src} target="_blank" rel="noopener">
            <ExternalLinkIcon /> Open in a new tab
          </a>
        </Button>
      </div>
    </div>
  );
}
