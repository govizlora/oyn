"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/oyn/button";
import { ThemeSwitch } from "./theme-switch";

const xProfile = "https://x.com/Govizlora";
const profiles = [
  {
    name: "GitHub",
    label: "OYN GitHub repository",
    href: "https://github.com/govizlora/oyn",
    path: "M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.97 0 0 .94-.3 3.1 1.16a10.8 10.8 0 0 1 5.64 0c2.15-1.46 3.09-1.16 3.09-1.16.61 1.55.23 2.69.11 2.97.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z",
  },
  {
    name: "X",
    label: "X profile",
    href: xProfile,
    path: "M18.9 2h3.3l-7.2 8.25L23.5 22h-6.65l-5.2-6.8L5.7 22H2.4l7.7-8.83L.6 2h6.82l4.7 6.23L18.9 2Zm-1.16 17.92h1.83L6.43 3.97H4.47l13.27 15.95Z",
  },
  {
    name: "Twitter",
    label: "Twitter profile",
    href: xProfile,
    path: "M23.95 4.57a10 10 0 0 1-2.83.78 4.93 4.93 0 0 0 2.16-2.72 9.97 9.97 0 0 1-3.13 1.2 4.92 4.92 0 0 0-8.39 4.49A13.98 13.98 0 0 1 1.61 3.18a4.92 4.92 0 0 0 1.52 6.57 4.9 4.9 0 0 1-2.23-.62v.06a4.92 4.92 0 0 0 3.95 4.83 4.97 4.97 0 0 1-2.22.08 4.93 4.93 0 0 0 4.6 3.42A9.87 9.87 0 0 1 0 19.56a13.92 13.92 0 0 0 7.55 2.21c9.06 0 14.01-7.5 14.01-14.01l-.02-.64a10 10 0 0 0 2.46-2.55Z",
  },
];

export function Header() {
  const path = usePathname();
  return (
    <header className="mx-auto flex flex-wrap min-h-16 w-full max-w-6xl box-border items-center justify-between gap-2 px-3 text-sm sm:min-h-20 sm:px-10">
      <nav
        aria-label="Main navigation"
        className="flex items-center gap-1 sm:gap-2"
      >
        <Link
          href="/"
          aria-label="OYN home"
          className="mr-2 block h-4 w-10 bg-current text-inherit mask-[url(/oyn.svg)] mask-contain mask-center mask-no-repeat sm:mr-4"
        />
        {[
          ["Docs", "/docs/"],
          ["Components", "/docs/components/"],
        ].map(([label, href]) => {
          const current =
            path === href
              ? "page"
              : href === "/docs/components/" && path.startsWith(href)
                ? "location"
                : undefined;
          return (
            <Button
              key={href}
              variant="ghost"
              render={<Link href={href} />}
              aria-current={current}
              className="px-2 py-1.5 text-neutral-600 dark:text-neutral-400 aria-[current]:font-semibold aria-[current]:text-inherit"
            >
              {label}
            </Button>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitch />
        <nav aria-label="Project links" className="flex items-center">
          {profiles.map(({ name, label, href, path }) => (
            <Button
              key={name}
              variant="ghost"
              render={<a href={href} />}
              aria-label={label}
              className="p-1.5"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
                <path d={path} />
              </svg>
              <span className="hidden sm:inline">{name}</span>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
}
