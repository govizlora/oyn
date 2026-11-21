"use client";

import "./styles/base.css";
import "./styles/select.css";
import * as Parts from "@ui-sdk/react/select";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/select";
export const SelectTrigger: typeof Parts.SelectTrigger = ceramicPart(
  Parts.SelectTrigger,
  "well",
);
export const SelectContent: typeof Parts.SelectContent = ceramicPart(
  Parts.SelectContent,
  "panel",
  "popup",
);
export const SelectInput: typeof Parts.SelectInput = ceramicPart(
  Parts.SelectInput,
  "well",
  "field",
);
