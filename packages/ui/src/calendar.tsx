"use client";

import "./styles/base.css";
import "./styles/calendar.css";
import { useMaterial } from "oyn/react";
import { ceramic } from "oyn/materials/ceramic";
import type { ComponentProps } from "react";
import * as Parts from "@ui-sdk/react/calendar";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/calendar";
const CalendarPanel: typeof Parts.Calendar = ceramicPart(
  Parts.Calendar,
  "panel",
);
export const CalendarPrevious: typeof Parts.CalendarPrevious = ceramicPart(
  Parts.CalendarPrevious,
  "key",
);
export const CalendarNext: typeof Parts.CalendarNext = ceramicPart(
  Parts.CalendarNext,
  "key",
);

// Range wells sit behind the endpoint keys. The SDK supplies both committed
// and preview range state, including a one-day range with coincident ends.
function DayFace({ face }: { face: "range" | "key" }) {
  const ref = useMaterial({
    appearance: ceramic,
    props: { elevation: face === "range" ? -2.4 : 6 },
  });
  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-oyn-day={face}
      data-oyn-face={face === "range" ? "well" : "key"}
    />
  );
}

export function CalendarDay({
  children,
  ...props
}: ComponentProps<typeof Parts.CalendarDay>) {
  return (
    <Parts.CalendarDay {...props}>
      {(day) => (
        <>
          {day.inRange && <DayFace face="range" />}
          {day.selected && (!day.inRange || day.rangeStart || day.rangeEnd) && (
            <DayFace face="key" />
          )}
          {typeof children === "function"
            ? children(day)
            : (children ?? day.label)}
        </>
      )}
    </Parts.CalendarDay>
  );
}

export function CalendarWeeks({
  children,
  ...props
}: ComponentProps<typeof Parts.CalendarWeeks>) {
  return (
    <Parts.CalendarWeeks {...props}>
      {children ?? ((cell) => <CalendarDay value={cell.date} />)}
    </Parts.CalendarWeeks>
  );
}

export function CalendarGrid({
  children,
  ...props
}: ComponentProps<typeof Parts.CalendarGrid>) {
  return (
    <Parts.CalendarGrid {...props}>
      {children ?? (
        <>
          <Parts.CalendarWeekdays />
          <CalendarWeeks />
        </>
      )}
    </Parts.CalendarGrid>
  );
}

function MonthChevron({ next = false }: { next?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      data-mirror=""
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={next ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
    </svg>
  );
}

/** The default month header and grids shared by Calendar and DatePickerContent. */
export function CalendarLayout({ months = 1 }: { months?: number }) {
  const count = Number.isFinite(months) ? Math.max(1, Math.floor(months)) : 1;
  return (
    <>
      <div data-slot="row">
        <CalendarPrevious>
          <MonthChevron />
        </CalendarPrevious>
        <Parts.CalendarHeading />
        <CalendarNext>
          <MonthChevron next />
        </CalendarNext>
      </div>
      <div data-slot="row">
        {Array.from({ length: count }, (_, offset) => (
          <CalendarGrid key={offset} offset={offset} />
        ))}
      </div>
    </>
  );
}

export function Calendar({
  children,
  ...props
}: ComponentProps<typeof Parts.Calendar>) {
  return (
    <CalendarPanel {...props}>
      {children === undefined ? (
        <CalendarLayout months={props.months} />
      ) : (
        children
      )}
    </CalendarPanel>
  );
}
