// URLs externas centralizadas para manutenção
export const EXTERNAL_LINKS = {
  // APIs
  PURPLEAIR_API: 'https://api.purpleair.com/',
  PURPLEAIR_MAP: 'https://map.purpleair.com/air-quality-raw-pm25?opt=%2F1%2Flp%2Fa1440%2Fp604800%2FcC4#5.71/-9.273/-70.283',
  
  // Produtos
  PURPLEAIR_SENSOR: 'https://www2.purpleair.com/products/purpleair-pa-ii-sd',
  
  // Instituições
  MPAC: 'https://www.mpac.mp.br/',
  UFAC: 'http://www.ufac.br/',
  LABGAMA: 'https://www.ufac.br/labgama',
  IPAM: 'https://ipam.org.br/',
  INPE: 'https://www.gov.br/inpe/pt-br',
  WOODWELL: 'https://www.woodwellclimate.org/',
  
  // Ferramentas e Frameworks
  PYTHON: 'https://www.python.org/',
  POSTGRESQL: 'https://www.postgresql.org/',
  NEXTJS: 'https://nextjs.org/',
  
  // Pesquisa e Estudos
  SCIENTIFIC_STUDY: 'https://doi.org/10.1016/j.atmosenv.2019.116946',
  LRAPA_CORRECTION: 'https://www.lrapa.org/DocumentCenter/View/4147/PurpleAir-Correction-Summary',
  
  // Repositórios
  GITHUB_WILLIAN: 'https://github.com/willianflores'
} as const;

// Configurações de iframe
export const IFRAME_CONFIG = {
  PURPLEAIR_MAP: {
    src: EXTERNAL_LINKS.PURPLEAIR_MAP,
    title: 'Mapa interativo da qualidade do ar em tempo real do Acre',
    ariaLabel: 'Visualização do mapa de monitoramento da qualidade do ar'
  }
} as const;
