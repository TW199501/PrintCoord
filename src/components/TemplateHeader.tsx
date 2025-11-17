"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Moon, Sun, Grid3x3 } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
// @ts-expect-error next-intl module export type issue
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

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
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (value: string) => {
    onLanguageChange(value);
    const newPath = `/${value}${pathname}`;
    router.push(newPath);
  };
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
              {t('brand')}
            </h1>
            <p className="text-xs text-pc-text-muted font-medium">
              {t('tagline')}
            </p>
          </div>
        </div>
        <div className="flex flex-1 justify-center" aria-hidden="true" />

        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32 justify-center px-2">
              <span className="flex items-center gap-1 text-sm">
                <span className="leading-none">
                  {language === "en-US" && (
                    <ReactCountryFlag
                      countryCode="US"
                      svg
                      style={{ width: "1.1em", height: "1.1em" }}
                    />
                  )}
                  {language === "zh-TW" && (
                    <ReactCountryFlag
                      countryCode="TW"
                      svg
                      style={{ width: "1.1em", height: "1.1em" }}
                    />
                  )}
                  {language === "zh-CN" && (
                    <ReactCountryFlag
                      countryCode="CN"
                      svg
                      style={{ width: "1.1em", height: "1.1em" }}
                    />
                  )}
                </span>
                <span className="font-medium tracking-tight">
                  {language === "en-US" && "US"}
                  {language === "zh-TW" && "TW"}
                  {language === "zh-CN" && "CN"}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent className="w-32">
              <SelectItem value="zh-TW" className="py-1 px-2 text-sm">
                {t('language.zhTW')}
              </SelectItem>
              <SelectItem value="zh-CN" className="py-1 px-2 text-sm">
                {t('language.zhCN')}
              </SelectItem>
              <SelectItem value="en-US" className="py-1 px-2 text-sm">
                {t('language.enUS')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={onThemeToggle}
            aria-label={t('theme.toggle')}
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
