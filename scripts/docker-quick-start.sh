#!/bin/bash

# PrintCoord Docker 快速啟動腳本

echo "🐳 PrintCoord Docker 快速啟動"
echo "================================"
echo ""

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安裝"
    echo "請訪問 https://docs.docker.com/get-docker/ 安裝 Docker"
    exit 1
fi

echo "✅ Docker 已安裝"
echo ""

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose 未安裝，將使用 docker compose"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "🔨 開始構建 Docker 鏡像..."
$COMPOSE_CMD build

if [ $? -eq 0 ]; then
    echo "✅ 構建成功！"
else
    echo "❌ 構建失敗"
    exit 1
fi

echo ""
echo "🚀 啟動容器..."
$COMPOSE_CMD up -d

if [ $? -eq 0 ]; then
    echo "✅ 容器已啟動！"
else
    echo "❌ 啟動失敗"
    exit 1
fi

echo ""
echo "⏳ 等待應用啟動..."
sleep 5

# 檢查健康狀態
echo "🔍 檢查應用健康狀態..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)

if [ $? -eq 0 ]; then
    echo "✅ 應用健康檢查通過！"
    echo ""
    echo "📊 應用信息:"
    echo "$HEALTH_CHECK" | jq '.'
else
    echo "⚠️  健康檢查失敗，查看日誌..."
    $COMPOSE_CMD logs --tail 50
fi

echo ""
echo "================================"
echo "🎉 PrintCoord 已成功啟動！"
echo ""
echo "🌐 訪問: http://localhost:3000"
echo "📊 健康檢查: http://localhost:3000/api/health"
echo ""
echo "常用命令:"
echo "  查看日誌: $COMPOSE_CMD logs -f"
echo "  停止服務: $COMPOSE_CMD down"
echo "  重啟服務: $COMPOSE_CMD restart"
echo "================================"
