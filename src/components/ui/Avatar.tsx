import { cn } from "@/lib/cn";

export function Avatar({ name, photo, size = 32, className }: { name?: string | null; photo?: string | null; size?: number; className?: string }) {
  const initials = (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  if (photo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" width={size} height={size} referrerPolicy="no-referrer" className={cn("rounded-full object-cover", className)} style={{ width: size, height: size }} />;
  return (
    <span
      className={cn("grid place-items-center rounded-full bg-brand-gradient font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
