import families from "./catalog.json";

export { families };
export type Family = (typeof families)[number];
export type Example = Family["examples"][number];

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
  return { family, example };
}
