#!/bin/bash

# PrintCoord - Vercel 設置腳本
# 用於快速獲取 Vercel 項目配置信息

echo "🚀 PrintCoord - Vercel 設置助手"
echo "================================"
echo ""

# 檢查是否安裝 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安裝"
    echo "📦 正在安裝 Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI 已安裝"
echo ""

# 登入 Vercel
echo "🔐 請登入 Vercel..."
vercel login

echo ""
echo "🔗 正在連接項目..."
vercel link

echo ""
echo "📋 獲取項目配置..."

# 讀取項目配置
if [ -f ".vercel/project.json" ]; then
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId": "[^"]*' | cut -d'"' -f4)
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId": "[^"]*' | cut -d'"' -f4)
    
    echo ""
    echo "✅ 配置信息獲取成功！"
    echo "================================"
    echo ""
    echo "請將以下信息添加到 GitHub Secrets："
    echo ""
    echo "1. VERCEL_ORG_ID"
    echo "   值: $ORG_ID"
    echo ""
    echo "2. VERCEL_PROJECT_ID"
    echo "   值: $PROJECT_ID"
    echo ""
    echo "3. VERCEL_TOKEN"
    echo "   請前往: https://vercel.com/account/tokens"
    echo "   創建新 Token 並複製"
    echo ""
    echo "================================"
    echo ""
    echo "📖 詳細設置步驟請查看: CICD_SETUP.md"
    echo ""
else
    echo "❌ 未找到項目配置文件"
    echo "請確保已成功運行 'vercel link'"
fi
