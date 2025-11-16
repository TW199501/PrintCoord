// This file is temporarily cleared to resolve build errors as 'next-intl' is not installed.
import { defineRouting } from "next-intl/routing";
import { defaultLocale, localePrefix, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
});
