"use client";

import { Suspense } from "react";
import CardSlect from "@/components/cardslect";
import { HoursChart } from "@/components/hourschart";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

// Componente de loading (padrão de graficosgerais)
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-base text-gray-600">Carregando dados...</span>
    </div>
  );
}

// Componente de erro (padrão de graficosgerais)
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

// Wrapper para componentes com tratamento de erro (padrão de graficosgerais)
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

export default function GraficosMunicipais() {
  return (
    <main className="sm:ml-56 sm:p-4 md:p-6 ml-2 p-2">
      {/* Gráfico de seleção de município */}
      <section className="text-2xl w-full">
        <Suspense fallback={<LoadingSpinner />}>
          <CardSlect />
        </Suspense>
      </section>

      {/* Gráfico de horas */}
      <section className="mt-8 text-2xl w-full">
        <Suspense fallback={<LoadingSpinner />}>
          <HoursChart />
        </Suspense>
      </section>
    </main>
  );
}