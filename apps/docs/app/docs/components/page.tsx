import { catalog } from "../../../catalog";
import { pageMeta } from "../../../meta";
export const metadata = pageMeta(
  "Components · OYN",
  "Browse working Ceramic controls and their integration examples.",
  "/docs/components/",
);
export default function Components() {
  return (
    <main className="article">
      <h1>Components</h1>
      <p>
        These working examples pair OYN materials with native elements or UI SDK
        controls. The compositions live in the website workspace.
      </p>
      <ul className="catalog">
        {catalog.getPages().map((page) => (
          <li key={page.url}>
            <a href={page.url + "/"}>{page.data.title}</a>
            <p>{page.data.description}</p>
          </li>
        ))}
      </ul>
      <h2>Other controls</h2>
      <p>
        There is no verified recipe here yet for other controls. To try one,
        look for a public element or slot that can host a canvas.
      </p>
    </main>
  );
}
