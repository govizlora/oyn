import { Calendar } from "@oyn/ui/calendar";
import { Switch, SwitchThumb } from "@oyn/ui/switch";
import {
  Slider,
  SliderControl,
  SliderThumb,
  SliderTrack,
  SliderIndicator,
  SliderValue,
} from "@oyn/ui/slider";
import {
  cardStory,
  componentHref,
  groups,
  storyHref,
  type Group,
} from "./catalog";
import type { ReactNode } from "react";

const previews: Partial<Record<string, ReactNode>> = {
  calendar: (
    <Calendar mode="range" defaultValue={["2026-10-12", "2026-10-16"]} />
  ),
  switch: (
    <label data-slot="label">
      Show guides{" "}
      <Switch defaultChecked>
        <SwitchThumb />
      </Switch>
    </label>
  ),
  slider: (
    <Slider defaultValue={65}>
      <div data-slot="row">
        <span>Intensity</span>
        <SliderValue />
      </div>
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
          <SliderThumb aria-label="Intensity" />
        </SliderTrack>
      </SliderControl>
    </Slider>
  ),
};

export function Overview({ group }: { group: Group }) {
  return (
    <article className="catalog-index">
      <header>
        <h1>UI Components</h1>
        <nav className="readiness-nav" aria-label="Component status">
          {groups.map((entry) => (
            <a
              key={entry.label}
              data-story
              href={entry.href}
              aria-current={entry === group ? "page" : undefined}
            >
              {entry.label} <small>{entry.items.length}</small>
            </a>
          ))}
        </nav>
      </header>
      <section aria-label={group.label}>
        {!group.items.length && (
          <p>No {group.label.toLowerCase()} components yet.</p>
        )}
        <ul className="component-index-links">
          {group.items.map((item) => (
            <li key={item.id}>
              <a
                data-story={item !== cardStory ? "" : undefined}
                href={componentHref(item)}
              >
                {item.name}
              </a>
            </li>
          ))}
        </ul>
        <div className="featured-stories">
          {group.items
            .filter((item) => previews[item.id])
            .map((item) => (
              <section key={item.id} className={"featured-" + item.id}>
                <h2>
                  <a
                    data-story
                    href={storyHref(
                      item.id,
                      item.id === "calendar" ? "range" : undefined,
                    )}
                  >
                    {item.name} <span>↗</span>
                  </a>
                </h2>
                <div className="oyn-ui featured-preview">
                  {previews[item.id]}
                </div>
              </section>
            ))}
        </div>
      </section>
    </article>
  );
}
