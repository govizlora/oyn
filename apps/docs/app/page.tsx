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
      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-10 px-5 pt-8 pb-16 sm:gap-14 sm:pb-24">
        <div className="grid justify-items-center gap-3">
          <h1 className="m-0 aspect-[1388.626/448] w-[clamp(9rem,28vw,15rem)] bg-current mask-[url(/oyn.svg)] mask-contain mask-center mask-no-repeat">
            <span className="sr-only">OYN</span>
          </h1>
          <p className="m-0 text-sm font-light">UI you can feel</p>
        </div>
        <div className="@container w-full max-w-[680px]">
          <FilmTabs />
        </div>
      </main>
    </>
  );
}
