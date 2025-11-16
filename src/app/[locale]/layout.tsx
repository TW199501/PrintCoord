import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';
import type { Metadata } from 'next';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  // 使用靜態元數據，避免動態匯入造成的問題
  const titles = {
    'en-US': 'PrintCoord - Smart Table Template Management',
    'zh-TW': 'PrintCoord - 智慧表格模板管理系統',
    'zh-CN': 'PrintCoord - 智慧表格模板管理系统'
  };

  const descriptions = {
    'en-US': 'Smart table template management system for scanned PDFs and documents',
    'zh-TW': '為掃描 PDF 與文件建立並管理表格模板的智慧系統',
    'zh-CN': '为扫描 PDF 与文档建立并管理表格模板的智慧系统'
  };

  return {
    title: titles[locale as keyof typeof titles] || titles['en-US'],
    description: descriptions[locale as keyof typeof descriptions] || descriptions['en-US'],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
