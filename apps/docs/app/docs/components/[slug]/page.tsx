import { RecessedCode } from "../../../../code-block";
import { Article } from "../../../../article";
import { notFound } from "next/navigation";
import { catalog } from "../../../../catalog";
import { pageMeta } from "../../../../meta";
import { ComponentExample, InstallCommand } from "../../../../component-example";
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
    <Article>
      <h1>{page.data.title}</h1>
      <p>{page.data.description}</p>
      <Content
        components={{ ComponentExample, InstallCommand, pre: RecessedCode }}
      />
    </Article>
  );
}
