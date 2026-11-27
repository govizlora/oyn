import { Article } from "../../../article";
import { catalog } from "../../../catalog";
import { pageMeta } from "../../../meta";
export const metadata = pageMeta(
  "Components · OYN",
  "Browse working Ceramic controls and their integration examples.",
  "/docs/components/",
);
export default function Components() {
  return (
    <Article>
      <h1>Components</h1>
      <ul className="m-0 list-none p-0">
        {catalog.getPages().map((page) => (
          <li
            key={page.url}
            className="border-0 border-t border-solid border-neutral-200 dark:border-neutral-800 py-5"
          >
            <a
              className="text-xl font-medium no-underline hover:underline"
              href={page.url + "/"}
            >
              {page.data.title}
            </a>
            <p className="mt-1 mb-0 text-neutral-600 dark:text-neutral-400">{page.data.description}</p>
          </li>
        ))}
      </ul>
    </Article>
  );
}
