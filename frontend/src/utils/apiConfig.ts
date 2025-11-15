// Configuração dinâmica da API baseada no ambiente

/**
 * Detecta automaticamente a URL base da API baseada no ambiente de execução
 */
export function getApiBaseUrl(): string {
  // SEMPRE usar a variável de ambiente se estiver definida
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Se estivermos no servidor (SSR), usar fallback
  if (typeof window === 'undefined') {
    return 'http://localhost:8080';
  }

  // Se estivermos no cliente, usar fallback dinâmico
  const currentUrl = window.location;
  
  // Para produção (acesso via IP ou domínio), usar /api via Nginx
  if (currentUrl.hostname !== 'localhost' && currentUrl.hostname !== '127.0.0.1') {
    // Usar o mesmo host do frontend + /api (via Nginx reverse proxy)
    return `${currentUrl.protocol}//${currentUrl.hostname}/api`;
  }
  
  // Para localhost em desenvolvimento
  return 'http://localhost:8080';
}

/**
 * Constrói uma URL completa para um endpoint da API
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  // Remove barra inicial do endpoint se existir para evitar URLs duplas
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

/**
 * Configuração de retry para requisições que falham
 */
export const API_CONFIG = {
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo
  timeout: 10000, // 10 segundos
  cacheTime: 5 * 60 * 1000, // 5 minutos
} as const;
