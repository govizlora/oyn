"use client";

import "./styles/base.css";
import "./styles/popover.css";
import * as Parts from "@ui-sdk/react/popover";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/popover";
export const PopoverTrigger: typeof Parts.PopoverTrigger = ceramicPart(
  Parts.PopoverTrigger,
  "key",
);
export const PopoverClose: typeof Parts.PopoverClose = ceramicPart(
  Parts.PopoverClose,
  "key",
);
export const PopoverContent: typeof Parts.PopoverContent = ceramicPart(
  Parts.PopoverContent,
  "panel",
  "popup",
);
