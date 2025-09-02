import { useState, useEffect, useCallback } from 'react';
import { useIsClient } from './useIsClient';
import { getApiBaseUrl, buildApiUrl, API_CONFIG } from '@/utils/apiConfig';

interface UseApiOptions<T> {
  url: string;
  dependencies?: any[];
  cacheTime?: number;
  retryAttempts?: number;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache simples para evitar requisições desnecessárias
const cache = new Map<string, { data: any; timestamp: number }>();

export function useApi<T>({ 
  url, 
  dependencies = [], 
  cacheTime = API_CONFIG.cacheTime,
  retryAttempts = API_CONFIG.retryAttempts 
}: UseApiOptions<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isClient = useIsClient();

  const fetchData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Construir URL completa dinamicamente
      const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
      
      // Verificar cache
      const cached = cache.get(fullUrl);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      // Fazer requisição com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
      
      const response = await fetch(fullUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Salvar no cache
      cache.set(fullUrl, { data: result, timestamp: Date.now() });
      
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error('Erro na requisição:', err);
      
      // Tentar novamente se ainda há tentativas
      if (retryCount < retryAttempts) {
        setTimeout(() => fetchData(retryCount + 1), API_CONFIG.retryDelay * (retryCount + 1));
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Erro de conexão com a API');
      setLoading(false);
    }
  }, [url, cacheTime, retryAttempts]);

  const refetch = useCallback(() => {
    const fullUrl = url.startsWith('http') ? url : buildApiUrl(url);
    cache.delete(fullUrl); // Limpar cache para forçar nova requisição
    fetchData();
  }, [url, fetchData]);

  useEffect(() => {
    // Só fazer requisições no lado do cliente
    if (isClient) {
      fetchData();
    }
  }, [isClient, fetchData, ...dependencies]);

  return { data, loading, error, refetch };
}

// Hook específico para dados de qualidade do ar
export function useAirQualityData() {
  const dailyData = useApi({
    url: 'day', // URL relativa - será resolvida automaticamente
    cacheTime: 10 * 60 * 1000, // 10 minutos para dados diários
  });

  const matrixData = useApi({
    url: 'aqmatrix', // URL relativa - será resolvida automaticamente
    cacheTime: 10 * 60 * 1000, // 10 minutos para dados de matriz
  });

  return {
    dailyData,
    matrixData,
    refetchAll: () => {
      dailyData.refetch();
      matrixData.refetch();
    }
  };
}
