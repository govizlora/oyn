"use client";

import type { ComponentProps } from "react";
import "./styles/base.css";
import "./styles/dialog.css";
import * as Parts from "@ui-sdk/react/dialog";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/dialog";
export const DialogTrigger: typeof Parts.DialogTrigger = ceramicPart(
  Parts.DialogTrigger,
  "key",
);
export const DialogClose: typeof Parts.DialogClose = ceramicPart(
  Parts.DialogClose,
  "key",
);
export const DialogContent: typeof Parts.DialogContent = ceramicPart(
  Parts.DialogContent,
  "floating",
  "popup",
);

export function DialogBackdrop(
  props: ComponentProps<typeof Parts.DialogBackdrop>,
) {
  return <Parts.DialogBackdrop {...props} data-oyn-popup="" />;
}
