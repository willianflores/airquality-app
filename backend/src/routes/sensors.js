const express = require('express');
const axios = require('axios');
const router = express.Router();

// Lista de sensores MPAC com seus códigos e informações
const MPAC_SENSORS = {
  // Sensores MPAC por município
  'ABR1': { id: '31105', name: 'MPAC_ABR_01_promotoria', municipio: 'Assis Brasil' },
  'ABR2': { id: '25521', name: 'MPAC_ABR_02_SEMSA', municipio: 'Assis Brasil' },
  'ACL1': { id: '57177', name: 'MPAC_ACL_01_promotoria', municipio: 'Acrelândia' },
  'BJR1': { id: '25891', name: 'MPAC_BJR_01_promotoria', municipio: 'Bujari' },
  'BRL1': { id: '27841', name: 'MPAC_BRL_01_promotoria', municipio: 'Brasiléia' },
  'BRL2': { id: '31097', name: 'MPAC_BRL_02_radio fm 90.3', municipio: 'Brasiléia' },
  'CPX1': { id: '56663', name: 'MPAC_CPX_01_qpm', municipio: 'Capixaba' },
  'CZS1': { id: '31089', name: 'MPAC_CZS_01_promotoria', municipio: 'Cruzeiro do Sul' },
  'CZS2': { id: '25501', name: 'MPAC_CZS_02_ciosp', municipio: 'Cruzeiro do Sul' },
  'EPL1': { id: '31117', name: 'MPAC_EPL_01_camara', municipio: 'Epitaciolândia' },
  'EPL2': { id: '31101', name: 'MPAC_EPL_02_escola.joao.pedro', municipio: 'Epitaciolândia' },
  'FIJ1': { id: '25551', name: 'MPAC_FIJ_01_promotoria', municipio: 'Feijó' },
  'JRD1': { id: '31111', name: 'MPAC_JRD_01_prefeitura', municipio: 'Jordão' },
  'MNL1': { id: '25531', name: 'MPAC_MNL_01_promotoria', municipio: 'Mâncio Lima' },
  'MTH1': { id: '57171', name: 'MPAC_MTH_01_semec', municipio: 'Marechal Thaumaturgo' },
  'MNU1': { id: '57309', name: 'MPAC_MNU_01_Promotoria', municipio: 'Manoel Urbano' },
  'PLC1': { id: '31107', name: 'MPAC_PLC_01_promotoria', municipio: 'Plácido de Castro' },
  'PTA1': { id: '25541', name: 'MPAC_PTA_01_Sec.infraestrutura', municipio: 'Porto Acre' },
  'PTW1': { id: '31099', name: 'MPAC_PTW_01_prefeitura', municipio: 'Porto Walter' },
  'RBR1': { id: '25549', name: 'MPAC_RBR', municipio: 'Rio Branco' },
  'RDA1': { id: '31115', name: 'MPAC_RDA_01_prefeitura', municipio: 'Rodrigues Alves' },
  'SNG1': { id: '25499', name: 'MPAC_SNG_01_promotoria', municipio: 'Senador Guiomard' },
  'SNM1': { id: '31103', name: 'MPAC_SNM_01_ifac', municipio: 'Sena Madureira' },
  'SNM2': { id: '31095', name: 'MPAC_SNM_02_promotoria', municipio: 'Sena Madureira' },
  'SRP1': { id: '25503', name: 'MPAC_SRP_01_prefeitura', municipio: 'Santa Rosa do Purus' },
  'TRC2': { id: '31091', name: 'MPAC_TRC_02_ifac', municipio: 'Tarauacá' },
  'XAP1': { id: '31109', name: 'MPAC_XAP_01_bombeiro', municipio: 'Xapuri' },
  'XAP2': { id: '56879', name: 'MPAC_XAP_02_promotoria', municipio: 'Xapuri' },
  'UFAC1': { id: '151650', name: 'AcreBioClima UFAC', municipio: 'Rio Branco' },
  'UFAC2': { id: '13609', name: 'UFACFloresta', municipio: 'Cruzeiro do Sul' }
};

