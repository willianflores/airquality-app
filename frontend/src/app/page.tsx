"use client";

import { AqTable } from "@/components/aqtable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { ChartNoAxesCombined, ChartArea, LibraryBig } from "lucide-react";
import { EXTERNAL_LINKS, IFRAME_CONFIG } from "@/config/constants";

// Lazy loading do componente Team para melhor performance
const LazyTeam = dynamic(() => import("@/components/team").then(mod => ({ default: mod.Team })), {
  loading: () => <LoadingSpinner className="py-16" />,
  ssr: false
});

// Componente para o iframe com loading state e proporções otimizadas
function PurpleAirMap() {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <div className="relative">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg z-10">
          <LoadingSpinner />
        </div>
      )}
      {/* Container responsivo com altura otimizada para diferentes dispositivos */}
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-100 shadow-sm">
        <iframe 
          src={IFRAME_CONFIG.PURPLEAIR_MAP.src}
          title={IFRAME_CONFIG.PURPLEAIR_MAP.title}
          aria-label={IFRAME_CONFIG.PURPLEAIR_MAP.ariaLabel}
          className="w-full border-0 h-80 sm:h-96 md:h-[450px] lg:h-[500px]"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setIsLoaded(true)}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="sm:ml-56 min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50" role="main" aria-label="Página inicial do Portal de Qualidade do Ar do Acre">
      {/* Hero Section - Cards principais com melhor responsividade */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12" aria-labelledby="hero-section">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Card do Mapa */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-emerald-500">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center"> 
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-gray-800 text-center font-semibold">
                  Monitoramento da Qualidade do Ar no Acre
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <Suspense fallback={<LoadingSpinner className="h-64" />}>
                <PurpleAirMap />
              </Suspense>
            </CardContent>
          </Card>

          {/* Card da Tabela */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-blue-500">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-center"> 
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-gray-800 text-center font-semibold">
                  Escalas de Qualidade do Ar
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <AqTable/>
            </CardContent>
          </Card>
        </div>

        {/* Call-to-Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 lg:mt-12">
          <Button asChild size="lg" className="shadow-md hover:shadow-lg">
            <Link href="/graficosgerais" aria-label="Visualizar gráficos gerais da qualidade do ar">
              <ChartNoAxesCombined className="mr-2 h-5 w-5" />
              Ver Gráficos Gerais
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg">
            <Link href="/graficosmunicipais" aria-label="Visualizar gráficos municipais da qualidade do ar">
              <ChartArea className="mr-2 h-5 w-5" />
              Gráficos Municipais
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="shadow-md hover:shadow-lg">
            <Link href="/relatoriosepublicacoes" aria-label="Acessar relatórios e publicações">
              <LibraryBig className="mr-2 h-5 w-5" />
              Relatórios e Publicações
            </Link>
          </Button>
        </div>
      </section>
      {/* Seção sobre a Rede de Monitoramento */}
      <section className="bg-white py-12 lg:py-16" aria-labelledby="monitoring-network-title">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="monitoring-network-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              A Rede de Monitoramento da Qualidade do Ar do Acre
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Conheça a maior rede de monitoramento da qualidade do ar da Amazônia
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1 - Estabelecimento da Rede */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-gray-800 font-semibold leading-tight">
                  O Estabelecimento da Rede de Monitoramento da Qualidade do Ar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
                  <p>
                    Em junho 2019 se tornou operacional a maior rede de monitoramento da qualidade do ar da Amazônia, baseada em sensores{" "}
                    <Link 
                      href={EXTERNAL_LINKS.PURPLEAIR_SENSOR} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-300 hover:decoration-emerald-500"
                    >
                      PurpleAir PA-II-SD
                    </Link>{" "}
                    de baixo custo e conceito inovador da Internet das Coisas (IoT) que se conecta a uma rede internacional, com disponibilização de dados em tempo real e de forma gratuita. Foram instalados 30 sensores, distribuídos nas sedes dos 22 municípios do Estado do Acre.
                  </p>
                  <p>
                    Esta ação foi realizada pelo{" "}
                    <Link 
                      href={EXTERNAL_LINKS.MPAC} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-300 hover:decoration-emerald-500"
                    >
                      Ministério Público do Estado do Acre
                    </Link>{" "}
                    em parceria com a{" "}
                    <Link 
                      href={EXTERNAL_LINKS.UFAC} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 font-semibold underline decoration-emerald-300 hover:decoration-emerald-500"
                    >
                      Universidade Federal do Acre
                    </Link>, além de diversas outras instituições públicas e órgãos ambientais.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 - LabGAMA */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-gray-800 font-semibold leading-tight">
                  O Laboratório de Geoprocessamento Aplicado ao Meio Ambiente - LabGAMA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
                  <p>
                    O Laboratório de Geoprocessamento Aplicado ao Meio Ambiente (LabGAMA) foi criado em 2013 na Universidade Federal do Acre com a missão de aplicar técnicas e ferramentas de geoprocessamento e sensoriamento remoto para compreender melhor o ambiente em que vivemos.
                  </p>
                  <p>
                    Atualmente o LabGAMA vem desenvolvendo, em parceria com diversas instituições, ações relacionadas à Rede de Monitoramento da Qualidade do Ar do Acre. Essas ações estão sendo lideradas pelo Dr. Willian Flores e contemplam monitoramento e gestão da rede, processamento de dados e produção de informação sobre qualidade do ar no Estado do Acre.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 3 - Dados e Códigos */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl text-gray-800 font-semibold leading-tight">
                  Sobre os Dados e Códigos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
                  <p>
                    Os dados dos sensores PurpleAir estão disponíveis na{" "}
                    <Link 
                      href={EXTERNAL_LINKS.PURPLEAIR_API} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      API - PurpleAir
                    </Link>, onde foram acessados e processados com linguagem de programação{" "}
                    <Link 
                      href={EXTERNAL_LINKS.PYTHON} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      Python
                    </Link>. Os dados processados foram armazenados em banco de dados{" "}
                    <Link 
                      href={EXTERNAL_LINKS.POSTGRESQL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      PostgreSQL
                    </Link>.
                  </p>
                  <p>
                    Para melhorar a acurácia, aplicamos correções baseadas em{" "}
                    <Link 
                      href={EXTERNAL_LINKS.SCIENTIFIC_STUDY} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      estudos científicos
                    </Link>{" "}
                    usando a equação desenvolvida pela{" "}
                    <Link 
                      href={EXTERNAL_LINKS.LRAPA_CORRECTION} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      LRAPA
                    </Link>.
                  </p>
                  <p>
                    Esta página web foi desenvolvida usando o Framework{" "}
                    <Link 
                      href={EXTERNAL_LINKS.NEXTJS} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      Next.js
                    </Link>. Todos os códigos fonte serão disponibilizados no{" "}
                    <Link 
                      href={EXTERNAL_LINKS.GITHUB_WILLIAN} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-semibold underline decoration-green-300 hover:decoration-green-500"
                    >
                      GitHub
                    </Link>{" "}
                    do Dr. Willian Flores.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Seção da Equipe com Lazy Loading */}
      <section className="bg-gray-50 py-12 lg:py-16" aria-label="Equipe de pesquisadores envolvidos">
        <Suspense fallback={<LoadingSpinner className="py-16" />}>
          <LazyTeam />
        </Suspense>
      </section>
    </main>
  );
}
