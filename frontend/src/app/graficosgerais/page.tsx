"use client";

import { Suspense } from "react";
import { StateChart } from "@/components/statechart";
import { Heatmap } from "@/components/heatmap";
import MunUpCard from "@/components/munupcard";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

// Componente de loading
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-base text-gray-600">Carregando dados...</span>
    </div>
  );
}

// Componente de erro
function ErrorFallback({ error }: { error: string }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-center p-6">
        <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
        <div>
          <h3 className="font-semibold text-red-800">Erro ao carregar dados</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Wrapper para componentes com tratamento de erro
function ComponentWrapper({ 
  children, 
  error, 
  isLoading 
}: { 
  children: React.ReactNode;
  error?: string;
  isLoading?: boolean;
}) {
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorFallback error={error} />;
  return <>{children}</>;
}

export default function GraficosGerais() {
  return (
    <main className="sm:ml-56 sm:p-4 ml-2 p-2 min-h-screen bg-gray-50">
      {/* Header da página */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Gráficos Gerais
        </h1>
        <p className="text-gray-600">
          Visualização geral da qualidade do ar em todos os municípios do Acre
        </p>
      </div>

      {/* Gráfico principal - Estado */}
      <section className="mb-8">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Evolução da Qualidade do Ar por Município
            </h2>
            <Suspense fallback={<LoadingSpinner />}>
              <StateChart />
            </Suspense>
          </CardContent>
        </Card>
      </section>

      {/* Grid de gráficos secundários */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap */}
        <Suspense fallback={<LoadingSpinner />}>
          <Heatmap />
        </Suspense>
        
        {/* Card de municípios */}
        <Suspense fallback={<LoadingSpinner />}>
          <MunUpCard />
        </Suspense>
      </section>

      {/* Informações adicionais */}
      <section className="mt-8">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Sobre os Dados
            </h2>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                • <strong>PM2.5:</strong> Material particulado fino com diâmetro menor que 2,5 micrômetros
              </p>
              <p>
                • <strong>Padrão OMS:</strong> Máximo recomendado de 15 μg/m³ para média diária
              </p>
              <p>
                • <strong>Atualização:</strong> Dados atualizados diariamente às 00:00
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
   