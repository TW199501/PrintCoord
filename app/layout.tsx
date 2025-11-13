import "./globals.css";
import type { ReactNode } from "react";
export const metadata = {
  title: "TableTemplate Pro",
  description: "智慧表格處理系統",
};
interface RootLayoutProps {
  children: ReactNode;
}
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-Hant" data-oid="o6swhwt">
      <body className="" data-oid="sw3qjfm">
        {children}
      </body>
    </html>
  );
}
