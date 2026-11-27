"use client";
import type { ReactNode } from "react";
import { ceramic, useMaterial } from "@oyn/react";

export function Recess({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useMaterial({ material: ceramic, props: { elevation: -2 } });
  return (
    <div
      ref={ref}
      className={`min-w-0 rounded-(--oyn-surface-radius) bg-current/5 data-oyn-active:bg-transparent ${className}`}
      data-oyn-recess=""
    >
      {children}
    </div>
  );
}
