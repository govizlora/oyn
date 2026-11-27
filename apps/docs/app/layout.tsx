import "./globals.css";
import type { Metadata } from "next";
import { Header } from "../header";
import { SurfaceProvider } from "../surface-provider";
import { origin } from "../meta";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  icons: { icon: "/oyn.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className="pointer-coarse:overscroll-none scheme-light bg-neutral-100 font-sans text-neutral-900 dark:scheme-dark dark:bg-neutral-950 dark:text-neutral-100 antialiased"
      lang="en"
    >
      <body className="m-0 flex min-h-svh flex-col">
        <SurfaceProvider>
          <Header />
          {children}
        </SurfaceProvider>
      </body>
    </html>
  );
}
