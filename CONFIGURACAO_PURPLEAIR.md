# 🌐 **CONFIGURAÇÃO DA API PURPLEAIR**

## 📋 **PASSO A PASSO PARA ATIVAR O MONITORAMENTO DE SENSORES**

### **🔑 1. Obter API Key do PurpleAir**

#### **📝 Criação da Conta:**
1. Acesse: [https://develop.purpleair.com/](https://develop.purpleair.com/)
2. Clique em **"Sign Up"** para criar uma conta
3. Preencha os dados solicitados
4. Confirme o email de verificação

#### **🎯 Solicitação da API Key:**
1. Faça login na [PurpleAir Developer Portal](https://develop.purpleair.com/)
2. Navegue para **"API Keys"** no menu
3. Clique em **"Create new API key"**
4. Preencha as informações:
   - **Name**: `MPAC Sensors Monitoring`
   - **Description**: `Monitoramento dos sensores da rede MPAC do Acre`
   - **Type**: `READ` (apenas leitura é necessária)
5. Copie a API key gerada (algo como: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

---

### **⚙️ 2. Configuração no Backend**

#### **📂 Configurar Variáveis de Ambiente:**

1. **Navegue para o diretório do backend:**
   ```bash
   cd backend
   ```

2. **Copie o arquivo de exemplo:**
   ```bash
   cp env.example .env
   ```

3. **Edite o arquivo `.env`:**
   ```bash
   nano .env
   ```

4. **Adicione sua API key:**
   ```env
   # Configurações do banco de dados
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/airquality?schema=public"

   # API Key do PurpleAir
   PURPLEAIR_API_KEY="SUA_API_KEY_AQUI"

   # Configurações do servidor
   PORT=3333

   # Configurações CORS
   CORS_ORIGIN="http://localhost:3000,http://192.168.1.28:3000"
   ```

#### **🔄 Reiniciar o Backend:**
```bash
npm run dev
```

---

### **🧪 3. Testando a Configuração**

#### **✅ Verificar se o Backend está Funcionando:**

1. **Testar endpoint principal:**
   ```bash
   curl http://localhost:3333/api/sensors
   ```

2. **Resposta esperada:**
   ```json
   {
     "success": true,
     "count": 30,
     "last_updated": "2025-01-30T...",
     "sensors": [...]
   }
   ```

#### **🌐 Testar no Frontend:**

1. **Acesse:** `http://localhost:3000/sensores`
2. **Verifique se:**
   - A página carrega sem erros
   - Os dados dos sensores aparecem na tabela
   - As estatísticas são exibidas corretamente
   - A funcionalidade de exportar CSV funciona

---

### **🚨 4. Resolução de Problemas**

#### **❌ Erro: "API key do PurpleAir não configurada"**
- **Causa:** Variável `PURPLEAIR_API_KEY` não definida
- **Solução:** Verificar arquivo `.env` e reiniciar o backend

#### **❌ Erro: "API key inválida"**
- **Causa:** API key incorreta ou expirada
- **Solução:** Verificar API key no [portal PurpleAir](https://develop.purpleair.com/)

#### **❌ Erro: "Rate limit excedido"**
- **Causa:** Muitas requisições para a API
- **Solução:** Aguardar alguns minutos antes de nova tentativa

#### **❌ Erro: "Timeout na requisição"**
- **Causa:** Conexão lenta com a API PurpleAir
- **Solução:** Verificar conexão de internet

---

### **📊 5. Informações dos Sensores**

#### **🗺️ Rede MPAC Atual:**
A aplicação monitora **30 sensores** distribuídos em **22 municípios** do Acre:

- **Rio Branco**: 2 sensores (MPAC_RBR, AcreBioClima UFAC)
- **Cruzeiro do Sul**: 3 sensores (MPAC_CZS_01, MPAC_CZS_02, UFACFloresta)
- **Brasiléia**: 2 sensores (MPAC_BRL_01, MPAC_BRL_02)
- **Assis Brasil**: 2 sensores (MPAC_ABR_01, MPAC_ABR_02)
- **E outros 18 municípios** com 1 sensor cada

#### **📈 Dados Monitorados:**
- **PM2.5 (10 minutos)**: Concentração atual com correção LRAPA
- **PM2.5 (24 horas)**: Média diária com correção LRAPA
- **Última leitura**: Data/hora da última atualização
- **Convergência**: Porcentagem de concordância entre medidores A e B
- **Status dos medidores**: Funcionamento individual dos canais
- **Localização**: Coordenadas GPS e link para mapa PurpleAir

---

### **🔒 6. Segurança**

#### **⚠️ IMPORTANTE:**

1. **Nunca expose a API key publicamente**
2. **Mantenha o arquivo `.env` fora do controle de versão**
3. **Use diferentes API keys para desenvolvimento e produção**
4. **Monitore o uso da API key no portal PurpleAir**

#### **🔐 Boas Práticas:**
- Rotacionar API keys periodicamente
- Usar rate limiting interno se necessário
- Implementar cache para reduzir requisições
- Monitorar logs de erro

---

### **📞 7. Suporte**

#### **🆘 Em caso de problemas:**

1. **Verificar logs do backend:** `npm run dev`
2. **Consultar documentação PurpleAir:** [https://api.purpleair.com/](https://api.purpleair.com/)
3. **Verificar status da API:** [https://status.purpleair.com/](https://status.purpleair.com/)

#### **📧 Contatos:**
- **PurpleAir Support:** [support@purpleair.com](mailto:support@purpleair.com)
- **Documentação Técnica:** [https://api.purpleair.com/](https://api.purpleair.com/)

---

## ✅ **RESUMO DA IMPLEMENTAÇÃO**

### **🎯 O que foi Implementado:**

1. **✅ Backend Proxy Seguro:**
   - Endpoint `/api/sensors` para todos os sensores
   - Endpoint `/api/sensors/:code` para sensor específico
   - Correção LRAPA aplicada automaticamente
   - Sistema de cache e retry
   - Tratamento robusto de erros

2. **✅ Frontend Moderno:**
   - Página `/sensores` responsiva
   - Tabela com todos os dados dos sensores
   - Sistema de busca/filtro
   - Estatísticas em tempo real
   - Exportação para CSV
   - Tooltips informativos

3. **✅ Funcionalidades Avançadas:**
   - Status de manutenção automático
   - Indicadores visuais de saúde dos sensores
   - Links diretos para localização no PurpleAir
   - Atualização manual dos dados
   - Interface intuitiva e acessível

### **🚀 Resultado Final:**

A página de monitoramento de sensores foi **totalmente reimplementada** com **segurança aprimorada**, **interface moderna** e **funcionalidades expandidas**, resolvendo completamente os problemas da versão anterior e adequando-se às políticas atuais da PurpleAir API.

