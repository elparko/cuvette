import React, { createContext, useEffect, useRef, useState } from "react";
import { Box, Text, useBoxMetrics, useInput, type DOMElement } from "ink";

export const CardRows = createContext(Infinity);

export function Fit(props: { max: number; head: React.ReactNode; tail?: React.ReactNode; arrows?: boolean; follow?: number }) {
  const { max } = props;
  const bounded = Number.isFinite(max);
  const bodyRef = useRef<DOMElement>(null);
  const tailRef = useRef<DOMElement>(null);
  const body = useBoxMetrics(bodyRef);
  const tail = useBoxMetrics(tailRef);
  const [top, setTop] = useState(0);
  const tailMax = Math.max(1, max - 2);
  const tailH = props.tail ? Math.min(tail.hasMeasured ? tail.height : 1, tailMax) : 0;
  const room = Math.max(1, max - tailH);
  const fits = !bounded || !body.hasMeasured || body.height <= room;
  const view = Math.max(1, room - 1);
  const maxTop = Math.max(0, body.height - view);
  const at = Math.min(top, maxTop);
  const arrows = props.arrows !== false;

  useEffect(() => {
    const f = props.follow;
    if (f === undefined || fits) return;
    if (f < top) setTop(f);
    else if (f >= top + view) setTop(f - view + 1);
  }, [props.follow, fits, view, top]);

  useInput(
    (_, key) => {
      const page = Math.max(1, view - 1);
      if (key.pageDown || (arrows && key.downArrow)) setTop(Math.min(maxTop, at + (key.pageDown ? page : 1)));
      else if (key.pageUp || (arrows && key.upArrow)) setTop(Math.max(0, at - (key.pageUp ? page : 1)));
    },
    { isActive: bounded && !fits },
  );

  const tailClipped = bounded && tail.hasMeasured && tail.height > tailMax;
  const keys = arrows ? "↑↓ PgUp PgDn scroll" : "PgUp PgDn scroll";
  return (
    <Box flexDirection="column" overflowY="hidden" maxHeight={bounded ? Math.max(1, max) : undefined}>
      <Box flexDirection="column" overflowY="hidden" height={fits ? undefined : view} contentOffsetY={fits ? 0 : at}>
        <Box ref={bodyRef} flexDirection="column" flexShrink={0}>
          {props.head}
        </Box>
      </Box>
      {fits ? null : (
        <Text dimColor wrap="truncate-end">
          {`${keys} · lines ${at + 1}–${Math.min(body.height, at + view)} of ${body.height || "?"}`}
        </Text>
      )}
      {props.tail ? (
        <Box flexDirection="column" overflowY="hidden" height={tailClipped ? tailMax : undefined} justifyContent="flex-end">
          <Box ref={tailRef} flexDirection="column" flexShrink={0}>
            {props.tail}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

export function Last(props: { max: number; children: React.ReactNode }) {
  return (
    <Box flexDirection="column" overflowY="hidden" maxHeight={Math.max(0, props.max)} justifyContent="flex-end">
      <Box flexDirection="column" flexShrink={0}>
        {props.children}
      </Box>
    </Box>
  );
}
