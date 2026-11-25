import {
  SegmentedControl,
  SegmentedControlItem,
} from "@oyn/ui/base-ui/segmented-control";

export function Example() {
  return (
    <SegmentedControl aria-label="View" name="view" defaultValue="list">
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
    </SegmentedControl>
  );
}
