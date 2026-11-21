"use client";

import "./styles/base.css";
import "./styles/slider.css";
import * as Parts from "@ui-sdk/react/slider";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/slider";
export const SliderTrack: typeof Parts.SliderTrack = ceramicPart(
  Parts.SliderTrack,
  "well",
);
export const SliderThumb: typeof Parts.SliderThumb = ceramicPart(
  Parts.SliderThumb,
  "thumb",
);
