"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { useAirQualityData } from "@/hooks/useApi";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import ClientOnly from "@/components/ClientOnly";

const ReactECharts = dynamic(() => import("echarts-for-react"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-gray-600">Carregando gráfico...</span>
  </div>
});

interface DataProps {
  date: string;
  pm2_5: number;
  municipio: string;
}

interface DataDayProps {
  x: string;
  y: number;
}

// Função otimizada para processar dados
const processMunicipalityData = (data: DataProps[], municipio: string): DataDayProps[] => {
  const filteredData = data.filter((item) => item.municipio === municipio); 

  const processedData = filteredData
    .map((item) => ({
    x: new Date(item.date).toISOString(),
    y: item.pm2_5,
    }))
    .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
    
  return processedData;
};

export function StateChart() {
  const { dailyData, refetchAll } = useAirQualityData();
  
  // Lista completa de municípios do Acre
  const allMunicipios = [
    "Acrelândia", "Assis Brasil", "Brasiléia", "Bujari", "Capixaba",
    "Cruzeiro do Sul", "Epitaciolândia", "Feijó", "Jordão", "Mâncio Lima",
    "Manoel Urbano", "Marechal Thaumaturgo", "Plácido de Castro", "Porto Acre",
    "Porto Walter", "Rio Branco", "Rodrigues Alves", "Santa Rosa do Purus",
    "Sena Madureira", "Senador Guiomard", "Tarauacá", "Xapuri"
  ];

  // Log apenas quando há mudanças significativas
  useEffect(() => {
    if (dailyData.error) {
      console.error('StateChart - Erro:', dailyData.error);
    } else if (dailyData.data && Array.isArray(dailyData.data)) {
      console.log(`StateChart - Dados carregados: ${dailyData.data.length} registros`);
    }
  }, [dailyData.error, dailyData.data]);

  // Processar dados de forma otimizada
  const chartData = useMemo(() => {
    if (!dailyData.data || !Array.isArray(dailyData.data)) {
      return [];
    }

    const series = [];

    // Adicionar séries para todos os municípios (linhas cinzas)
    allMunicipios.forEach(municipio => {
      const municipalityData = processMunicipalityData(dailyData.data as DataProps[], municipio);
      if (municipalityData.length > 0) {
        series.push({
          name: municipio,
        type: 'line',
          data: municipalityData.map(item => [item.x, item.y]),
          showSymbol: false,
        lineStyle: {
            color: '#C0C0C0', // Cor cinza para municípios
            width: 1.5
        },
        itemStyle: {
            color: '#C0C0C0'
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        },
          animation: false
        });
      }
    });

    // Adicionar série para a média (linha vermelha)
    const mediaData = processMunicipalityData(dailyData.data as DataProps[], "media");
    if (mediaData.length > 0) {
      series.push({
        name: "Média",
        type: 'line',
        data: mediaData.map(item => [item.x, item.y]),
        showSymbol: false,
        lineStyle: {
          color: '#E62525', // Cor vermelha para a média
          width: 1.5
        },
        itemStyle: {
          color: '#E62525'
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        },
        animation: false,
        markLine: {
          data: [
            {
              yAxis: 15, // Limite OMS
              lineStyle: {
                color: '#FFA54F',
                type: 'dashed',
                width: 1.2
              },
              label: {
                show: false
              }
            }
          ]
        }
      });
    }

    return series;
  }, [dailyData.data, allMunicipios]);

  // Configuração do gráfico
  const options = useMemo(() => {
    const chartOptions = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const tooltipItems = params.map((item: any) => {
            const value = Math.round(item.data[1]); // Arredonda o valor
            return `${item.seriesName}: ${value} µg/m³`;
          }).join('<br/>');
          return `${new Date(params[0].axisValue).toLocaleDateString('pt-BR')}<br/>${tooltipItems}`;
        }
      },
      grid: {
        bottom: 90,
        top: "8%",
        left: "5%",
        right: "4%"
      },
      toolbox: {
        feature: {
          saveAsImage: {
            title: "Salvar como Imagem",
          }
        }
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        name: 'Tempo',
        nameLocation: 'middle',
        nameTextStyle: {
          fontWeight: 'bold',
          padding: 10
        },
        axisLabel: {
          formatter: function (value: any) {
            return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          }
        }
      },
      yAxis: {
        type: 'value',
        name: 'Média diária de MP2,5 (µg/m³)',
        nameLocation: 'middle',
        nameTextStyle: {
          fontWeight: 'bold',
          padding: 30
        },
        axisLabel: {
          formatter: '{value}'
        }
      },
      series: chartData,
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: 100,
          xAxisIndex: [0]
        },
        {
          type: 'inside',
          start: 0,
          end: 100
        }
      ]
    };

    return chartOptions;
  }, [chartData]);

  // Loading state
  if (dailyData.loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando dados...</span>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (dailyData.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-800">Erro ao carregar dados</h3>
              <p className="text-red-600 text-sm">{dailyData.error}</p>
            </div>
            <button
              onClick={refetchAll}
              className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verificar se há dados
  if (!dailyData.data || !Array.isArray(dailyData.data) || dailyData.data.length === 0) {
  return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
              <div>
                <h3 className="font-semibold text-yellow-800">Nenhum dado disponível</h3>
                <p className="text-yellow-600 text-sm">Não há dados de qualidade do ar para exibir</p>
              </div>
            </div>
            <button
              onClick={refetchAll}
              className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </button>
        </div>
      </CardContent>
    </Card>
    );
  }

  return (
    <ClientOnly fallback={<div className="w-full h-[600px] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Carregando gráfico...</span>
    </div>}>
      <div className="w-full h-[600px]">
        <ReactECharts 
          option={options} 
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          onChartReady={() => console.log('Gráfico carregado com sucesso')}
          onEvents={{
            error: (params: any) => console.error('Erro no gráfico:', params)
          }}
        />
      </div>
    </ClientOnly>
  );
}