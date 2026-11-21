"use client";

import "./styles/base.css";
import "./styles/menu.css";
import * as Parts from "@ui-sdk/react/menu";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/menu";
export const MenuTrigger: typeof Parts.MenuTrigger = ceramicPart(
  Parts.MenuTrigger,
  "key",
);
export const MenuContent: typeof Parts.MenuContent = ceramicPart(
  Parts.MenuContent,
  "panel",
  "popup",
);
export const MenuSubContent: typeof Parts.MenuSubContent = ceramicPart(
  Parts.MenuSubContent,
  "panel",
  "popup",
);
