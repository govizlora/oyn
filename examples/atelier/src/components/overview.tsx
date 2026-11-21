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
import { families, storyHref } from "./catalog";

export function Overview() {
  return (
    <article className="catalog-index">
      <header>
        <h1>UI Components</h1>
        <p>
          {families.length} components ·{" "}
          {families.reduce((n, f) => n + f.examples.length, 0)} interactive
          examples
        </p>
      </header>
      <div className="featured-stories">
        <section className="featured-calendar">
          <h2>
            <a data-story href={storyHref("calendar", "range")}>
              Calendar <span>↗</span>
            </a>
          </h2>
          <div className="oyn-ui featured-preview">
            <Calendar
              mode="range"
              defaultValue={["2026-10-12", "2026-10-16"]}
            />
          </div>
        </section>
        <section>
          <h2>
            <a data-story href={storyHref("switch")}>
              Switch <span>↗</span>
            </a>
          </h2>
          <div className="oyn-ui featured-preview">
            <label data-slot="label">
              Show guides{" "}
              <Switch defaultChecked>
                <SwitchThumb />
              </Switch>
            </label>
          </div>
        </section>
        <section>
          <h2>
            <a data-story href={storyHref("slider")}>
              Slider <span>↗</span>
            </a>
          </h2>
          <div className="oyn-ui featured-preview">
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
          </div>
        </section>
      </div>
    </article>
  );
}
