"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getReportsStatistics } from "@/utils/reportsManager";
import { useIsClient } from "@/hooks/useIsClient";
import { ClientSafeWrapper } from "@/components/ClientSafeWrapper";
import ModernReportsPage from "@/components/reportspage";
import reports from "@/data/reports.json";

// Componente de loading (padrão da aplicação)
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      <span className="ml-2 text-gray-600">Carregando dados...</span>
    </div>
  );
}

export default function RelatoriosPublicacoes() {
  const isClient = useIsClient();
  
  // Obter estatísticas dinâmicas dos dados apenas no cliente
  const stats = isClient ? getReportsStatistics(reports as any[]) : {
    total: 11,
    yearRange: '2020-2024',
    categories: {},
    recentCount: 4
  };

  return (
    <main className="sm:ml-56 sm:p-4 md:p-6 ml-2 p-2 min-h-screen bg-gray-50">
      {/* Header moderno da página */}
      <div className="mb-8 md:mb-10">
        <div className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl sm:text-4xl md:text-4xl font-bold text-gray-900">
              Publicações e Relatórios
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-lg text-gray-600 max-w-3xl mx-auto">
            Explore nossa coleção de relatórios técnicos, estudos científicos e publicações sobre qualidade do ar e queimadas no Estado do Acre
          </p>
        </div>
        
        {/* Estatísticas dinâmicas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-4 mt-8 max-w-4xl mx-auto">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Publicações</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-orange-500">{stats.yearRange}</div>
            <div className="text-sm text-gray-600">Período</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-amber-600">PDF</div>
            <div className="text-sm text-gray-600">Formato</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="text-2xl font-bold text-orange-600">Gratuito</div>
            <div className="text-sm text-gray-600">Acesso</div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <section>
        <ClientSafeWrapper fallback={<LoadingSpinner />}>
          <Suspense fallback={<LoadingSpinner />}>
            <ModernReportsPage />
          </Suspense>
        </ClientSafeWrapper>
      </section>
    </main>
  );
}