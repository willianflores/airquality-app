// Utilitários para gerenciamento de relatórios

export interface Report {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  fileUrl: string;
  date: string;
  category?: 'relatorio' | 'nota-tecnica' | 'artigo' | 'policy-brief';
  tags?: string[];
  author?: string;
  fileSize?: string;
  downloadCount?: number;
}

// Validação de dados de relatório
export function validateReport(report: Partial<Report>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!report.title || report.title.trim().length < 5) {
    errors.push('Título deve ter pelo menos 5 caracteres');
  }

  if (!report.description || report.description.trim().length < 20) {
    errors.push('Descrição deve ter pelo menos 20 caracteres');
  }

  if (!report.imageUrl || !isValidUrl(report.imageUrl)) {
    errors.push('URL da imagem deve ser válida');
  }

  if (!report.fileUrl || !isValidUrl(report.fileUrl)) {
    errors.push('URL do arquivo deve ser válida');
  }

  if (!report.date || !isValidDate(report.date)) {
    errors.push('Data deve estar no formato DD/MM/AAAA');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validação de URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Se não for URL absoluta, verificar se é caminho relativo válido
    return url.startsWith('/') && url.length > 1;
  }
}

// Validação de data
function isValidDate(dateString: string): boolean {
  const regex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!regex.test(dateString)) return false;

  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getDate() === day && 
         date.getMonth() === month - 1 && 
         date.getFullYear() === year;
}

// Função para gerar ID único
export function generateReportId(report: Report): string {
  const titleSlug = report.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .substring(0, 50); // Limita tamanho

  const dateSlug = report.date.split('/').reverse().join('-');
  return `${dateSlug}-${titleSlug}`;
}

// Função para adicionar novo relatório
export function addNewReport(reports: Report[], newReport: Report): Report[] {
  const validation = validateReport(newReport);
  
  if (!validation.isValid) {
    throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
  }

  const reportWithId = {
    ...newReport,
    id: generateReportId(newReport),
    downloadCount: 0
  };

  return [reportWithId, ...reports];
}

// Função para atualizar relatório
export function updateReport(reports: Report[], reportId: string, updates: Partial<Report>): Report[] {
  return reports.map(report => 
    report.id === reportId 
      ? { ...report, ...updates }
      : report
  );
}

// Função para remover relatório
export function removeReport(reports: Report[], reportId: string): Report[] {
  return reports.filter(report => report.id !== reportId);
}

// Função para obter estatísticas dinâmicas
export function getReportsStatistics(reports: Report[]) {
  const currentYear = new Date().getFullYear();
  const years = [...new Set(reports.map(r => {
    const [, , year] = r.date.split('/');
    return parseInt(year);
  }))];

  const categories = reports.reduce((acc, report) => {
    const category = report.category || 'outros';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: reports.length,
    yearRange: years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : currentYear.toString(),
    categories,
    recentCount: reports.filter(r => {
      const [, , year] = r.date.split('/');
      return parseInt(year) >= currentYear - 1;
    }).length
  };
}

// Template para novo relatório
export const newReportTemplate: Partial<Report> = {
  title: '',
  description: '',
  imageUrl: '/reports/img/placeholder.jpg',
  fileUrl: '/reports/pdf/',
  date: new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }).replace(/\//g, '/'),
  category: 'relatorio',
  tags: [],
  author: '',
  fileSize: ''
};

