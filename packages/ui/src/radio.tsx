"use client";

import "./styles/base.css";
import "./styles/radio.css";
import * as Parts from "@ui-sdk/react/radio";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/radio";
export const Radio: typeof Parts.Radio = ceramicPart(Parts.Radio, "well");
export const RadioIndicator: typeof Parts.RadioIndicator = ceramicPart(
  Parts.RadioIndicator,
  "thumb",
);