// Função para aplicar correção LRAPA
function applyLRAPACorrection(pm25) {
  const corrected = 0.5 * pm25 - 0.66;
  return Math.max(0, corrected); // Não retorna valores negativos
}

// Função para calcular diferença de tempo
function calculateTimeDifference(date1, date2) {
  const difference = date1 - date2;
  
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Função para determinar status de manutenção
function getMaintenanceStatus(lastSeen, confidence) {
  const now = Date.now();
  const daysDifference = Math.floor((now - lastSeen * 1000) / (1000 * 60 * 60 * 24));
  
  if (daysDifference > 2 && confidence < 90) {
    return {
      status: 'critical',
      color: 'red',
      message: 'Sensor com mais de 2 dias sem acesso a internet e com a convergência das medidas dos medidores A e B abaixo de 90%, verificar a conexão de internet e realizar a limpeza do sensor!'
    };
  } else if (daysDifference > 2) {
    return {
      status: 'warning',
      color: 'red',
      message: 'Sensor com mais de 2 dias sem acesso a internet, verificar a rede wifi!'
    };
  } else if (confidence < 90) {
    return {
      status: 'warning',
      color: 'red',
      message: 'A convergência das medidas dos medidores A e B está abaixo de 90%, realizar limpeza do sensor!'
    };
  } else {
    return {
      status: 'good',
      color: '#4CBB17',
      message: 'Sensor funcionando normalmente'
    };
  }
}

// Função para interpretar flags dos canais
function interpretChannelFlags(flags) {
  switch (flags) {
    case 0: return 'Normal';
    case 1: return 'Medidor A desativado';
    case 2: return 'Medidor B desativado';
    default: return 'Medidor A e B desativados';
  }
}

/**
 * GET /api/sensors
 * Retorna dados de todos os sensores MPAC
 */
router.get('/', async (req, res) => {
  try {
    const PURPLEAIR_API_KEY = process.env.PURPLEAIR_API_KEY;
    
    if (!PURPLEAIR_API_KEY) {
      return res.status(500).json({
        error: 'API key do PurpleAir não configurada',
        message: 'Configure a variável PURPLEAIR_API_KEY no arquivo .env'
      });
    }

    // Parâmetros para a API PurpleAir
    const fields = 'confidence,channel_flags,last_seen,pm2.5_24hour,pm2.5_10minute,name,latitude,longitude';
    const sensorIds = Object.values(MPAC_SENSORS).map(sensor => sensor.id).join(',');
    
    console.log('Buscando dados dos sensores PurpleAir...');
    console.log('Sensores:', sensorIds);

    // Requisição para a API PurpleAir
    const response = await axios.get('https://api.purpleair.com/v1/sensors', {
      params: {
        fields: fields,
        show_only: sensorIds
      },
      headers: {
        'X-API-KEY': PURPLEAIR_API_KEY
      },
      timeout: 10000 // 10 segundos
    });

    const { data } = response.data;
    
    if (!data || data.length === 0) {
      return res.status(404).json({
        error: 'Nenhum sensor encontrado',
        message: 'Verifique se os IDs dos sensores estão corretos'
      });
    }

    // Processar dados dos sensores
    const processedSensors = data.map(sensorData => {
      // Encontrar informações do sensor pelo ID
      const sensorInfo = Object.entries(MPAC_SENSORS).find(([code, info]) => 
        info.id === sensorData[0].toString()
      );

      if (!sensorInfo) {
        console.warn(`Sensor não identificado: ${sensorData[0]}`);
        return null;
      }

      const [sensorCode, sensorDetails] = sensorInfo;
      
      // Extrair dados (índices baseados na API PurpleAir)
      const [sensor_index, last_seen, pm25_24h, pm25_10min, confidence, channel_flags, name, latitude, longitude] = sensorData;
      
      // Aplicar correção LRAPA
      const pm25_10min_corrected = applyLRAPACorrection(pm25_10min || 0);
      const pm25_24h_corrected = applyLRAPACorrection(pm25_24h || 0);
      
      // Calcular status de manutenção
      const maintenanceStatus = getMaintenanceStatus(last_seen, confidence);
      
      // Formattar data da última leitura
      const lastSeenDate = new Date(last_seen * 1000);
      const timeDifference = calculateTimeDifference(Date.now(), last_seen * 1000);
      
      return {
        code: sensorCode,
        sensor_index,
        name: sensorDetails.name,
        municipio: sensorDetails.municipio,
        data: {
          pm25_10min: pm25_10min_corrected,
          pm25_24h: pm25_24h_corrected,
          confidence: confidence || 0,
          channel_flags: interpretChannelFlags(channel_flags || 0),
          last_seen: {
            timestamp: last_seen,
            date: lastSeenDate.toLocaleDateString('pt-BR'),
            time: lastSeenDate.toLocaleTimeString('pt-BR'),
            difference: timeDifference
          },
          coordinates: {
            latitude: latitude || null,
            longitude: longitude || null
          }
        },
        maintenance: maintenanceStatus,
        purpleair_link: `https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=${sensor_index}`
      };
    }).filter(Boolean); // Remove sensores nulos

    console.log(`Dados processados de ${processedSensors.length} sensores`);

    res.json({
      success: true,
      count: processedSensors.length,
      last_updated: new Date().toISOString(),
      sensors: processedSensors
    });

  } catch (error) {
    console.error('Erro ao buscar dados dos sensores:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Timeout na requisição',
        message: 'A API do PurpleAir demorou para responder'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        error: 'API key inválida',
        message: 'Verifique se a API key do PurpleAir está correta'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit excedido',
        message: 'Muitas requisições para a API do PurpleAir'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

/**
 * GET /api/sensors/:sensorCode
 * Retorna dados de um sensor específico
 */
router.get('/:sensorCode', async (req, res) => {
  try {
    const { sensorCode } = req.params;
    const sensorInfo = MPAC_SENSORS[sensorCode.toUpperCase()];

    if (!sensorInfo) {
      return res.status(404).json({
        error: 'Sensor não encontrado',
        message: `Código do sensor '${sensorCode}' não existe`
      });
    }

    const PURPLEAIR_API_KEY = process.env.PURPLEAIR_API_KEY;
    
    if (!PURPLEAIR_API_KEY) {
      return res.status(500).json({
        error: 'API key do PurpleAir não configurada'
      });
    }

    // Buscar dados do sensor específico
    const response = await axios.get(`https://api.purpleair.com/v1/sensors/${sensorInfo.id}`, {
      params: {
        fields: 'confidence,channel_flags,last_seen,pm2.5_24hour,pm2.5_10minute,name,latitude,longitude'
      },
      headers: {
        'X-API-KEY': PURPLEAIR_API_KEY
      }
    });

    const sensorData = response.data.sensor;
    
    // Processar dados do sensor individual
    const processedSensor = {
      code: sensorCode.toUpperCase(),
      sensor_index: sensorInfo.id,
      name: sensorInfo.name,
      municipio: sensorInfo.municipio,
      data: {
        pm25_10min: applyLRAPACorrection(sensorData.pm2_5_10minute || 0),
        pm25_24h: applyLRAPACorrection(sensorData.pm2_5_24hour || 0),
        confidence: sensorData.confidence || 0,
        channel_flags: interpretChannelFlags(sensorData.channel_flags || 0),
        last_seen: {
          timestamp: sensorData.last_seen,
          date: new Date(sensorData.last_seen * 1000).toLocaleDateString('pt-BR'),
          time: new Date(sensorData.last_seen * 1000).toLocaleTimeString('pt-BR'),
          difference: calculateTimeDifference(Date.now(), sensorData.last_seen * 1000)
        },
        coordinates: {
          latitude: sensorData.latitude || null,
          longitude: sensorData.longitude || null
        }
      },
      maintenance: getMaintenanceStatus(sensorData.last_seen, sensorData.confidence),
      purpleair_link: `https://map.purpleair.com/1/mPM25/a10/p31536000/cC4?select=${sensorInfo.id}`
    };

    res.json({
      success: true,
      sensor: processedSensor
    });

  } catch (error) {
    console.error('Erro ao buscar dados do sensor:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;
