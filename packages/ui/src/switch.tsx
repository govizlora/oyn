"use client";

import "./styles/base.css";
import "./styles/switch.css";
import * as Parts from "@ui-sdk/react/switch";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/switch";
export const Switch: typeof Parts.Switch = ceramicPart(Parts.Switch, "well");
export const SwitchThumb: typeof Parts.SwitchThumb = ceramicPart(
  Parts.SwitchThumb,
  "thumb",
);
