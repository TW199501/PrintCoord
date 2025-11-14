import { NextResponse } from "next/server";

/**
 * 健康檢查 API
 * 用於 Docker 容器健康檢查和負載均衡器探測
 */
export async function GET() {
  try {
    // 讀取版本號
    const packageJson = await import("../../../../package.json");

    return NextResponse.json(
      {
        status: "healthy",
        service: "PrintCoord",
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
