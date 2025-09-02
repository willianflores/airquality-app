// Configuração dinâmica da API baseada no ambiente

/**
 * Detecta automaticamente a URL base da API baseada no ambiente de execução
 */
export function getApiBaseUrl(): string {
  // Se estivermos no servidor (SSR), usar a URL do ambiente
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
  }

  // Se estivermos no cliente, detectar dinamicamente
  const currentUrl = window.location;
  
  // Se estivermos acessando via IP (não localhost), ajustar a URL da API
  if (currentUrl.hostname !== 'localhost' && currentUrl.hostname !== '127.0.0.1') {
    // Usar o mesmo IP do frontend, mas na porta 3333
    return `http://${currentUrl.hostname}:3333`;
  }
  
  // Para localhost, usar a configuração padrão
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
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
