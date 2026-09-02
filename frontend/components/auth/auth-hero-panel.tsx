"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Leaf, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDE_INTERVAL_MS = 5000;

export function AuthHeroPanel({
  images,
  badge,
  headline,
  subtext,
}: {
  images: string[];
  badge: string;
  headline: ReactNode;
  subtext: string;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground md:flex">
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="50vw"
          className={cn(
            "object-cover transition-opacity duration-1000 ease-in-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
        />
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklch, black 55%, transparent) 0%, color-mix(in oklch, black 10%, transparent) 35%, color-mix(in oklch, black 15%, transparent) 65%, color-mix(in oklch, black 75%, transparent) 100%)",
        }}
      />

      <Link href="/" className="relative z-10 flex items-center gap-2 text-lg font-bold">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
          <Leaf className="size-5" aria-hidden />
        </span>
        PalmGuard
      </Link>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <span className="flex w-fit items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium">
            <ScanLine className="size-3.5" aria-hidden />
            {badge}
          </span>
          <h2 className="text-3xl font-bold leading-tight">{headline}</h2>
          <p className="max-w-sm text-sm text-primary-foreground/80">{subtext}</p>
        </div>

        {images.length > 1 && (
          <div className="flex gap-1.5" role="tablist" aria-label="ภาพสไลด์">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`ภาพที่ ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === active ? "w-6 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
