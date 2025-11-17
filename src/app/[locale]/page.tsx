import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import TemplateManager from "../../TemplateManager";

type Props = {
  params: Promise<{ locale: string }>;
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen bg-white">
      <div className="text-black p-8">
        <h1 className="text-2xl font-bold mb-4">
          PrintCoord - 智慧表格模板管理系統
        </h1>
        <div className="space-y-4">
          <p className="text-lg">歡迎使用 PrintCoord 系統</p>
          <p className="text-base">當前語言: {locale}</p>
          <div className="border rounded p-4 bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">功能特色</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>智慧 PDF 表格識別</li>
              <li>多語言支援 (中文/英文)</li>
              <li>直觀的編輯介面</li>
              <li>批次處理功能</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
