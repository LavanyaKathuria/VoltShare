"use client";

import { ChargerPhoto } from "@/components/explore/ChargerPhoto";
import { cn } from "@/lib/cn";

export function Gallery({ photos, title }: { photos: string[]; title: string }) {
  const p = photos.length ? photos : [""];
  return (
    <>
      {/* Mobile: swipeable strip */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 sm:hidden [scrollbar-width:none]">
        {p.map((src, i) => (
          <ChargerPhoto key={i} src={src} alt={`${title} photo ${i + 1}`} className="aspect-[4/3] w-[86%] shrink-0 snap-center rounded-2xl" />
        ))}
      </div>
      {/* Desktop: Airbnb mosaic */}
      <div className={cn("hidden gap-2 overflow-hidden rounded-2xl sm:grid", p.length > 1 ? "h-[380px] grid-cols-4 grid-rows-2" : "h-[380px]")}>
        <ChargerPhoto src={p[0]} alt={title} className={cn("h-full w-full", p.length > 1 && "col-span-2 row-span-2")} />
        {p.slice(1, 5).map((src, i) => (
          <ChargerPhoto
            key={i}
            src={src}
            alt={`${title} photo ${i + 2}`}
            className={cn("h-full w-full", p.length === 2 && "col-span-2 row-span-2", p.length === 3 && "col-span-2")}
          />
        ))}
      </div>
    </>
  );
}
