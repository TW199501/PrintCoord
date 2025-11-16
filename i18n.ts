import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./src/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const common = (await import(`./src/i18n/messages/${locale}/common.json`))
    .default;
  const templates = (
    await import(`./src/i18n/messages/${locale}/templates.json`)
  ).default;

  return {
    locale,
    messages: {
      common,
      templates,
    },
  };
});
