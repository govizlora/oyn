"use client";

import "./styles/base.css";
import "./styles/checkbox.css";
import * as Parts from "@ui-sdk/react/checkbox";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/checkbox";
export const Checkbox: typeof Parts.Checkbox = ceramicPart(
  Parts.Checkbox,
  "well",
);
