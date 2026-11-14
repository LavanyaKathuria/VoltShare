"use client";

import { animate, motion, useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type SheetSnap = "peek" | "half" | "full";
const PEEK_PX = 132;

/** Google-Maps-style draggable sheet. Drag from the handle; content scrolls when expanded. */
export function BottomSheet({
  snap,
  onSnapChange,
  header,
  children,
}: {
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  header: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const y = useMotionValue(10_000);
  const controls = useDragControls();

  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = { full: 8, half: h * 0.48, peek: Math.max(0, h - PEEK_PX) };

  useEffect(() => {
    if (!h) return;
    animate(y, points[snap], { type: "spring", stiffness: 400, damping: 40 });
  }, [snap, h]); // eslint-disable-line react-hooks/exhaustive-deps

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = y.get() + info.velocity.y * 0.2;
    const best = (Object.keys(points) as SheetSnap[]).reduce((a, b) =>
      Math.abs(points[b] - projected) < Math.abs(points[a] - projected) ? b : a,
    );
    onSnapChange(best);
    animate(y, points[best], { type: "spring", stiffness: 400, damping: 40 });
  }

  return (
    <motion.div
      ref={ref}
      style={{ y, height: h ? h - 8 : "100%" }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: points.full, bottom: points.peek }}
      dragElastic={0.08}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      className="absolute inset-x-0 top-0 z-[500] flex flex-col rounded-t-3xl border-t border-line bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.12)]"
    >
      <div className="shrink-0 cursor-grab touch-none px-4 pb-2 pt-2.5 active:cursor-grabbing" onPointerDown={(e) => controls.start(e)}>
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300" />
        {header}
      </div>
      <div className={snap === "full" ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24" : "min-h-0 flex-1 overflow-hidden px-4"}>
        {children}
      </div>
    </motion.div>
  );
}
