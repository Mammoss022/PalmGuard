"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} จาก 5 ดาว`}
            onClick={() => onChange(score)}
            className="p-1"
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                score <= value ? "fill-warning text-warning" : "fill-none text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
