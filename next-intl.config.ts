import { locales, defaultLocale, type Locale } from "./src/i18n/config";

export const locales = locales;
export const defaultLocale = defaultLocale;

export async function getMessages(locale: Locale) {
  try {
    // 載入指定語言的所有消息文件
    const commonMessages = (
      await import(`./src/i18n/messages/${locale}/common.json`)
    ).default;
    const templateMessages = (
      await import(`./src/i18n/messages/${locale}/templates.json`)
    ).default;

    return {
      ...commonMessages,
      ...templateMessages,
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    
    // 如果載入失敗，嘗試使用預設語言
    if (locale !== defaultLocale) {
      try {
        const commonMessages = (
          await import(`./src/i18n/messages/${defaultLocale}/common.json`)
        ).default;
        const templateMessages = (
          await import(`./src/i18n/messages/${defaultLocale}/templates.json`)
        ).default;

        return {
          ...commonMessages,
          ...templateMessages,
        };
      } catch (defaultError) {
        console.error(`Failed to load default messages:`, defaultError);
      }
    }

    // 如果所有嘗試都失敗，返回空的訊息對象
    return {};
  }
}
