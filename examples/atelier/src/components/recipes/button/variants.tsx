import { Button } from "@oyn/ui/button";
import { useLog } from "../../log";

export function Example() {
  const log = useLog();
  return (
    <div className="button-variants">
      <Button onClick={() => log("Primary pressed")}>Primary</Button>
      <Button variant="secondary" onClick={() => log("Secondary pressed")}>
        Secondary
      </Button>
      <Button variant="ghost" onClick={() => log("Ghost pressed")}>
        Ghost
      </Button>
    </div>
  );
}
