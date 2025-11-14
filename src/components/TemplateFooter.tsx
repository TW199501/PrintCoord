"use client";

import React from "react";

export default function TemplateFooter() {
  return (
    <footer className="relative mt-6 flex h-12 items-center justify-between overflow-hidden rounded-lg border border-pc-border bg-white dark:bg-slate-900 px-6 text-xs shadow-sm">
      {/* 頂部裝飾線 - 品牌色 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pc-primary via-pc-secondary to-pc-accent"></div>
      
      <span className="font-medium text-pc-text-muted dark:text-muted-foreground">
        © {new Date().getFullYear()} <span className="bg-gradient-to-r from-pc-primary to-pc-secondary bg-clip-text text-transparent font-semibold">PrintCoord</span> - 智慧表格模板管理系統
      </span>
      <span className="rounded-full bg-pc-accent px-3 py-1 text-white font-semibold shadow-sm">
        v1.0.0
      </span>
    </footer>
  );
}
