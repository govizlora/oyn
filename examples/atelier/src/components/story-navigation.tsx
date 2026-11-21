import {
  NavigationMenuLink,
  NavigationDisclosure,
} from "@oyn/ui/navigation-menu";
import { useLayoutEffect, useRef, useState } from "react";
import { families, storyHref, type Example, type Family } from "./catalog";

const cardStory: Family = { id: "card", name: "Card", examples: [] };
const components = [...families, cardStory].sort((a, b) =>
  a.name.localeCompare(b.name),
);
const componentHref = (item: Family) =>
  item === cardStory ? "./?view=card" : storyHref(item.id);

export function StoryNavigation({
  family,
  example,
  overview,
  card,
  menuOpen,
}: {
  family?: Family;
  example?: Example;
  overview: boolean;
  card: boolean;
  menuOpen: boolean;
}) {
  const [query, setQuery] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const current = card ? cardStory : family;
  const position = current ? components.indexOf(current) : -1;
  const term = query.trim().toLowerCase();
  const matches = components.flatMap((item) => {
    const wholeFamily = item.name.toLowerCase().includes(term);
    const examples = wholeFamily
      ? item.examples
      : item.examples.filter((entry) =>
          entry.title.toLowerCase().includes(term),
        );
    return wholeFamily || examples.length
      ? [{ item, examples, showMatches: !wholeFamily }]
      : [];
  });
  useLayoutEffect(() => {
    const container = list.current;
    const active = container?.querySelector('[aria-current="page"]');
    if (!container || !active || !container.clientHeight) return;
    const disclosure = active.closest("details");
    if (disclosure) disclosure.open = true;
    const bounds = container.getBoundingClientRect();
    const item = active.getBoundingClientRect();
    const gutter = parseFloat(
      getComputedStyle(container).scrollPaddingBlockStart,
    );
    if (item.top - gutter < bounds.top)
      container.scrollTop += item.top - gutter - bounds.top;
    else if (item.bottom + gutter > bounds.bottom)
      container.scrollTop += item.bottom + gutter - bounds.bottom;
  }, [current, example, menuOpen]);
  return (
    <section aria-label="UI Components" className="story-library">
      <header>
        <h2>UI Components</h2>
        {current &&
          [-1, 1].map((offset) => {
            const other = components[position + offset];
            if (!other) return null;
            const label =
              (offset < 0 ? "Previous component" : "Next component") +
              " · " +
              other.name;
            return (
              <NavigationMenuLink
                key={offset}
                data-story={other !== cardStory ? "" : undefined}
                href={componentHref(other)}
                aria-label={label}
                title={label}
              >
                {offset < 0 ? "←" : "→"}
              </NavigationMenuLink>
            );
          })}
      </header>
      <input
        type="search"
        aria-label="Find a component or example"
        placeholder="Find component or example…"
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
          if (list.current) list.current.scrollTop = 0;
        }}
      />
      <div className="story-list" ref={list}>
        {!term && (
          <NavigationMenuLink
            data-story
            href="./components.html"
            current={overview}
          >
            Component library
          </NavigationMenuLink>
        )}
        {matches.map(({ item, examples, showMatches }) =>
          item === cardStory ? (
            <NavigationMenuLink
              key={item.id}
              href={componentHref(item)}
              current={card}
            >
              Card
            </NavigationMenuLink>
          ) : (
            <StoryFamily
              key={item.id}
              item={item}
              examples={examples}
              current={item === current}
              example={example}
              searching={!!term}
              showMatches={showMatches}
            />
          ),
        )}
        {!matches.length && <p role="status">No matches.</p>}
      </div>
    </section>
  );
}

// Closed groups keep their disclosure and page link. Only visible stories need
// SDK registrations, keyboard bindings and a place in the navigation tree.
function StoryFamily({
  item,
  examples,
  current,
  example,
  searching,
  showMatches,
}: {
  item: Family;
  examples: Example[];
  current: boolean;
  example?: Example;
  searching: boolean;
  showMatches: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="story-family">
      <NavigationMenuLink
        data-story
        data-family={item.id}
        href={componentHref(item)}
        className={current ? "active-family" : undefined}
      >
        {item.name}
      </NavigationMenuLink>
      <details
        name={searching ? undefined : "component-examples"}
        open={current || showMatches}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <NavigationDisclosure aria-label={item.name + " examples"} />
        <ul aria-label={item.name + " examples"}>
          {(expanded || current || showMatches) &&
            examples.map((entry) => (
              <li key={entry.id}>
                <NavigationMenuLink
                  data-story
                  href={storyHref(item.id, entry.id)}
                  current={current && entry === example}
                >
                  {entry.title}
                </NavigationMenuLink>
              </li>
            ))}
        </ul>
      </details>
    </div>
  );
}
