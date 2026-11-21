"use client";

import "./styles/base.css";
import "./styles/textarea.css";
import * as Parts from "@ui-sdk/react/textarea";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/textarea";
export const Textarea: typeof Parts.Textarea = ceramicPart(
  Parts.Textarea,
  "well",
  "field",
);
