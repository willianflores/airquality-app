"use client";

import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SensorsMonitoringPage } from "@/components/sensors-monitoring";
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Activity } from 'lucide-react';

export default function SensoresMonitoramentoPage() {
  const { admin, logout } = useAuth();

  return (
    <ProtectedRoute requireRole={['admin', 'super_admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      Administração MPAC
                    </h1>
                    <p className="text-sm text-gray-500">Monitoramento de Sensores</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{admin?.username}</p>
                  <p className="text-xs text-gray-500 capitalize">{admin?.role?.replace('_', ' ')}</p>
                </div>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1" role="main" aria-label="Página de monitoramento de sensores">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Suspense fallback={<LoadingSpinner className="flex justify-center items-center min-h-[200px]" />}>
              <SensorsMonitoringPage />
            </Suspense>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
