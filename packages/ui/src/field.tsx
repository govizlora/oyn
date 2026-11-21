"use client";

import "./styles/base.css";
import "./styles/field.css";
import * as Parts from "@ui-sdk/react/field";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/field";
export const FieldControl: typeof Parts.FieldControl = ceramicPart(
  Parts.FieldControl,
  "well",
  "field",
);

const CardField = ceramicPart(Parts.Field, "panel");
export function Field(
  props: React.ComponentProps<typeof Parts.Field> & { "data-variant"?: string },
) {
  const Part = props["data-variant"] === "card" ? CardField : Parts.Field;
  return <Part {...props} />;
}
