"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as echarts from "echarts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useApi } from "@/hooks/useApi";
import { Loader2, AlertCircle } from "lucide-react";
import ClientOnly from "@/components/ClientOnly";
import { buildApiUrl } from '@/utils/apiConfig';

// Tipos de dados
interface DataPoint {
    date: string;
    pm2_5: number;
    municipio: string;
}

interface DataProps {
    x: string;
    y: number;
}

interface ChartMunProps {
    data: DataProps[];
}

// Hook para dados de município com cache
function useMunicipalityData(municipio: string) {
  return useApi<DataPoint[]>({
    url: `day/municipio?municipio=${encodeURIComponent(municipio)}`, // URL relativa
    cacheTime: 5 * 60 * 1000, // 5 minutos de cache
    dependencies: [municipio]
  });
}

// Componente do gráfico otimizado
export const ChartMun: React.FC<ChartMunProps> = ({ data }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstanceRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        // Limpar instância anterior se existir
        if (chartInstanceRef.current) {
            chartInstanceRef.current.dispose();
        }

        const chartInstance = echarts.init(chartRef.current);
        chartInstanceRef.current = chartInstance;

        // Definindo intervalo dinâmico baseado no tamanho dos dados
        const interval = data.length > 50 ? Math.floor(data.length / 10) : 0;

        const option = {
            xAxis: {
                type: "category" as const,
                name: 'Tempo', // Rótulo do eixo X
                nameLocation: 'middle' as const, // Centraliza o rótulo do eixo X
                nameTextStyle: {
                  fontWeight: 'bold' as const,
                  padding: 20 // Adiciona espaço entre o eixo e o rótulo
                },          
                data: data.map((d) => d.x),
                axisLabel: {
                    interval,
                    formatter: (value: string, index: number) => {
                        const date = new Date(value);
                        const month = date.toLocaleString('pt-BR', { month: 'short' });
                        const year = date.getFullYear();

                        if (index === 0 || new Date(data[index - 1].x).getFullYear() !== year) {
                            return `${month} ${year}`;
                        } else {
                            return `${month}`;
                        }
                    },
                },
            },
            yAxis: {
                type: "value" as const,
                name: 'Média diária de MP2,5 (µg/m³)', // Rótulo do eixo Y
                nameLocation: 'middle' as const, // Centraliza o rótulo do eixo Y
                nameTextStyle: {
                    fontWeight: 'bold' as const,
                    padding: 30 // Adiciona espaço entre o eixo e o rótulo
                },
                axisLabel: {
                    formatter: '{value}'
                }
            },
            series: [
                {
                    data: data.map((d) => d.y),
                    type: "line" as const,
                    smooth: true,
                    areaStyle: {},
                    symbol: 'circle',  
                    symbolSize: 8,     
                    itemStyle: {
                        color: "#FF3030",
                    },
                    emphasis: {
                        itemStyle: {
                            color: "#FF0000", 
                            borderColor: "#FF3030",
                            borderWidth: 2,
                        },
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
                    },


                },
            ],
            tooltip: {
                trigger: "axis" as const,
                formatter: (params: any) => {
                    const date = new Date(params[0].axisValue);
                    const day = date.getDate();
                    const month = date.toLocaleString('pt-BR', { month: 'short' });
                    const year = date.getFullYear();
                    const value = Math.round(params[0].data);
                    return `<b>${day} ${month} ${year}</b>: ${value} µg/m³`;
                },
                axisPointer: {
                    type: "line" as const,
                    label: {
                        backgroundColor: "#FF3030",
                    },
                },
            },
        };

        chartInstance.setOption(option);

        const handleResize = () => {
            chartInstance.resize();
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartInstanceRef.current) {
                chartInstanceRef.current.dispose();
                chartInstanceRef.current = null;
            }
        };
    }, [data]);

    return <div ref={chartRef} className="w-full h-full" />;
};



// Lista de municípios (constante para evitar re-renders)
const MUNICIPIOS = [
    "Acrelândia", "Assis Brasil", "Brasiléia", "Bujari", "Capixaba", "Cruzeiro do Sul", 
    "Epitaciolândia", "Feijó", "Jordão", "Mâncio Lima", "Manoel Urbano", "Marechal Thaumaturgo", 
    "Plácido de Castro", "Porto Acre", "Porto Walter", "Rio Branco", "Rodrigues Alves", 
    "Santa Rosa do Purus", "Sena Madureira", "Senador Guiomard", "Tarauacá", "Xapuri"
] as const;

// Componente principal otimizado
export default function CardSlect() {
    const [selectedMunicipio, setSelectedMunicipio] = useState("Rio Branco");
    
    // Hook otimizado para buscar dados
    const { data: rawData, loading, error, refetch } = useMunicipalityData(selectedMunicipio);

    // Processar dados de forma otimizada
    const processedData = useMemo(() => {
        if (!rawData || !Array.isArray(rawData)) return [];
        
        return rawData.map((item) => ({
            x: new Date(item.date).toISOString(),
            y: item.pm2_5,
        }));
    }, [rawData]);

    // Handler otimizado para mudança de município
    const handleMunicipalityChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newMunicipio = event.target.value;
        if (newMunicipio !== selectedMunicipio) {
            setSelectedMunicipio(newMunicipio);
        }
    }, [selectedMunicipio]);

    // Loading state
    if (loading) {
        return (
            <Card className="shadow-2xl h-full w-full">
                <CardContent className="flex items-center justify-center p-8 h-[600px]">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando dados de {selectedMunicipio}...</span>
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (error) {
        return (
            <Card className="shadow-2xl h-full w-full border-red-200 bg-red-50">
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
                            onClick={refetch}
                            className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        >
                            Tentar novamente
                        </button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-2xl h-full w-full">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                <div>
                    <CardTitle className="text-lg sm:text-xl text-gray-600 select-none">
                        Concentração de material particulado atmosféricos nos municípios do Acre
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                        Concentração PM2.5 para cada município, média de 24 horas
                    </CardDescription>
                </div>
                <select
                    className="mt-2 sm:mt-0 block w-56 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    onChange={handleMunicipalityChange}
                    value={selectedMunicipio}
                    aria-label="Selecionar município"
                >
                    <option value="" disabled>Selecione o Município</option>
                    {MUNICIPIOS.map((municipio) => (
                        <option key={municipio} value={municipio}>
                            {municipio}
                        </option>
                    ))}
                </select>
            </CardHeader>
            <CardContent className="h-[600px] p-0">
                <ClientOnly fallback={<div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Carregando gráfico...</span>
                </div>}>
                    <ChartMun data={processedData} />
                </ClientOnly>
            </CardContent>
        </Card>
    );
}
