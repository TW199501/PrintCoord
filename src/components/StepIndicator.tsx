"use client";

import React from "react";
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
  const stepNumber =
    currentStep === "upload" ? "01" : currentStep === "edit" ? "02" : "03";

  return (
    <section
      className="flex items-center justify-between border-b bg-muted/50 px-6"
      style={{ minHeight: "2.5em" }}
    >
      <div className="flex items-center gap-4 py-2">
        <Badge
          variant="outline"
          className="px-3 py-1 text-xs uppercase tracking-wide"
        >
          Step {stepNumber}
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
            掃描中...
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 py-2">
        <Button
          variant="ghost"
          disabled={!hasFile && fieldsCount === 0 && !templateName}
          onClick={onReset}
        >
          重設流程
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={currentStep === "upload"}
            onClick={onPrevious}
          >
            上一步
          </Button>
          <Button disabled={!canProceed} onClick={onNext}>
            {currentStep === "preview" ? "完成" : "前往下一步"}
          </Button>
        </div>
      </div>
    </section>
  );
}
