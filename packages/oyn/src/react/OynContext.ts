import { createContext } from "react";
import type { Engine } from "../core/engine.js";

export const OynContext = createContext<Engine | null>(null);
