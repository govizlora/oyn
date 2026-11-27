import type { Metadata } from "next";

export const origin = "https://oyn.dev";
export function pageMeta(
  title: string,
  description: string,
  path: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "OYN",
      type: "website",
      images: [
        {
          url: "/oyn-preview.png",
          width: 1280,
          height: 640,
          alt: "Ceramic Tabs on a dark surface",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@Govizlora",
      title,
      description,
      images: ["/oyn-preview.png"],
    },
  };
}
