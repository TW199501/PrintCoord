export const locales = ["en-US", "zh-TW", "zh-CN"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en-US";

export const localeNames: Record<Locale, string> = {
  "en-US": "English (US)",
  "zh-TW": "Traditional Chinese",
  "zh-CN": "Simplified Chinese",
};

export const localePrefix = "always" as const;
