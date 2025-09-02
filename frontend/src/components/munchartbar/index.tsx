"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { buildApiUrl } from '@/utils/apiConfig';

// Importação dinâmica do componente ECharts para evitar o render SSR
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface Pm25Data {
  municipio: string;
  year: number;
  days_up: number;
}

// Função para buscar dados da API
const fetchData = async (): Promise<Pm25Data[]> => {
  try {
    const url = buildApiUrl('mundaysup');
    console.log('MunChartBar - Fazendo requisição para:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: Pm25Data[] = await response.json();
    console.log('MunChartBar - Dados recebidos:', data.length, 'registros');
    
    return data;
  } catch (error) {
    console.error("MunChartBar - Erro ao buscar dados:", error);
    return [];
  }
};

export function Pm25Chart() {
  const [data, setData] = useState<Pm25Data[]>([]);

  useEffect(() => {
    fetchData().then((fetchedData) => setData(fetchedData));
  }, []);

  // Extrai os anos e municípios únicos para as labels
  const uniqueYears = Array.from(new Set(data.map(item => item.year)));
  const uniqueMunicipios = Array.from(new Set(data.map(item => item.municipio)));

  // Organiza dados para cada série do gráfico de barras (cada município será uma série)
  const seriesData = uniqueMunicipios.map(municipio => ({
    name: municipio,
    type: "bar",
    data: uniqueYears.map(year => {
      const entry = data.find(d => d.municipio === municipio && d.year === year);
      return entry ? entry.days_up : 0;
    }),
  }));

  const options = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => {
        return params.map((item: any) => {
          return `${item.marker} ${item.seriesName}: ${item.value}`;
        }).join("<br />");
      },
    },
    legend: {
      data: uniqueMunicipios,
      top: "top",
      type: "scroll",
    },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: uniqueYears,
      axisLabel: {
        fontSize: 12,
      },
    },
    yAxis: {
      type: "value",
      name: "Dias Acima",
    },
    series: seriesData,
    color: [
      "#7eb6ff", "#4a90e2", "#276fbf", "#1b5ba5", "#133f7f", // Azul para os primeiros municípios
      "#ffb47e", "#e27d4a", "#bf5c27", "#a5441b", "#7f2c13", // Laranja para outros
      "#ff7ec6", "#e24a9e", "#bf2768", "#a51b50", "#7f133b", // Rosa para mais alguns
      // Adicione mais cores se houver mais municípios
    ],
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base sm:text-xl text-gray-600 select-none">Material Particulado no Ar nos Municípios</CardTitle>
        <CardDescription>* Dados da Rede de Qualidade do Ar do Acre.</CardDescription>
      </CardHeader>
      <CardContent>
        <ReactECharts option={options} style={{ height: "600px", width: "100%" }} />
      </CardContent>
    </Card>
  );
}

export default Pm25Chart;
