import { FilmTabs } from "../FilmTabs";
import { pageMeta } from "../meta";
export const metadata = pageMeta(
  "OYN — Native HTML UI with GPU-rendered materials",
  "OYN brings WebGPU materials to native HTML elements. The DOM handles layout and interaction while WebGPU renders the surfaces.",
  "/",
);
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: "OYN",
            url: "https://oyn.dev/",
            description: metadata.description,
            codeRepository: "https://github.com/govizlora/oyn",
            programmingLanguage: "TypeScript",
            runtimePlatform: "Web browser",
            image: "https://oyn.dev/oyn-preview.png?v=reflections",
          }),
        }}
      />
      <h1 className="sr-only">
        OYN — Native HTML UI with GPU-rendered materials
      </h1>
      <main
        className="grid min-w-0 flex-1 place-items-center px-5 pb-16 pt-6 sm:pb-24"
        aria-label="Ceramic Tabs study"
      >
        <div className="@container w-full max-w-[680px]">
          <FilmTabs />
        </div>
      </main>
    </>
  );
}
