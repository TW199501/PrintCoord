/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 暫時忽略 TypeScript 錯誤
    ignoreBuildErrors: true,
  },
  // 為 Turbopack 添加空配置
  turbopack: {},
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
