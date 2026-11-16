import { useTheme as useAppTheme } from "./theme";
export function useTheme() {
  const { dark } = useAppTheme();
  return { theme: dark ? "dark" : "light" };
}
