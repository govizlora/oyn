"use client";
import {
  Activity,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { OynProvider } from "@oyn/react";
import { createStudyPointer } from "./pointer";

function StudyCursor({
  studyPointer,
}: {
  studyPointer: ReturnType<typeof createStudyPointer> | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!studyPointer) return;
    const write = () => {
      const node = ref.current!;
      const { position, visible } = studyPointer.inputs.pointer.getSnapshot();
      node.hidden = !studyPointer.showCursor() || !visible;
      if (position)
        node.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    };
    const unsubscribe = studyPointer.inputs.pointer.subscribe(write);
    write();
    return unsubscribe;
  }, [studyPointer]);
  return (
    <div className="study-cursor-layer" aria-hidden="true">
      <div ref={ref} hidden className="study-cursor">
        <svg viewBox="0 0 20 28" focusable="false">
          <path
            d="M1 1v21l5.1-5.1 4.2 9.1 4-1.9-4.2-8.9H18Z"
            fill="#111"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function SurfaceProvider({ children }: { children: ReactNode }) {
  const [pointer] = useState(() =>
    typeof window === "undefined" ? null : createStudyPointer(window),
  );
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const hide = () => flushSync(() => setVisible(false));
    const show = (event: PageTransitionEvent) => {
      if (event.persisted) setVisible(true);
    };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    };
  }, []);
  return (
    <Activity mode={visible ? "visible" : "hidden"}>
      <OynProvider inputs={pointer?.inputs}>
        {children}
        <StudyCursor studyPointer={pointer} />
      </OynProvider>
    </Activity>
  );
}
