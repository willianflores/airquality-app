const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Dados atuais dos sensores (migração do código hardcoded)
const SENSORS_DATA = [
  { code: 'ABR1', sensor_index: '31105', name: 'MPAC_ABR_01_promotoria', municipio: 'Assis Brasil', institution: 'MPAC', location: 'promotoria' },
  { code: 'ABR2', sensor_index: '25521', name: 'MPAC_ABR_02_SEMSA', municipio: 'Assis Brasil', institution: 'MPAC', location: 'SEMSA' },
  { code: 'ACL1', sensor_index: '57177', name: 'MPAC_ACL_01_promotoria', municipio: 'Acrelândia', institution: 'MPAC', location: 'promotoria' },
  { code: 'BJR1', sensor_index: '25891', name: 'MPAC_BJR_01_promotoria', municipio: 'Bujari', institution: 'MPAC', location: 'promotoria' },
  { code: 'BRL1', sensor_index: '27841', name: 'MPAC_BRL_01_promotoria', municipio: 'Brasiléia', institution: 'MPAC', location: 'promotoria' },
  { code: 'BRL2', sensor_index: '31097', name: 'MPAC_BRL_02_radio fm 90.3', municipio: 'Brasiléia', institution: 'MPAC', location: 'radio fm 90.3' },
  { code: 'CPX1', sensor_index: '56663', name: 'MPAC_CPX_01_qpm', municipio: 'Capixaba', institution: 'MPAC', location: 'qpm' },
  { code: 'CZS1', sensor_index: '31089', name: 'MPAC_CZS_01_promotoria', municipio: 'Cruzeiro do Sul', institution: 'MPAC', location: 'promotoria' },
  { code: 'CZS2', sensor_index: '25501', name: 'MPAC_CZS_02_ciosp', municipio: 'Cruzeiro do Sul', institution: 'MPAC', location: 'ciosp' },
  { code: 'EPL1', sensor_index: '31117', name: 'MPAC_EPL_01_camara', municipio: 'Epitaciolândia', institution: 'MPAC', location: 'camara' },
  { code: 'EPL2', sensor_index: '31101', name: 'MPAC_EPL_02_escola.joao.pedro', municipio: 'Epitaciolândia', institution: 'MPAC', location: 'escola.joao.pedro' },
  { code: 'FIJ1', sensor_index: '25551', name: 'MPAC_FIJ_01_promotoria', municipio: 'Feijó', institution: 'MPAC', location: 'promotoria' },
  { code: 'JRD1', sensor_index: '31111', name: 'MPAC_JRD_01_prefeitura', municipio: 'Jordão', institution: 'MPAC', location: 'prefeitura' },
  { code: 'MNL1', sensor_index: '25531', name: 'MPAC_MNL_01_promotoria', municipio: 'Mâncio Lima', institution: 'MPAC', location: 'promotoria' },
  { code: 'MTH1', sensor_index: '57171', name: 'MPAC_MTH_01_semec', municipio: 'Marechal Thaumaturgo', institution: 'MPAC', location: 'semec' },
  { code: 'MNU1', sensor_index: '57309', name: 'MPAC_MNU_01_Promotoria', municipio: 'Manoel Urbano', institution: 'MPAC', location: 'Promotoria' },
  { code: 'PLC1', sensor_index: '31107', name: 'MPAC_PLC_01_promotoria', municipio: 'Plácido de Castro', institution: 'MPAC', location: 'promotoria' },
  { code: 'PTA1', sensor_index: '25541', name: 'MPAC_PTA_01_Sec.infraestrutura', municipio: 'Porto Acre', institution: 'MPAC', location: 'Sec.infraestrutura' },
  { code: 'PTW1', sensor_index: '31099', name: 'MPAC_PTW_01_prefeitura', municipio: 'Porto Walter', institution: 'MPAC', location: 'prefeitura' },
  { code: 'RBR1', sensor_index: '25549', name: 'MPAC_RBR', municipio: 'Rio Branco', institution: 'MPAC', location: 'sede' },
  { code: 'RDA1', sensor_index: '31115', name: 'MPAC_RDA_01_prefeitura', municipio: 'Rodrigues Alves', institution: 'MPAC', location: 'prefeitura' },
  { code: 'SNG1', sensor_index: '25499', name: 'MPAC_SNG_01_promotoria', municipio: 'Senador Guiomard', institution: 'MPAC', location: 'promotoria' },
  { code: 'SNM1', sensor_index: '31103', name: 'MPAC_SNM_01_ifac', municipio: 'Sena Madureira', institution: 'MPAC', location: 'ifac' },
  { code: 'SNM2', sensor_index: '31095', name: 'MPAC_SNM_02_promotoria', municipio: 'Sena Madureira', institution: 'MPAC', location: 'promotoria' },
  { code: 'SRP1', sensor_index: '25503', name: 'MPAC_SRP_01_prefeitura', municipio: 'Santa Rosa do Purus', institution: 'MPAC', location: 'prefeitura' },
  { code: 'TRC2', sensor_index: '31091', name: 'MPAC_TRC_02_ifac', municipio: 'Tarauacá', institution: 'MPAC', location: 'ifac' },
  { code: 'XAP1', sensor_index: '31109', name: 'MPAC_XAP_01_bombeiro', municipio: 'Xapuri', institution: 'MPAC', location: 'bombeiro' },
  { code: 'XAP2', sensor_index: '56879', name: 'MPAC_XAP_02_promotoria', municipio: 'Xapuri', institution: 'MPAC', location: 'promotoria' },
  { code: 'UFAC1', sensor_index: '151650', name: 'AcreBioClima UFAC', municipio: 'Rio Branco', institution: 'UFAC', location: 'campus' },
  { code: 'UFAC2', sensor_index: '13609', name: 'UFACFloresta', municipio: 'Cruzeiro do Sul', institution: 'UFAC', location: 'campus' }
];

