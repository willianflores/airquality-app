"use client";

import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: string[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireRole = [], 
  redirectTo = '/admin/login' 
}: ProtectedRouteProps) {
  const { admin, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push(redirectTo);
        return;
      }

      if (requireRole.length > 0 && admin && !requireRole.includes(admin.role)) {
        router.push('/admin/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, admin, requireRole, router, redirectTo]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Não renderizar se não autenticado
  if (!isAuthenticated) {
    return null;
  }

  // Verificar role se especificado
  if (requireRole.length > 0 && admin && !requireRole.includes(admin.role)) {
    return null;
  }

  return <>{children}</>;
}
