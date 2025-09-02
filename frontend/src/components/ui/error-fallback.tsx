import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
  className?: string;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  title = "Algo deu errado",
  message,
  showRetry = true,
  className = ""
}: ErrorFallbackProps) {
  const errorMessage = message || error?.message || "Ocorreu um erro inesperado. Tente novamente.";

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {errorMessage}
      </p>
      
      {showRetry && resetError && (
        <Button onClick={resetError} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}

// Wrapper component que pode ser usado como Error Boundary
interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

export function ErrorBoundaryWrapper({ 
  children, 
  fallback: FallbackComponent = ErrorFallback 
}: ErrorBoundaryWrapperProps) {
  return (
    <React.Suspense fallback={<div>Carregando...</div>}>
      {children}
    </React.Suspense>
  );
}
