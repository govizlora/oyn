import { createContext, type Context } from "react";
import type { Engine } from "@oyn/core";

export const OynContext: Context<Engine | null> = createContext<Engine | null>(null);
