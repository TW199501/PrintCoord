"use client";

import React from "react";

export default function TemplateFooter() {
  return (
    <footer className="mt-6 flex h-10 items-center justify-between rounded-md border border-dashed border-border/80 bg-muted/40 px-4 text-xs text-muted-foreground">
      <span>
        © {new Date().getFullYear()} TableTemplate Inc. All rights reserved.
      </span>
      <span>版本 1.0.0</span>
    </footer>
  );
}
