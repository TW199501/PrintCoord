// Next.js 配置
const nextConfig = {
  // Docker 部署支持 - 啟用 standalone 輸出
  output: "standalone",
  reactStrictMode: true,

  typescript: {
    // 暫時忽略 TypeScript 錯誤
    ignoreBuildErrors: true,
  },
  // 為 Turbopack 添加空配置
  turbopack: {},
  
  // 移除重寫規則，讓 next-intl 處理國際化路由
  // async rewrites() {
  //   return [
  //     {
  //       source: "/:locale/:path*",
  //       destination: "/:path*",
  //     },
  //   ];
  // },
  
  // 移除 redirects 配置以避免與客戶端語言檢測衝突
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在伺服器端模擬 DOM API
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // 確保 ?url 匯入作為靜態資源處理（供 pdfjs worker 等使用）
    config.module.rules.push({
      resourceQuery: /url/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
