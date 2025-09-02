"use client";

import { useEffect, useState } from "react";

interface ClientSafeWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wrapper que garante que o conteúdo só seja renderizado no cliente
 * para evitar problemas de hidratação causados por extensões do navegador
 * ou diferenças entre servidor e cliente
 */
export function ClientSafeWrapper({ children, fallback }: ClientSafeWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback || (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return <>{children}</>;
}

