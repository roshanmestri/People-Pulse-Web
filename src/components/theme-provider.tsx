"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes reads/writes the theme in the browser, so this must be a Client Component.
export function ThemeProvider(props: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}
