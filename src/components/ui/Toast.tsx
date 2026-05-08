"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastKind = "info" | "success" | "error";
interface Toast { id: string; msg: string; kind: ToastKind; }

interface ToastCtxValue {
  push: (msg: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<ToastCtxValue>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
