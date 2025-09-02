"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import * as echarts from 'echarts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import ClientOnly from "@/components/ClientOnly";
import { getCurrentDateTime } from "@/utils/dateFormatter";
import { buildApiUrl } from '@/utils/apiConfig';

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

const dataDay = async (): Promise<{ data: DataProps[]; error?: string }> => {
    try {
      // Obtém a data e hora atual no formato "YYYY-MM-DD HH:mm:ss"
      const currentDateTime = getCurrentDateTime();
 
      // Fazer a requisição para a API utilizando a data atual
      const url = buildApiUrl(`hour?date=${encodeURIComponent(currentDateTime)}`);
      console.log('HoursChart - Fazendo requisição para:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
  
      return { data };
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Erro ao carregar dados'
      };
    }
  };

const getDay = (data: DataProps[], municipio: string): DataDayProps[] => {
  // Filtrar os dados pelo município
  const filteredData = data.filter((item) => item.municipio === municipio); 

  return filteredData.map((item) => ({
    x: new Date(item.date).toISOString(),
    y: item.pm2_5,
  }));
};

export function HoursChart() {
  const [allData, setAllData] = useState<DataProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seriesUp, setSeriesUp] = useState<DataDayProps[]>([]);
  const [seriesAcrelandia, setSeriesAcrelandia] = useState<DataDayProps[]>([]);
  const [seriesAssisBrasil, setSeriesAssisBrasil] = useState<DataDayProps[]>([]);
  const [seriesBrasileia, setSeriesBrasileia] = useState<DataDayProps[]>([]);
  const [seriesBujari, setSeriesBujari] = useState<DataDayProps[]>([]);
  const [seriesCapixaba, setSeriesCapixaba] = useState<DataDayProps[]>([]);
  const [seriesCruzeiroDoSul, setSeriesCruzeiroDoSul] = useState<DataDayProps[]>([]);
  const [seriesEpitaciolandia, setSeriesEpitaciolandia] = useState<DataDayProps[]>([]);
  const [seriesFeijo, setSeriesFeijo] = useState<DataDayProps[]>([]);
  const [seriesJordao, setSeriesJordao] = useState<DataDayProps[]>([]);
  const [seriesMancioLima, setSeriesMancioLima] = useState<DataDayProps[]>([]);
  const [seriesManoelUrbano, setSeriesManoelUrbano] = useState<DataDayProps[]>([]);
  const [seriesMarechalThaumaturgo, setSeriesMarechalThaumaturgo] = useState<DataDayProps[]>([]);
  const [seriesPlacidoDeCastro, setSeriesPlacidoDeCastro] = useState<DataDayProps[]>([]);
  const [seriesPortoAcre, setSeriesPortoAcre] = useState<DataDayProps[]>([]);
  const [seriesPortoWalter, setSeriesPortoWalter] = useState<DataDayProps[]>([]);
  const [seriesRioBranco, setSeriesRioBranco] = useState<DataDayProps[]>([]);
  const [seriesRodriguesAlves, setSeriesRodriguesAlves] = useState<DataDayProps[]>([]);
  const [seriesSantaRosaDoPurus, setseriesSantaRosaDoPurus] = useState<DataDayProps[]>([]);
  const [seriesSenaMadureira, setseriesSenaMadureira] = useState<DataDayProps[]>([]);
  const [seriesSenadorGuomard, setseriesSenadorGuiomard] = useState<DataDayProps[]>([]);
  const [seriesTarauaca, setseriesTarauaca] = useState<DataDayProps[]>([]);
  const [seriesXapuri, setseriesXapuri] = useState<DataDayProps[]>([]);
  const [seriesMedia, setSeriesMedia] = useState<DataDayProps[]>([]);

  useEffect(() => {
    const getData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await dataDay();
        
        if (result.error) {
          setError(result.error);
        } else {
          setAllData(result.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, []);

  useEffect(() => {
    if (allData.length > 0) {
      const upFormatedData = getDay(allData, "up_pm2_5");
      setSeriesUp(upFormatedData);

      const acrelandiaData = getDay(allData, "Acrelândia");
      setSeriesAcrelandia(acrelandiaData);

      const assisBrasilData = getDay(allData, "Assis Brasil");
      setSeriesAssisBrasil(assisBrasilData);

      const brasileiaData = getDay(allData, "Brasiléia");
      setSeriesBrasileia(brasileiaData);

      const bujariData = getDay(allData, "Bujari");
      setSeriesBujari(bujariData);

      const capixabaData = getDay(allData, "Capixaba");
      setSeriesCapixaba(capixabaData);

      const cruzeirodosulData = getDay(allData, "Cruzeiro do Sul");
      setSeriesCruzeiroDoSul(cruzeirodosulData);

      const epitaciolandiaData = getDay(allData, "Epitaciolândia");
      setSeriesEpitaciolandia(epitaciolandiaData);

      const feijoData = getDay(allData, "Feijó");
      setSeriesFeijo(feijoData);

      const jordaoData = getDay(allData, "Jordão");
      setSeriesJordao(jordaoData);

      const manciolimaData = getDay(allData, "Mâncio Lima");
      setSeriesMancioLima(manciolimaData);

      const manoelurbanoData = getDay(allData, "Manoel Urbano");
      setSeriesManoelUrbano(manoelurbanoData);

      const marechalthaumaturgoData = getDay(allData, "Marechal Thaumaturgo");
      setSeriesMarechalThaumaturgo(marechalthaumaturgoData);

      const placidodecastroData = getDay(allData, "Plácido de Castro");
      setSeriesPlacidoDeCastro(placidodecastroData);

      const portoacreData = getDay(allData, "Porto Acre");
      setSeriesPortoAcre(portoacreData);

      const portowalterData = getDay(allData, "Porto Walter");
      setSeriesPortoWalter(portowalterData);

      const riobrancoData = getDay(allData, "Rio Branco");
      setSeriesRioBranco(riobrancoData);

      const rodriguesalvesData = getDay(allData, "Rodrigues Alves");
      setSeriesRodriguesAlves(rodriguesalvesData);

      const santarosadopurusData = getDay(allData, "Santa Rosa do Purus");
      setseriesSantaRosaDoPurus(santarosadopurusData);

      const senamadureiraData = getDay(allData, "Sena Madureira");
      setseriesSenaMadureira(senamadureiraData);

      const senadorguiomardData = getDay(allData, "Senador Guiomard");
      setseriesSenadorGuiomard(senadorguiomardData);

      const tarauacaData = getDay(allData, "Tarauacá");
      setseriesTarauaca(tarauacaData);

      const xapuriData = getDay(allData, "Xapuri");
      setseriesXapuri(xapuriData);

      const mediaData = getDay(allData, "media");
      setSeriesMedia(mediaData);
    }
  }, [allData]);

  const options = {
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const tooltipItems = params.map((item: any) => {
          const value = Math.round(item.data[1]); // Arredonda o valor para 0 casas decimais
          return `${item.seriesName}: ${value} µg/m³`;
        }).join('<br/>');
        return `${new Date(params[0].axisValue).toLocaleDateString('pt-BR')}<br/>${tooltipItems}`;
      }
    },
    grid: {
      bottom: 90,
      top: "8%",
      left: "5%",
      right: "4%",  // Aumente o valor para criar mais espaço entre o eixo X e o dataZoom
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
      name: 'Tempo', // Rótulo do eixo X
      nameLocation: 'middle', // Centraliza o rótulo do eixo X
      nameTextStyle: {
        fontWeight: 'bold',
        padding: 10 // Adiciona espaço entre o eixo e o rótulo
      },
      axisLabel: {
        formatter: function (value: any) {
          return new Date(value).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        }
      }
    },
    yAxis: {
      type: 'value',
      name: 'Média horária de MP2,5 (µg/m³)', // Rótulo do eixo Y
      nameLocation: 'middle', // Centraliza o rótulo do eixo Y
      nameTextStyle: {
        fontWeight: 'bold',
        padding: 30 // Adiciona espaço entre o eixo e o rótulo
      },
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: "Acrelândia",
        type: 'line',
        data: seriesAcrelandia.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        itemStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Assis Brasil",
        type: 'line',
        data: seriesAssisBrasil.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Brasiléia",
        type: 'line',
        data: seriesBrasileia.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Bujari",
        type: 'line',
        data: seriesBujari.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Capixaba",
        type: 'line',
        data: seriesCapixaba.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        },
      },
      {
        name: "Cruzeiro do Sul",
        type: 'line',
        data: seriesCruzeiroDoSul.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Epitaciolândia",
        type: 'line',
        data: seriesEpitaciolandia.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Feijó",
        type: 'line',
        data: seriesFeijo.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Jordão",
        type: 'line',
        data: seriesJordao.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Mâncio Lima",
        type: 'line',
        data: seriesMancioLima.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Manoel Urbano",
        type: 'line',
        data: seriesManoelUrbano.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Marechal Thaumaturgo",
        type: 'line',
        data: seriesMarechalThaumaturgo.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Plácido de Castro",
        type: 'line',
        data: seriesPlacidoDeCastro.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Porto Acre",
        type: 'line',
        data: seriesPortoAcre.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Porto Walter",
        type: 'line',
        data: seriesPortoWalter.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Rio Branco",
        type: 'line',
        data: seriesRioBranco.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da；rias média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Rodrigues Alves",
        type: 'line',
        data: seriesRodriguesAlves.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Santa Rosa do Purus",
        type: 'line',
        data: seriesSantaRosaDoPurus.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Sena Madureira",
        type: 'line',
        data: seriesSenaMadureira.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Senador Guiomard",
        type: 'line',
        data: seriesSenadorGuomard.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Tarauacá",
        type: 'line',
        data: seriesTarauaca.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha daserie Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Xapuri",
        type: 'line',
        data: seriesXapuri.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#C0C0C0', // Cor cinza para as séries
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#C0C0C0' // Cor cinza para as séries
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        }
      },
      {
        name: "Média",
        type: 'line',
        data: seriesMedia.map((point) => [point.x, point.y]),
        showSymbol: false, // Remove os pontos
        lineStyle: {
          color: '#E62525', // Cor vermelha para a série Média
          width: 1.5 // Largura da linha da série Média
        },
        itemStyle: {
          color: '#E62525' // Cor vermelha para a série Média
        },
        emphasis: {
          focus: 'series',
          blurScope: 'coordinateSystem'
        },
        markLine: {
          data: [
            {
              yAxis: 15, // Valor da linha horizontal
              lineStyle: {
                color: '#FFA54F', // Cor da linha
                type: 'dashed', // Linha pontilhada
                width: 1.2 // Largura da linha
              },
              label: {
                show: false, // Exibir o rótulo na linha
                formatter: 'Limite: máximo diário da OMS', // Texto do rótulo
                position: 'end' // Posição do rótulo (início, centro ou fim)
              }
            }
          ]
        }
      },
      {
        name: "Horas com PM2,5 > 15 \xB5g/m3 Média",
        type: 'scatter',  // Tipo scatter
        data: seriesUp.map((point) => [point.x, point.y]), // Mapeando os dados do seriesUp
        symbolSize: 6,  // Tamanho dos pontos
        itemStyle: {
          color: '#000000'  // Cor dos pontos
        },
        z: 10 // Define que esta série será renderizada sobre as demais
      },
    ],
    dataZoom: [
      {
        type: 'slider', // Pode ser 'inside' para permitir zoom via rolagem
        start: 0, // Começar com 0% do conjunto de dados
        end: 100, // Mostrar 100% do conjunto de dados
        xAxisIndex: [0], // Aplicar o zoom no eixo x
        //bottom: 20  // Posiciona o dataZoom um pouco acima da base do container
      },
      {
        type: 'inside', // Isso permite fazer zoom diretamente com scroll do mouse
        start: 0,
        end: 100
      }
    ]
  };

  // Loading state (padrão de graficosgerais)
  if (loading) {
    return (
      <Card className="shadow-2xl">
        <CardContent className="flex items-center justify-center p-8 h-[700px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando dados...</span>
        </CardContent>
      </Card>
    );
  }

  // Error state (padrão de graficosgerais)
  if (error) {
    return (
      <Card className="shadow-2xl border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold text-red-800">Erro ao carregar dados</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
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

  // Verificar se há dados (padrão de graficosgerais)
  if (!allData || allData.length === 0) {
    return (
      <Card className="shadow-2xl border-yellow-200 bg-yellow-50">
        <CardContent className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-800">Nenhum dado disponível</h3>
              <p className="text-yellow-600 text-sm">Não há dados de qualidade do ar para exibir</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl">
      <CardHeader className="flex items-left justify-left">
        <CardTitle className="text-base sm:text-xl text-gray-600 select-none">
          Média de hora de MP2.5 por Município
        </CardTitle>
        <CardDescription>Situação do ano corrente de PM2.5, média de 1 hora</CardDescription>
      </CardHeader>
      <CardContent>
        <ClientOnly fallback={<div className="flex items-center justify-center h-[600px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Carregando gráfico...</span>
        </div>}>
          <div className="w-full h-[600px]">
            <ReactECharts 
              option={options} 
              style={{ width: '100%', height: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </ClientOnly>
      </CardContent>
    </Card>
  );
}