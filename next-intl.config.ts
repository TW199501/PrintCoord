import { getRequestConfig } from "next-intl/server";
import { routing } from "./src/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = routing.defaultLocale; // Simplify for now

  return {
    locale,
    messages: {
      common: (await import(`./src/i18n/messages/${locale}/common.json`))
        .default,
      templates: (await import(`./src/i18n/messages/${locale}/templates.json`))
        .default,
    },
  };
});
