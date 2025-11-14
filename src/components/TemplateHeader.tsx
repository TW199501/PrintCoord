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
import { Moon, Sun } from "lucide-react";

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
      {/* 頂部 Header */}
      <header className="flex items-center gap-6 border-b bg-background/95 px-6 py-2 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            TT
          </div>
          <div>
            <h1 className="text-lg font-semibold">PrintCoord</h1>
            <p className="text-sm text-muted-foreground">
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
