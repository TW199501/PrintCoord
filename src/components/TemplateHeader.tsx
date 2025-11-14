"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Moon, Sun, Grid3x3 } from "lucide-react";

interface TemplateHeaderProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export default function TemplateHeader({
  language,
  onLanguageChange,
  isDarkMode,
  onThemeToggle,
}: TemplateHeaderProps) {
  return (
    <>
      {/* 頂部 Header - PrintCoord 品牌色 */}
      <header className="relative flex items-center gap-6 border-b border-pc-border bg-white dark:bg-slate-900 px-6 py-3 shadow-sm">
        {/* 漸層裝飾線 - 品牌色 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-pc-primary via-pc-secondary to-pc-accent"></div>
        
        <div className="flex items-center gap-4">
          {/* Logo - 品牌漸層 */}
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pc-primary to-pc-secondary shadow-lg shadow-pc-primary/30">
            <Grid3x3 className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-pc-primary to-pc-secondary bg-clip-text text-transparent">
              PrintCoord
            </h1>
            <p className="text-xs text-pc-text-muted font-medium">
              智慧表格模板管理系統
            </p>
          </div>
        </div>
        <div className="flex flex-1 justify-center" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh-TW">繁體中文</SelectItem>
              <SelectItem value="zh-CN">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            aria-label="切換主題"
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>
    </>
  );
}
