import { cn } from "@/lib/cn";
import { PlugZap } from "lucide-react";

export function ChargerPhoto({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src)
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-sky-tint to-mint", className)}>
        <PlugZap className="h-8 w-8 text-sky/60" />
      </div>
    );
  // Plain <img>: sources are Firebase Storage URLs or bundled demo art; both are already sized.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
