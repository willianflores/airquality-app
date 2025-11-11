"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Download, Calendar, FileText, Search, Filter, ExternalLink, Eye, Plus, Edit3 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsClient } from '@/hooks/useIsClient';
import { getReportsStatistics, type Report } from '@/utils/reportsManager';
import reports from '@/data/reports.json';

// Interface removida pois está sendo importada de reportsManager

// Função para formatar data - formatação consistente para evitar hydration errors
const formatDate = (dateString: string): string => {
  const [day, month, year] = dateString.split('/');
  
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const monthIndex = parseInt(month) - 1;
  const monthName = monthNames[monthIndex] || 'mês inválido';
  
  return `${day} de ${monthName} de ${year}`;
};

// Função para obter ano da data
const getYear = (dateString: string): number => {
  const [, , year] = dateString.split('/');
  return parseInt(year);
};

// Componente de filtro moderno
function FilterSection({ 
  searchTerm, 
  setSearchTerm, 
  selectedYear, 
  setSelectedYear, 
  availableYears 
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  availableYears: number[];
}) {
  return (
    <div className="mb-8 space-y-4">
      {/* Barra de pesquisa */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Pesquisar relatórios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
        />
      </div>

      {/* Filtro por ano */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
          >
            <option value="">Todos os anos</option>
            {availableYears.map(year => (
              <option key={year} value={year.toString()}>{year}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Componente de card moderno
function ModernReportCard({ report, index }: { report: Report; index: number }) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Gerar nome de arquivo para download baseado no título
  const generateDownloadName = (title: string, date: string) => {
    const [day, month, year] = date.split('/');
    const datePrefix = `${year}${month}${day}`;
    
    const titleSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .substring(0, 50); // Limita tamanho

    return `${datePrefix}_${titleSlug}.pdf`;
  };

  return (
    <Card 
      className="group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white border-0 shadow-sm overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Imagem com overlay moderno */}
      <div className="relative overflow-hidden">
        {!imageError ? (
          <Image
            src={report.imageUrl}
            alt={`Capa do relatório: ${report.title}`}
            width={400}
            height={240}
            className="w-full h-60 object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
            priority={index < 3}
          />
        ) : (
          <div className="w-full h-60 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <FileText className="h-16 w-16 text-orange-400" />
          </div>
        )}
        
        {/* Overlay com data */}
        <div className="absolute top-4 right-4">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(report.date)}
          </div>
        </div>

        {/* Overlay de hover */}
        <div className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      <CardContent className="p-6">
        {/* Título */}
        <h3 className="font-bold text-lg text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors">
          {report.title}
        </h3>

        {/* Descrição */}
        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
          {report.description}
        </p>

        {/* Ações */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {/* Botão principal de download */}
            <a
              href={report.fileUrl}
              download={generateDownloadName(report.title, report.date)}
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>

            {/* Botão secundário de visualização */}
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors duration-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </a>
          </div>

          {/* Link externo */}
          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

const ModernReportsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const isClient = useIsClient();
  
  // Debounce da pesquisa para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Processar dados de forma otimizada - DEVE estar antes de qualquer retorno condicional
  const { sortedReports, availableYears, filteredReports } = useMemo(() => {
    // Ordenar relatórios por data (mais recente primeiro)
    const sorted = [...reports].sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });

    // Obter anos únicos
    const years = [...new Set(sorted.map(report => getYear(report.date)))].sort((a, b) => b - a);

    // Filtrar relatórios usando debounced search
    const filtered = sorted.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           report.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesYear = !selectedYear || getYear(report.date).toString() === selectedYear;
      return matchesSearch && matchesYear;
    });

    return {
      sortedReports: sorted,
      availableYears: years,
      filteredReports: filtered
    };
  }, [debouncedSearchTerm, selectedYear]);

  // Evita problemas de hidratação mostrando loading enquanto não está no cliente
  if (!isClient) {
    return (
      <div className="container mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-80 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      {/* Seção de filtros */}
      <FilterSection
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        availableYears={availableYears}
      />

      {/* Resultados */}
      <div className="mb-6 text-center">
        <p className="text-gray-600">
          {filteredReports.length === sortedReports.length 
            ? `${filteredReports.length} publicações disponíveis`
            : `${filteredReports.length} de ${sortedReports.length} publicações encontradas`
          }
        </p>
      </div>

      {/* Grid de relatórios */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report, index) => (
            <ModernReportCard 
              key={`${report.title}-${report.date}`} 
              report={report} 
              index={index} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum relatório encontrado
          </h3>
          <p className="text-gray-500">
            Tente ajustar os filtros ou termo de pesquisa
          </p>
        </div>
      )}
    </div>
  );
};

export default ModernReportsPage;
