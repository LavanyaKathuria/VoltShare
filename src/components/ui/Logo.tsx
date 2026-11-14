import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="vs-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#vs-g)" />
      <path d="M17.5 6 9.5 18h6l-1 8 8-12h-6l1-8Z" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight">
        Volt<span className="text-brand-gradient">Share</span>
      </span>
    </Link>
  );
}
