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
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="">{children}</body>
    </html>
  );
}
