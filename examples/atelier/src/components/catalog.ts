import readyIds from "../../../../packages/ui/ready.json";
import families from "./catalog.json";

export type Family = (typeof families)[number];
export type Example = Family["examples"][number];

export const cardStory: Family = { id: "card", name: "Card", examples: [] };
const components = [...families, cardStory].sort((a, b) =>
  a.name.localeCompare(b.name),
);
const ready = new Set<string>(readyIds);
export const groups = [
  { id: "ready", label: "Ready", href: "./components.html" },
  {
    id: "not-ready",
    label: "Not ready",
    href: "./components.html?status=not-ready",
  },
].map((group) => {
  const items = components.filter(
    (item) => ready.has(item.id) === (group.id === "ready"),
  );
  const stories = items.flatMap((family) =>
    family.examples.map((example) => ({
      example,
      href: storyHref(family.id, example.id),
      label: family.name + " · " + example.title,
    })),
  );
  return { ...group, items, stories };
});
export type Group = (typeof groups)[number];
export function groupOf(item: Family) {
  return groups.find((group) => group.items.includes(item))!;
}
export function componentHref(item: Family) {
  return item === cardStory ? "./?view=card" : storyHref(item.id);
}

export function storyHref(family: Family["id"], example?: Example["id"]) {
  const params = new URLSearchParams({ component: family });
  if (example) params.set("example", example);
  return "./components.html?" + params;
}

export function readStory() {
  const params = new URLSearchParams(location.search);
  const family = families.find((item) => item.id === params.get("component"));
  const example =
    family?.examples.find((item) => item.id === params.get("example")) ??
    family?.examples[0];
  const group = family
    ? groupOf(family)
    : (groups.find((group) => group.id === params.get("status")) ?? groups[0]);
  return { family, example, group };
}
