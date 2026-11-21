"use client";

import "./styles/base.css";
import "./styles/input.css";
import * as Parts from "@ui-sdk/react/input";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/input";
export const Input: typeof Parts.Input = ceramicPart(
  Parts.Input,
  "well",
  "field",
);
export const InputGroup: typeof Parts.InputGroup = ceramicPart(
  Parts.InputGroup,
  "well",
  "group",
);
