"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  AlertCircle, 
  CheckCircle2, 
  WifiOff, 
  MapPin, 
  Download, 
  RefreshCw,
  Activity,
  Clock
} from "lucide-react";
import { buildApiUrl } from "@/utils/apiConfig";
import { useDebounce } from "@/hooks/useDebounce";

// Tipos de dados
interface SensorData {
  pm25_10min: number;
  pm25_24h: number;
  confidence: number;
  channel_flags: string;
  last_seen: {
    timestamp: number;
    date: string;
    time: string;
    difference: string;
  };
  coordinates: {
    latitude: number | null;
    longitude: number | null;
  };
}

interface MaintenanceStatus {
  status: 'good' | 'warning' | 'critical';
  color: string;
  message: string;
}

interface Sensor {
  code: string;
  sensor_index: string;
  name: string;
  municipio: string;
  data: SensorData;
  maintenance: MaintenanceStatus;
  purpleair_link: string;
}

interface ApiResponse {
  success: boolean;
  count: number;
  last_updated: string;
  sensors: Sensor[];
}

// Hook para buscar dados dos sensores
function useSensorsData() {
  const [data, setData] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchSensors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = buildApiUrl('sensors');
      console.log('🔍 Buscando dados dos sensores:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }

      const result: ApiResponse = await response.json();
      
      if (result.success && result.sensors) {
        console.log(`✅ Dados carregados: ${result.sensors.length} sensores`);
        setData(result.sensors);
        setLastUpdated(result.last_updated);
      } else {
        throw new Error('Resposta da API não contém dados válidos');
      }
      
    } catch (err) {
      console.error('❌ Erro ao buscar dados dos sensores:', err);
      
      // Se API falhar, mostrar dados mock como fallback
      console.log('⚠️ Usando dados mock como fallback...');
      const mockSensors: Sensor[] = [
        {
          code: "RBR1",
          sensor_index: "25549",
          name: "MPAC_RBR",
          municipio: "Rio Branco",
          data: {
            pm25_10min: 12.5,
            pm25_24h: 15.2,
            confidence: 95,
            channel_flags: "Normal",
            last_seen: {
              timestamp: Date.now() / 1000,
              date: new Date().toLocaleDateString('pt-BR'),
              time: new Date().toLocaleTimeString('pt-BR'),
              difference: "2m 15s"
            },
            coordinates: { latitude: -9.94639, longitude: -67.86611 }
          },
          maintenance: { status: "good", color: "#4CBB17", message: "Sensor funcionando normalmente" },
          purpleair_link: "https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=25549"
        },
        {
          code: "CZS1",
          sensor_index: "31089",
          name: "MPAC_CZS_01_promotoria",
          municipio: "Cruzeiro do Sul",
          data: {
            pm25_10min: 25.8,
            pm25_24h: 22.3,
            confidence: 87,
            channel_flags: "Normal",
            last_seen: {
              timestamp: Date.now() / 1000 - 300,
              date: new Date().toLocaleDateString('pt-BR'),
              time: new Date(Date.now() - 300000).toLocaleTimeString('pt-BR'),
              difference: "5m 0s"
            },
            coordinates: { latitude: -7.62017, longitude: -72.67404 }
          },
          maintenance: { status: "warning", color: "red", message: "Convergência abaixo de 90%" },
          purpleair_link: "https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31089"
        },
        {
          code: "ABR1",
          sensor_index: "31105",
          name: "MPAC_ABR_01_promotoria",
          municipio: "Assis Brasil",
          data: {
            pm25_10min: 8.2,
            pm25_24h: 9.7,
            confidence: 92,
            channel_flags: "Normal",
            last_seen: {
              timestamp: Date.now() / 1000 - 120,
              date: new Date().toLocaleDateString('pt-BR'),
              time: new Date(Date.now() - 120000).toLocaleTimeString('pt-BR'),
              difference: "2m 0s"
            },
            coordinates: { latitude: -10.938992, longitude: -69.567649 }
          },
          maintenance: { status: "good", color: "#4CBB17", message: "Sensor funcionando normalmente" },
          purpleair_link: "https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=31105"
        }
      ];
      
      setData(mockSensors);
      setLastUpdated(new Date().toISOString());
      setError(`API indisponível: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Exibindo dados de demonstração.`);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  return { data, loading, error, lastUpdated, refetch: fetchSensors };
}

// Componente para status de manutenção
function MaintenanceStatusIcon({ status }: { status: MaintenanceStatus }) {
  const iconProps = {
    size: 20,
    style: { color: status.color }
  };

  switch (status.status) {
    case 'good':
      return <CheckCircle2 {...iconProps} />;
    case 'warning':
    case 'critical':
      return <AlertCircle {...iconProps} />;
    default:
      return <WifiOff {...iconProps} />;
  }
}

// Componente para linha da tabela de sensor
function SensorRow({ sensor }: { sensor: Sensor }) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 font-medium text-gray-900">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{sensor.name}</span>
          <span className="text-xs text-gray-500">ID: {sensor.sensor_index}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {sensor.municipio}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-medium">
          {sensor.data.pm25_10min !== null ? sensor.data.pm25_10min.toFixed(1) : 'N/A'}
        </span>
        <span className="text-xs text-gray-500 ml-1">μg/m³</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="font-medium">
          {sensor.data.pm25_24h !== null ? sensor.data.pm25_24h.toFixed(1) : 'N/A'}
        </span>
        <span className="text-xs text-gray-500 ml-1">μg/m³</span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center">
          <span className="text-sm">{sensor.data.last_seen.date}</span>
          <span className="text-xs text-gray-500">{sensor.data.last_seen.time}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {sensor.data.last_seen.difference}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          sensor.data.channel_flags === 'Normal' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {sensor.data.channel_flags}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center">
          <span className="font-medium">
            {sensor.data.confidence !== null ? `${sensor.data.confidence}%` : 'N/A'}
          </span>
          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full ${
                sensor.data.confidence !== null && sensor.data.confidence >= 90 ? 'bg-green-500' : 
                sensor.data.confidence !== null && sensor.data.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${sensor.data.confidence || 0}%` }}
            ></div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          <MaintenanceStatusIcon status={sensor.maintenance} />
          <div className="group relative">
            <AlertCircle 
              size={16} 
              className="text-gray-400 cursor-help"
            />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap max-w-xs">
                {sensor.maintenance.message}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <a
          href={sensor.purpleair_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-full transition-colors"
          title={`Ver ${sensor.name} no mapa PurpleAir`}
          aria-label={`Abrir localização do sensor ${sensor.name} no mapa PurpleAir`}
        >
          <MapPin size={16} />
        </a>
      </td>
    </tr>
  );
}

// Função para exportar dados como CSV
function exportToCSV(sensors: Sensor[]) {
  const headers = [
    'Nome',
    'Município', 
    'PM2.5 (10min) μg/m³',
    'PM2.5 (24h) μg/m³',
    'Data Última Leitura',
    'Tempo Última Leitura',
    'Funcionamento Medidores',
    'Convergência %',
    'Status Manutenção',
    'Link PurpleAir'
  ];

  const rows = sensors.map(sensor => [
    sensor.name,
    sensor.municipio,
    sensor.data.pm25_10min !== null ? sensor.data.pm25_10min.toFixed(1) : 'N/A',
    sensor.data.pm25_24h !== null ? sensor.data.pm25_24h.toFixed(1) : 'N/A',
    sensor.data.last_seen.date + ' ' + sensor.data.last_seen.time,
    sensor.data.last_seen.difference,
    sensor.data.channel_flags,
    sensor.data.confidence !== null ? `${sensor.data.confidence}%` : 'N/A',
    sensor.maintenance.message,
    sensor.purpleair_link
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sensores_mpac_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Componente principal
export function SensorsMonitoringPage() {
  const { data: sensors, loading, error, lastUpdated, refetch } = useSensorsData();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filtrar sensores baseado na busca
  const filteredSensors = useMemo(() => {
    if (!debouncedSearchTerm) return sensors;
    
    const term = debouncedSearchTerm.toLowerCase();
    return sensors.filter(sensor => 
      sensor.name.toLowerCase().includes(term) ||
      sensor.municipio.toLowerCase().includes(term) ||
      sensor.code.toLowerCase().includes(term)
    );
  }, [sensors, debouncedSearchTerm]);

  // Estatísticas dos sensores
  const stats = useMemo(() => {
    const total = sensors.length;
    const good = sensors.filter(s => s.maintenance.status === 'good').length;
    const warning = sensors.filter(s => s.maintenance.status === 'warning').length;
    const critical = sensors.filter(s => s.maintenance.status === 'critical').length;
    
    return { total, good, warning, critical };
  }, [sensors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-lg text-gray-600">Carregando dados dos sensores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Monitoramento de Sensores</h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o status e desempenho da rede de sensores de qualidade do ar do Acre
          </p>
        </div>
        
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Funcionando</p>
                <p className="text-2xl font-bold text-green-600">{stats.good}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Atenção</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <WifiOff className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Crítico</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert de status da API */}
      {error && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Status da API</h4>
                <p className="text-yellow-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-xl">Lista de Sensores da Rede MPAC</CardTitle>
              <CardDescription>
                Informações para subsidiar ações de manutenção dos sensores
                {lastUpdated && (
                  <span className="block mt-1 text-xs">
                    <Clock size={12} className="inline mr-1" />
                    Última atualização: {new Date(lastUpdated).toLocaleString('pt-BR')}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                placeholder="Buscar sensores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Button
                onClick={refetch}
                variant="outline"
                size="default"
              >
                <RefreshCw size={16} className="mr-2" />
                Atualizar
              </Button>
              <Button
                onClick={() => exportToCSV(filteredSensors)}
                variant="outline"
                size="default"
              >
                <Download size={16} className="mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Nome</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Município</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">PM2.5 (10min)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">PM2.5 (24h)</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Data Última Leitura</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Tempo Última Leitura</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Funcionamento Medidores</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Convergência A e B</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Necessidade Manutenção</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Localização</th>
                </tr>
              </thead>
              <tbody>
                {filteredSensors.length > 0 ? (
                  filteredSensors.map((sensor) => (
                    <SensorRow key={sensor.code} sensor={sensor} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      {searchTerm ? 'Nenhum sensor encontrado para a busca.' : 'Nenhum sensor disponível.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}