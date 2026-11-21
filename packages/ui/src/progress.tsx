"use client";

import "./styles/base.css";
import "./styles/progress.css";
import * as Parts from "@ui-sdk/react/progress";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/progress";
export const ProgressTrack: typeof Parts.ProgressTrack = ceramicPart(
  Parts.ProgressTrack,
  "well",
);
