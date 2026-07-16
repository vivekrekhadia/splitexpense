"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "error" | "success";

export interface ToastMessage {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
}

export function Toast({ id, message, variant = "default", onDismiss }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg text-sm pointer-events-auto",
        variant === "error" && "bg-red-50 border-red-200 text-[#FF6B6B]",
        variant === "success" && "bg-green-50 border-green-200 text-[#5BC5A7]",
        variant === "default" && "bg-white border-gray-200 text-[#1A1A2E]",
      )}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
