"use client";

import "./styles/base.css";
import "./styles/tooltip.css";
import * as Parts from "@ui-sdk/react/tooltip";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/tooltip";
export const TooltipTrigger: typeof Parts.TooltipTrigger = ceramicPart(
  Parts.TooltipTrigger,
  "key",
);
export const TooltipContent: typeof Parts.TooltipContent = ceramicPart(
  Parts.TooltipContent,
  "panel",
  "popup",
);
