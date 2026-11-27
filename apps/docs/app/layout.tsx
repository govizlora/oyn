import type { Metadata } from "next";
import { Header } from "../header";
import { SurfaceProvider } from "../surface-provider";
import { origin } from "../meta";
import "../site.css";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  icons: { icon: "/oyn.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SurfaceProvider>
          <Header />
          {children}
        </SurfaceProvider>
      </body>
    </html>
  );
}
