"use client";

import { useRef } from "react";

export function PinInput({ value, onChange, length = 4 }: { value: string; onChange: (v: string) => void; length?: number }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  return (
    <div className="flex justify-center gap-2.5" role="group" aria-label="Check-in PIN">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`PIN digit ${i + 1}`}
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => {
            const digit = e.target.value.replace(/\D/g, "").slice(-1);
            const next = (value.slice(0, i) + digit + value.slice(i + 1)).slice(0, length);
            onChange(next);
            if (digit) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (p) {
              e.preventDefault();
              onChange(p);
              refs.current[Math.min(p.length, length - 1)]?.focus();
            }
          }}
          className="num h-14 w-12 rounded-xl border border-line bg-white text-center text-2xl outline-none transition focus:border-sky focus:ring-4 focus:ring-sky-tint"
        />
      ))}
    </div>
  );
}
