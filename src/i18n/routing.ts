import { defineRouting } from "next-intl/routing";
import { locales, defaultLocale, localePrefix } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
});

// 確保導出類型
export type Routing = typeof routing;
