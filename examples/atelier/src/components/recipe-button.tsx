import { Button } from "@oyn/ui/button";
import type { ComponentProps } from "react";

// Documentation recipes also use plain HTML buttons. Preserve their native
// event target, submit behavior and ref when giving them the Ceramic finish.
export function StoryButton(props: ComponentProps<"button">) {
  // Render callbacks already receive the outer part's material/ref. Keep that
  // single owner visible instead of hiding it inside another Button's render.
  if ("data-oyn-face" in props) return <button {...props} />;
  return (
    <Button
      type={props.type ?? "submit"}
      disabled={props.disabled}
      aria-pressed={props["aria-pressed"]}
      render={<button {...props} />}
    />
  );
}
