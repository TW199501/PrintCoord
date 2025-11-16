"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type WorkflowStep = "upload" | "edit" | "preview";

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  stepDetails: {
    title: string;
    description: string;
  };
  isScanning: boolean;
  hasFile: boolean;
  fieldsCount: number;
  templateName: string;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canProceed: boolean;
}

export default function StepIndicator({
  currentStep,
  stepDetails,
  isScanning,
  hasFile,
  fieldsCount,
  templateName,
  onReset,
  onPrevious,
  onNext,
  canProceed,
}: StepIndicatorProps) {
  const t = useTranslations('templates');
  const stepNumber =
    currentStep === "upload" ? "01" : currentStep === "edit" ? "02" : "03";

  return (
    <section
      className="relative flex items-center justify-between border-b border-pc-border bg-pc-bg dark:bg-slate-900 px-6"
      style={{ minHeight: "2.5em" }}
    >
      {/* 進度條背景 - 品牌色漸層 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-pc-border dark:bg-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-pc-primary via-pc-secondary to-pc-accent transition-all duration-500 ease-out"
          style={{ 
            width: currentStep === "upload" ? "33%" : currentStep === "edit" ? "66%" : "100%"
          }}
        />
      </div>
      
      <div className="flex items-center gap-4 py-2">
        <Badge
          variant="outline"
          className="px-3 py-1 text-xs uppercase tracking-wide bg-pc-accent text-white border-0 shadow-sm font-semibold"
        >
          {t('stepIndicator.step', { number: stepNumber })}
        </Badge>
        <div>
          <p className="text-sm font-medium">{stepDetails.title}</p>
          <p className="text-xs text-muted-foreground">
            {stepDetails.description}
          </p>
        </div>
        {isScanning && (
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('stepIndicator.scanning')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 py-2">
        <Button
          variant="ghost"
          disabled={!hasFile && fieldsCount === 0 && !templateName}
          onClick={onReset}
        >
          {t('stepIndicator.reset')}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={currentStep === "upload"}
            onClick={onPrevious}
          >
            {t('stepIndicator.previous')}
          </Button>
          <Button 
            disabled={!canProceed} 
            onClick={onNext}
            className="bg-gradient-to-r from-pc-primary to-pc-secondary hover:from-pc-primary-dark hover:to-pc-secondary text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {currentStep === "preview" ? t('stepIndicator.complete') : t('stepIndicator.next')}
          </Button>
        </div>
      </div>
    </section>
  );
}
