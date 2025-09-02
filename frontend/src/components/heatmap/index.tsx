  "use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ClientOnly from "@/components/ClientOnly";
import { buildApiUrl } from "@/utils/apiConfig";

// Importação dinâmica do componente ECharts para evitar o render SSR
const ReactECharts = dynamic(() => import("echarts-for-react"), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-gray-600">Carregando heatmap...</span>
  </div>
});

interface DataItem {
  mes: number;
  hora: number;
  total: number;
}

// Função para buscar dados da API
const fetchData = async (): Promise<number[][]> => {
  try {
    const url = buildApiUrl('aqmatrix');
    console.log('Heatmap - Fazendo requisição para:', url);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: DataItem[] = await response.json();
    console.log('Heatmap - Dados recebidos:', data.length, 'registros');
    
    return data.map((item) => [item.mes - 1, item.hora, item.total]);
  } catch (error) {
    console.error("Heatmap - Erro ao buscar dados:", error);
    return [];
  }
};

export function Heatmap() {
  const [data, setData] = useState<number[][]>([]);

  useEffect(() => {
    fetchData().then((fetchedData) => setData(fetchedData));
  }, []);

  // Calcula o valor máximo apenas se `data` tiver valores válidos
  const maxVal = data.length > 0 ? Math.max(...data.map(d => d[2])) : 1; // Define 1 como valor padrão para evitar `undefined`

  const options = {
    tooltip: {
      position: "top",
      formatter: (params: any) => {
        const formattedValue = params.value[2].toLocaleString("pt-BR");
        return `Total: ${formattedValue}`;
      },
    },
    grid: {
      show: false,
      height: "75%",
      top: "8%",
      bottom: "5%",
      left: "5%",
      right: "5%",
    },
    toolbox: {
      feature: {
        saveAsImage: {
          title: "Salvar como Imagem",
        }
      }
    },
    xAxis: {
      type: "category",
      data: [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
      ]
    },
    yAxis: {
      type: "category",
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`), 
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: maxVal, // Usa `maxVal` que é 1 caso `data` esteja vazio
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "1%",
    },
    series: [
      {
        name: "Total",
        type: "heatmap",
        data: data,
        label: {
          show: false, 
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base sm:text-xl text-gray-600 select-none">Críticidade da Qualidade do Ar no Acre</CardTitle>
        <CardDescription>Visualização dos meses e horas do dia mais críticos</CardDescription>
      </CardHeader>
      <CardContent>
        <ClientOnly fallback={<div className="h-[630px] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando heatmap...</span>
        </div>}>
          <ReactECharts option={options} style={{ height: "630px", width: "100%" }} />
        </ClientOnly>
      </CardContent>
    </Card>
  );
}

export default Heatmap;