async function migrateSensors() {
  try {
    console.log('🚀 Iniciando migração dos dados dos sensores...');

    // Verificar se já existem sensores na tabela
    const existingSensors = await prisma.sensor.count();
    
    if (existingSensors > 0) {
      console.log(`⚠️  Já existem ${existingSensors} sensores na tabela.`);
      console.log('💡 Deseja continuar e adicionar novos sensores? (y/n)');
      
      // Em um script real, você pode usar readline para input do usuário
      // Por enquanto, vamos limpar a tabela e recriar
      console.log('🗑️  Limpando tabela de sensores...');
      await prisma.sensor.deleteMany({});
    }

    console.log('📊 Inserindo dados dos sensores...');

    for (const sensorData of SENSORS_DATA) {
      try {
        const sensor = await prisma.sensor.create({
          data: {
            code: sensorData.code,
            sensor_index: sensorData.sensor_index,
            name: sensorData.name,
            municipio: sensorData.municipio,
            institution: sensorData.institution,
            location: sensorData.location,
            active: true
          }
        });
        
        console.log(`✅ Sensor ${sensor.code} - ${sensor.name} criado`);
      } catch (error) {
        console.error(`❌ Erro ao criar sensor ${sensorData.code}:`, error.message);
      }
    }

    const totalSensors = await prisma.sensor.count();
    console.log(`🎉 Migração concluída! Total de sensores: ${totalSensors}`);

    // Mostrar resumo por município
    const sensorsByMunicipio = await prisma.sensor.groupBy({
      by: ['municipio'],
      _count: {
        id: true
      },
      orderBy: {
        municipio: 'asc'
      }
    });

    console.log('\n📍 Sensores por município:');
    sensorsByMunicipio.forEach(item => {
      console.log(`  - ${item.municipio}: ${item._count.id} sensor(es)`);
    });

    // Mostrar IDs para PurpleAir API
    const sensorIds = await prisma.sensor.findMany({
      where: { active: true },
      select: { sensor_index: true }
    });

    console.log('\n🔗 IDs para API PurpleAir:');
    console.log(sensorIds.map(s => s.sensor_index).join(','));

  } catch (error) {
    console.error('💥 Erro na migração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateSensors();
}

module.exports = { migrateSensors, SENSORS_DATA };
gunta ra