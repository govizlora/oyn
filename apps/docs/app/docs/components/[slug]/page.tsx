import { notFound } from "next/navigation";
import { catalog } from "../../../../catalog";
import { pageMeta } from "../../../../meta";
import { FilmTabs } from "../../../../FilmTabs";
import { ButtonDemo } from "../../../../button-demo";
export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.getPages().map((page) => ({ slug: page.slugs[0] }));
}
async function readPage(params: Promise<{ slug: string }>) {
  const { slug } = await params;
  return catalog.getPage([slug]) ?? notFound();
}
export async function generateMetadata({
  params,
}: PageProps<"/docs/components/[slug]">) {
  const page = await readPage(params);
  return pageMeta(
    page.data.title + " · OYN Components",
    page.data.description ?? "",
    page.url + "/",
  );
}
export default async function ComponentPage({
  params,
}: PageProps<"/docs/components/[slug]">) {
  const page = await readPage(params);
  const Content = page.data.body;
  return (
    <main className="article">
      <a href="/docs/components/">← Components</a>
      <h1>{page.data.title}</h1>
      <p>{page.data.description}</p>
      <Content components={{ FilmTabs, ButtonDemo }} />
    </main>
  );
}
