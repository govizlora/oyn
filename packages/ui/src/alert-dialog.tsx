"use client";

import type { ComponentProps } from "react";
import "./styles/base.css";
import "./styles/alert-dialog.css";
import * as Parts from "@ui-sdk/react/alert-dialog";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/alert-dialog";
export const AlertDialogTrigger: typeof Parts.AlertDialogTrigger = ceramicPart(
  Parts.AlertDialogTrigger,
  "key",
);
export const AlertDialogClose: typeof Parts.AlertDialogClose = ceramicPart(
  Parts.AlertDialogClose,
  "key",
);
export const AlertDialogContent: typeof Parts.AlertDialogContent = ceramicPart(
  Parts.AlertDialogContent,
  "floating",
  "popup",
);

export function AlertDialogBackdrop(
  props: ComponentProps<typeof Parts.AlertDialogBackdrop>,
) {
  return <Parts.AlertDialogBackdrop {...props} data-oyn-popup="" />;
}
