"use client";

import "./styles/base.css";
import "./styles/accordion.css";
import * as Parts from "@ui-sdk/react/accordion";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/accordion";
export const AccordionItem: typeof Parts.AccordionItem = ceramicPart(
  Parts.AccordionItem,
  "panel",
);
export const AccordionTrigger: typeof Parts.AccordionTrigger = ceramicPart(
  Parts.AccordionTrigger,
  "outline",
);
