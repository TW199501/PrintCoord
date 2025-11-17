export const locales = ["en-US", "zh-TW", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en-US";

export const localeNames: Record<Locale, string> = {
  "en-US": "English (US)",
  "zh-TW": "Traditional Chinese (繁體中文)",
  "zh-CN": "Simplified Chinese (简体中文)",
};

export const localePrefix = "always" as const;
