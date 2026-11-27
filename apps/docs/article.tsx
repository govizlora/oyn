import type { ReactNode } from "react";

export function Article({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto mt-12 mb-20 box-border w-[calc(100%-2.5rem)] min-w-0 max-w-[640px] leading-relaxed sm:mt-20 [&>h1]:m-0 [&>h1]:mb-6 [&>h1]:text-4xl sm:[&>h1]:text-5xl [&>h1]:font-medium [&>h1]:tracking-tight [&>h2]:mt-9 [&>h2]:mb-2 [&>h2]:text-xl [&>h2]:font-medium [&>p]:my-3 [&_a]:text-inherit [&_a]:underline-offset-4">
      {children}
    </main>
  );
}
