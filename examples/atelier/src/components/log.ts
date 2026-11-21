import { createContext, useContext } from "react";

export const StoryLog = createContext<(message: string) => void>(() => {});
export function useLog() {
  return useContext(StoryLog);
}
