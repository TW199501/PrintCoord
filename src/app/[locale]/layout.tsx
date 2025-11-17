import React from 'react';
import '../globals.css';
import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<Props["params"]> }): Promise<Metadata> {
  const { locale } = await params;

  // 根據不同語言返回相應的元數據
  const titles = {
    'en-US': 'PrintCoord - Smart Table Template Management',
    'zh-TW': 'PrintCoord - 智慧表格模板管理系統',
    'zh-CN': 'PrintCoord - 智慧表格模板管理系统',
  };

  const descriptions = {
    'en-US': 'Smart table template management system for scanned PDFs and documents',
    'zh-TW': '專為掃描 PDF 和文件設計的智慧表格模板管理系統',
    'zh-CN': '专为扫描 PDF 和文件设计的智慧表格模板管理系统',
  };

  return {
    title: titles[locale as keyof typeof titles] || titles['en-US'],
    description: descriptions[locale as keyof typeof descriptions] || descriptions['en-US'],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<Props["params"]> }) {
  const { locale } = await params;

  // 驗證 locale 是否支援
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // 設置請求 locale 並載入消息
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        {children}
      </body>
    </html>
  );
}
