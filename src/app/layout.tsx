import "./globals.css";
import type { ReactNode } from "react";
// 匯入全域 polyfills，確保伺服器端渲染時 DOM API 可用
import "@/lib/globals";

export const metadata = {
  title: "PrintCoord",
  description: "PrintCoord – Smart PDF/Word Coordinate Engine",
};

interface RootLayoutProps {
  children: ReactNode;
}

// 根 layout 現在只作為包裝器，主要的國際化 layout 在 [locale]/layout.tsx 中處理
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
