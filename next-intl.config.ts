import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './src/i18n/config';

export default getRequestConfig(async ({ requestLocale }) => {
  // 確認請求的語言是否存在，否則使用預設語言
  const locale = locales.includes(requestLocale as any) 
    ? requestLocale 
    : defaultLocale;

  // 動態載入對應語言的訊息文件
  const messages = {
    common: require(`./src/i18n/messages/${locale}/common.json`),
    templates: require(`./src/i18n/messages/${locale}/templates.json`)
  };

  return {
    locale,
    messages
  };
});