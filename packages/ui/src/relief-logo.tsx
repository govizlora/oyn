import type { HTMLAttributes } from "react";
import { createParameters, type Appearance } from "oyn";
import { useMaterial } from "oyn/react";
import { shader } from "./relief/shader.js";
import "./styles/relief-logo.css";

const artwork = new URL("./relief/oyn-relief.svg", import.meta.url).href;
const loadWebGL2 = async () => (await import("./relief/glsl.js")).default;
const direction = (degrees: number) => {
  const a = degrees * Math.PI / 180;
  return [Math.cos(a), Math.sin(a)];
};
const relief: Appearance<{ lightAngle: number }> = {
  create({ lightAngle }) {
    const parameters = createParameters([...direction(lightAngle), 0, 0]);
    return {
      material: { shader, parameters, loadWebGL2, passes: ["relief"], measurePadding: () => ({ x: 0, y: 0 }) },
      update(next) {
        const [x, y] = direction(next.lightAngle);
        parameters.set(0, x);
        parameters.set(1, y);
      },
    };
  },
};

export interface ReliefLogoProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Degrees relative to the SVG master lighting. Does not change any silhouette. */
  lightAngle?: number;
}

/** White-on-white OYN landscape. Place under the project's OynProvider. */
export function ReliefLogo({ lightAngle = 0, className, ...rest }: ReliefLogoProps) {
  const ref = useMaterial({ appearance: relief, props: { lightAngle } });
  return (
    <span ref={ref} role="img" aria-label="OYN" {...rest}
      className={className ? "oyn-relief-logo " + className : "oyn-relief-logo"}>
      <img src={artwork} alt="" aria-hidden="true" />
    </span>
  );
}
