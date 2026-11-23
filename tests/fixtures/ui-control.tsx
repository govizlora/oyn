import {
  StrictMode,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from "react";
import { createRoot } from "react-dom/client";
import { SurfaceProvider, useSurface } from "@oyn/surface";
import { Button } from "../../packages/ui/src/button";
import { Avatar, AvatarFallback } from "../../packages/ui/src/avatar";
import { Toggle } from "../../packages/ui/src/toggle";
import { StoryButton } from "../../examples/atelier/src/components/recipe-button";

import { ceramic } from "@oyn/ceramic";
import { NavigationDisclosure } from "../../packages/ui/src/navigation-menu";
import { Input, InputGroup } from "../../packages/ui/src/input";
import { Switch, SwitchThumb } from "../../packages/ui/src/switch";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionPanel,
} from "../../packages/ui/src/accordion";
import "../../packages/ui/src/styles/tooltip.css";
import "../../packages/ui/src/styles/toast.css";
import "../../packages/ui/src/styles/progress.css";

function NativeInput(props: ComponentProps<"input">) {
  return <input {...props} />;
}
function Duplicate() {
  const first = useSurface({ appearance: ceramic, props: {} });
  const second = useSurface({ appearance: ceramic, props: {} });
  return (
    <div
      id="duplicate"
      ref={(element) => {
        const a = first(element),
          b = second(element);
        return () => {
          b?.();
          a?.();
        };
      }}
    />
  );
}
function Fixture() {
  const [mounted, setMounted] = useState(true);
  const [duplicate, setDuplicate] = useState(false);
  useLayoutEffect(() => {
    Object.assign(window, { controls: { setMounted, setDuplicate } });
  });
  return (
    <SurfaceProvider>
      {duplicate && <Duplicate />}
      {mounted && (
        <main
          className="oyn-ui"
          style={{
            padding: 24,
            display: "grid",
            gap: 36,
            justifyItems: "start",
          }}
        >
          <fieldset id="fieldset">
            <Button
              id="key"
              hoverEffect="lower"
              style={{ width: 160, height: 44 }}
            >
              Save
            </Button>
          </fieldset>
          <Toggle id="toggle" defaultPressed>
            Selected
          </Toggle>
          <Button id="link" render={<a href="#destination" />}>
            Page
          </Button>
          <Avatar id="portrait">
            <AvatarFallback>AA</AvatarFallback>
          </Avatar>
          <Button id="composed" render={<Avatar render={<button />} />}>
            <AvatarFallback>BB</AvatarFallback>
          </Button>
          <Button
            id="recipe-composed"
            render={(props) => <StoryButton {...props} />}
          >
            Native recipe
          </Button>
          <details>
            <NavigationDisclosure id="outline">Outline</NavigationDisclosure>
            <p>Content</p>
          </details>
          <section id="fields">
            <Input
              id="custom-input"
              aria-label="Custom"
              render={<NativeInput />}
            />
            <Input
              id="composed-input"
              aria-label="Composed"
              render={<Input />}
            />
            <InputGroup id="input-group">
              <Input aria-label="Grouped" />
            </InputGroup>
          </section>
          <section
            id="nested-theme"
            data-color-scheme="dark"
            style={{ colorScheme: "dark" }}
          >
            <Switch id="switch" aria-label="Guides">
              <SwitchThumb />
            </Switch>
            <Accordion defaultValue={["details"]}>
              <AccordionItem value="details">
                <AccordionHeader>
                  <AccordionTrigger>Details</AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel>One expansion owner.</AccordionPanel>
              </AccordionItem>
            </Accordion>
            <span id="tooltip-motion" data-slot="tooltip-content">
              Tooltip timing
            </span>
            <span id="toast-motion" data-slot="toast">
              Toast timing
              <svg data-show="loading" data-loop-probe="" />
            </span>
            <span data-slot="spinner" data-loop-probe="" />
            <span data-slot="progress-track" data-indeterminate="">
              <span data-slot="progress-indicator" data-loop-probe="" />
            </span>
          </section>
        </main>
      )}
    </SurfaceProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
