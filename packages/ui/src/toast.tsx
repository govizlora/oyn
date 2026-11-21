"use client";

import type { ComponentProps } from "react";
import "./styles/base.css";
import "./styles/toast.css";
import * as Parts from "@ui-sdk/react/toast";
import { ceramicPart } from "./ceramic-part.js";

export * from "@ui-sdk/react/toast";
export const Toast: typeof Parts.Toast = ceramicPart(
  Parts.Toast,
  "panel",
  "popup",
);
export const ToastAction: typeof Parts.ToastAction = ceramicPart(
  Parts.ToastAction,
  "key",
);

export const ToastClose: typeof Parts.ToastClose = ceramicPart(
  Parts.ToastClose,
  "key",
);

export function ToastRegion({
  children,
  ...props
}: ComponentProps<typeof Parts.ToastRegion>) {
  return (
    <Parts.ToastRegion {...props} data-oyn-popup="">
      {children ??
        ((item) => (
          <Toast>
            <div>
              <Parts.ToastTitle />
              <Parts.ToastDescription />
            </div>
            {item.action && <ToastAction />}
            {item.cancel && (
              <ToastClose action={item.cancel.onCancel}>
                {item.cancel.label}
              </ToastClose>
            )}
          </Toast>
        ))}
    </Parts.ToastRegion>
  );
}
