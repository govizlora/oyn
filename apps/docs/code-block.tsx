import type { ComponentProps } from "react";
import { Recess } from "./recess";

export function CodeBlock({ className = "", ...props }: ComponentProps<"pre">) {
  return (
    <pre
      {...props}
      className={`m-0 overflow-auto bg-transparent! text-sm ${className}`}
    />
  );
}

export function RecessedCode(props: ComponentProps<"pre">) {
  return (
    <Recess className="p-4">
      <CodeBlock {...props} />
    </Recess>
  );
}
