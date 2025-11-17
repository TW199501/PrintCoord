import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // 匹配所有路徑，包括根路徑
  matcher: [
    // 排除 API 路由、靜態資源和 Next.js 內部路徑
    '/((?!api|_next/static|_next/image|favicon.ico|_vercel).*)'
  ]
};
