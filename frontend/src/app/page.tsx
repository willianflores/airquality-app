"use client";

import { AqTable } from "@/components/aqtable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { ChartNoAxesCombined, ChartArea, LibraryBig, ExternalLink, MapPin, Mail, Instagram } from "lucide-react";
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
    <main className="sm:ml-56 min-h-screen bg-gradient-to-br from-orange-50 to-orange-100" role="main" aria-label="Página inicial do Portal de Qualidade do Ar do Acre">
      {/* Hero Section - Cards principais com melhor responsividade */}
      <section className="bg-backgroundGray py-6 lg:py-12" aria-labelledby="hero-section">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Card do Mapa */}
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-orange-500">
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
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-orange-600">
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
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
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
                      className="text-orange-700 hover:text-orange-800 font-semibold underline decoration-orange-300 hover:decoration-orange-500"
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
                      className="text-orange-700 hover:text-orange-800 font-semibold underline decoration-orange-300 hover:decoration-orange-500"
                    >
                      Ministério Público do Estado do Acre
                    </Link>{" "}
                    em parceria com a{" "}
                    <Link 
                      href={EXTERNAL_LINKS.UFAC} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-orange-700 hover:text-orange-800 font-semibold underline decoration-orange-300 hover:decoration-orange-500"
                    >
                      Universidade Federal do Acre
                    </Link>, além de diversas outras instituições públicas e órgãos ambientais.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2 - LabGAMA */}
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-100 to-orange-200 border-l-4 border-orange-600">
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
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-500">
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
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
                    >
                      API - PurpleAir
                    </Link>, onde foram acessados e processados com linguagem de programação{" "}
                    <Link 
                      href={EXTERNAL_LINKS.PYTHON} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
                    >
                      Python
                    </Link>. Os dados processados foram armazenados em banco de dados{" "}
                    <Link 
                      href={EXTERNAL_LINKS.POSTGRESQL} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
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
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
                    >
                      estudos científicos
                    </Link>{" "}
                    usando a equação desenvolvida pela{" "}
                    <Link 
                      href={EXTERNAL_LINKS.LRAPA_CORRECTION} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
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
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
                    >
                      Next.js
                    </Link>. Todos os códigos fonte serão disponibilizados no{" "}
                    <Link 
                      href={EXTERNAL_LINKS.GITHUB_WILLIAN} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:text-amber-800 font-semibold underline decoration-amber-300 hover:decoration-amber-500"
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

      {/* Seção de Parceiros Institucionais */}
      <section className="bg-white py-12 lg:py-16" aria-labelledby="partners-title">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="partners-title" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Parceiros Institucionais
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Instituições que colaboram com a Rede de Monitoramento da Qualidade do Ar do Acre
            </p>
          </div>
          
          {/* Grid responsivo: empilhado no mobile, lado a lado no desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 lg:gap-16">
            {/* Grupo 1: Responsáveis pela Rede */}
            <div className="flex flex-col">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 text-center mb-6 lg:mb-8">
                Coordenação da Rede
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-8">
                {/* UFAC */}
                <Link 
                  href={EXTERNAL_LINKS.UFAC}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-80"
                  aria-label="Visitar site da Universidade Federal do Acre"
                >
                  <div className="relative w-44 h-28 sm:w-48 sm:h-32">
                    <Image
                      src="/partners/UFAC.png"
                      alt="Logo da Universidade Federal do Acre - UFAC"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 176px, 192px"
                    />
                  </div>
                </Link>

                {/* MPAC */}
                <Link 
                  href={EXTERNAL_LINKS.MPAC}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-80"
                  aria-label="Visitar site do Ministério Público do Estado do Acre"
                >
                  <div className="relative w-44 h-28 sm:w-48 sm:h-32">
                    <Image
                      src="/partners/MPAC.jpeg"
                      alt="Logo do Ministério Público do Estado do Acre - MPAC"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 176px, 192px"
                    />
                  </div>
                </Link>
              </div>
            </div>

            {/* Grupo 2: Cooperação Técnico-Científica */}
            <div className="flex flex-col">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 text-center mb-6 lg:mb-8">
                Cooperação Técnico-Científica
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-8">
                {/* INPE */}
                <Link 
                  href={EXTERNAL_LINKS.INPE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-80"
                  aria-label="Visitar site do Instituto Nacional de Pesquisas Espaciais"
                >
                  <div className="relative w-44 h-28 sm:w-48 sm:h-32">
                    <Image
                      src="/partners/INPE.png"
                      alt="Logo do Instituto Nacional de Pesquisas Espaciais - INPE"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 176px, 192px"
                    />
                  </div>
                </Link>

                {/* Woodwell Climate Research Center */}
                <Link 
                  href={EXTERNAL_LINKS.WOODWELL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-80"
                  aria-label="Visitar site do Woodwell Climate Research Center"
                >
                  <div className="relative w-44 h-28 sm:w-48 sm:h-32">
                    <Image
                      src="/partners/woodwell_climate_research_center.png"
                      alt="Logo do Woodwell Climate Research Center"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 176px, 192px"
                    />
                  </div>
                </Link>
              </div>
            </div>

            {/* Grupo 3: Apoio Técnico e Financeiro */}
            <div className="flex flex-col">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 text-center mb-6 lg:mb-8">
                Apoio Técnico e Financeiro
              </h3>
              <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-8">
                {/* IPAM */}
                <Link 
                  href={EXTERNAL_LINKS.IPAM}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-all duration-300 hover:scale-105 hover:opacity-80"
                  aria-label="Visitar site do Instituto de Pesquisa Ambiental da Amazônia"
                >
                  <div className="relative w-44 h-28 sm:w-48 sm:h-32">
                    <Image
                      src="/partners/IPAM.png"
                      alt="Logo do Instituto de Pesquisa Ambiental da Amazônia - IPAM"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 176px, 192px"
                      priority
                      unoptimized
                    />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="text-gray-800 py-12 px-6 md:px-20 w-full mt-auto" style={{ backgroundColor: '#eeeeee' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {/* Seção LabGAMA */}
            <div>
              <Link 
                href={EXTERNAL_LINKS.LABGAMA}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="relative w-10 h-10 mr-3">
                  <Image
                    src="/labgama/LabGama.png"
                    alt="Logo LabGAMA"
                    fill
                    className="object-contain"
                    sizes="40px"
                  />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">LabGAMA</h3>
              </Link>
              <p className="text-sm mb-4 text-gray-700">
                Laboratório de Geoprocessamento Aplicado ao Meio Ambiente. Promovendo monitoramento e gestão da qualidade do ar no Estado do Acre através de tecnologia e pesquisa.
              </p>
              <p className="text-sm mb-2">
                <Link 
                  href={EXTERNAL_LINKS.LABGAMA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-600 flex items-center text-gray-800"
                >
                  <span className="mr-2">Visite o site do LabGAMA</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </p>
            </div>

            {/* Seção Contato */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Contato</h3>
              <div className="space-y-3">
                <p className="text-sm flex items-start text-gray-700">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-gray-600" />
                  <span>Cruzeiro do Sul, Acre - Brasil</span>
                </p>
                <p className="text-sm flex items-start text-gray-700">
                  <Mail className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-gray-600" />
                  <a href="mailto:labgama@ufac.br" className="hover:text-orange-600 text-gray-800">labgama@ufac.br</a>
                </p>
                <p className="text-sm flex items-start text-gray-700">
                  <Instagram className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-gray-600" />
                  <a 
                    href="https://www.instagram.com/ufac.labgama/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-orange-600 text-gray-800"
                  >
                    @ufac.labgama
                  </a>
                </p>
              </div>
            </div>

            {/* Seção Informações */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Sobre o Projeto</h3>
              <p className="text-sm mb-4 text-gray-700">
                Portal de monitoramento da qualidade do ar do Acre, desenvolvido pelo LabGAMA em parceria com o MPAC e outras instituições.
              </p>
              <p className="text-sm">
                <Link 
                  href={EXTERNAL_LINKS.GITHUB_WILLIAN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-orange-600 text-gray-800"
                >
                  Código fonte no GitHub
                </Link>
              </p>
            </div>
          </div>

          {/* Seção inferior com informações de parceiros e copyright */}
          <div className="border-t border-gray-300 mt-10 pt-6">
            <p className="text-sm text-center mb-2 text-gray-700">
              Responsáveis pela Rede: UFAC e MPAC | Cooperação Técnico-Científica: INPE e Woodwell | Apoio Técnico e Financeiro: IPAM
            </p>
            <p className="text-sm text-center text-gray-600">
              © {new Date().getFullYear()} LabGAMA - UFAC. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
