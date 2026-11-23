import { Button } from "@oyn/ui/button";
import { useLog } from "../../log";

export function Example() {
  const log = useLog();
  return (
    <div className="button-hover-effects">
      <Button onClick={() => log("Recess pressed")}>Recess</Button>
      <Button hoverEffect="lower" onClick={() => log("Lower pressed")}>
        Lower slightly
      </Button>
      <Button hoverEffect="lift" onClick={() => log("Lift pressed")}>
        Lift slightly
      </Button>
    </div>
  );
}
