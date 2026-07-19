# Fase 4 — Frontend Core (design)

**Status:** aprovado
**Depende de:** Fase 3 (API pública de leitura completa)
**Código-alvo:** `airquality-js-app/frontend` (scaffold Fase 0), pequena extensão em
`airquality-js-app/backend`

## Contexto

Fase 0 deixou só um esqueleto (`HealthBadge`, sem rota, sem lib de gráfico/mapa/dados). Esta fase
constrói as páginas públicas funcionais, consumindo a API da Fase 3. Decisões visuais
(paleta/tipografia/componentes) ficam pra uma sub-fase de refino via Figma **depois** — a spec
mestre já definiu isso como "input pro código, não pré-requisito". Aqui o foco é estrutura,
dados, e layout mobile-first funcional, com Tailwind utilitário limpo.

## Escopo de páginas

1. **Home** (`/`) — mapa interativo (substitui iframe externo do PurpleAir) + tabela de escala
   AQI + conteúdo estático sobre a rede/LabGAMA, porta do app antigo.
2. **Município** (`/municipio`) — seletor de município + gráfico horário de PM2.5.
3. **Geral** (`/geral`) — heatmap mês×hora (substitui `aqmatrix`, nunca funcionou no app antigo)
   + gráfico município×ano (substitui iframe externo do Datawrapper).
4. **Sensores** (`/sensores`) — lista de sensores ativos com status da última leitura (não existe
   como página pública no app antigo, é escopo novo).
5. **Publicações** (`/publicacoes`) — porta o arquivo JSON estático + listagem do app antigo, sem
   mudança (não depende de dado de sensor/backend).

**Fora de escopo desta fase**: login/admin (Fase 5), refino visual via Figma (sub-fase futura),
testes E2E.

## Extensão de backend (pequena, dentro desta fase)

Duas necessidades do frontend exigem ajuste no backend da Fase 3:

1. **`Sensor` (domínio) ganha `latitude`/`longitude`** — colunas já existem em `sensors`
   (schema Fase 1a), só nunca expostas no domínio nem no `/sensors` (mesmo padrão do
   `sensor_index` adicionado na Fase 2: coluna já existe, só falta expor quando surge um
   consumidor real). `GET /sensors` passa a incluir os dois campos na resposta.

2. **Novo endpoint `GET /readings/latest-by-sensor`** — última leitura de `sensor_readings` por
   `sensor_index` (não por município). Isso é uma exceção deliberada à regra da Fase 3
   ("sempre agregado por município, nunca sensor individual") — decisão explícita do usuário,
   motivada por precisar de granularidade por sensor pro mapa (cor do pin) e pra lista de
   sensores (status individual). A query é uma busca indexada de "última linha por chave"
   (`sensor_index, time_stamp DESC`, índice já existe desde a Fase 1a), não um scan da tabela —
   não reintroduz o problema de performance que a regra original evitava.
   ```sql
   SELECT DISTINCT ON (sensor_index) sensor_index, time_stamp, pm2_5_corrected
   FROM sensor_readings
   ORDER BY sensor_index, time_stamp DESC
   ```
   Resposta: `[{"sensor_index": int, "time_stamp": datetime, "pm2_5_corrected": float}]`

## Estrutura do frontend

Novas dependências (scaffold da Fase 0 não tem nenhuma delas):

- `react-router-dom` — roteamento (nenhum existe hoje, `App.tsx` hardcoda `HomePage`)
- `@tanstack/react-query` — cache/loading/erro/retry pras chamadas à API (nenhuma lib de dados
  existe hoje)
- `recharts` — gráficos de linha/barra (município, decisão já fixada na spec mestre, substitui
  a redundância de 3 libs do app antigo — só `echarts` era de fato usado, `apexcharts` e
  `recharts` do app antigo eram dependência morta)
- `react-leaflet` + `leaflet` — mapa, tiles OpenStreetMap (sem chave de API). Nenhuma lib de mapa
  existe em nenhum lugar do app antigo — é escopo genuinamente novo, o app antigo só embutia um
  iframe externo do PurpleAir.

**Heatmap mês×hora**: não usa `recharts` (a lib não tem tipo heatmap nativo) nem reintroduz
`echarts` (voltaria à redundância que a spec mestre já eliminou) — é uma grade CSS Grid/Tailwind
simples (12 colunas × 24 linhas, cor por célula conforme o valor), sem depender de nenhuma lib de
gráfico.

Estrutura de pastas segue o padrão hexagonal já esboçado (vazio) desde a Fase 0:
```
frontend/src/
├── domain/            # tipos TS (Sensor, MunicipioReading, SensorLatestReading...)
├── application/        # hooks de caso de uso (useCurrentMap, useMunicipioHistory,
│                        #   useMonthHourMatrix, useMunicipioYearExceedance, useSensorsList)
├── infrastructure/
│   └── api-client.ts   # já existe (fetchHealth) — estende com os demais endpoints
└── ui/
    ├── layout/          # AppShell (nav mobile bottom / desktop sidebar)
    ├── pages/           # HomePage, MunicipioPage, GeralPage, SensoresPage, PublicacoesPage
    └── components/      # AqScaleTable, SensorMap, MonthHourHeatmap, HourlyChart, SensorRow...
```

## Detalhamento por página

### Home (`/`)

- `SensorMap`: `react-leaflet` `<MapContainer>`, tiles OSM, um `<Marker>` por sensor ativo
  (lat/long de `/sensors`), cor do marcador pela última leitura daquele sensor específico
  (`/readings/latest-by-sensor`, mesma faixa de cor da tabela AQI). Popup ao clicar: nome,
  código, município, valor atual, horário da leitura.
- `AqScaleTable`: porta a tabela de faixas AQI do app antigo (conteúdo estático).
- Seção estática sobre a rede/LabGAMA/parceiros: porta do app antigo, sem mudança de conteúdo.

### Município (`/municipio`)

- Seletor de município (`/municipios`).
- `HourlyChart` (recharts `LineChart`): série horária de PM2.5 do município selecionado
  (`/readings/history?granularity=hourly&municipio=X`, faixa default últimos 7 dias, ajustável).

### Geral (`/geral`)

- `MonthHourHeatmap`: grade custom 12×24, dado de `/metrics/month-hour-matrix`.
- `MunicipioYearChart` (recharts `BarChart`, agrupado por município, uma barra por ano): dado de
  `/metrics/municipio-year-exceedance`.

### Sensores (`/sensores`)

- Lista de sensores ativos (`/sensors`), cada linha mostra: nome, código, município, última
  leitura (valor + horário, via `/readings/latest-by-sensor` cruzado por `sensor_index`), badge
  de status (cor pela faixa AQI do valor).

### Publicações (`/publicacoes`)

- Copia `reports.json` (ou equivalente) e o componente de listagem do app antigo. Sem integração
  com backend novo — conteúdo estático como já é hoje.

## Testes

- Componentes: Vitest + Testing Library (já configurado desde a Fase 0).
- Hooks de dado (`application/`): mock do cliente HTTP via `@tanstack/react-query`'s
  `QueryClientProvider` de teste, cobrindo estado de loading/erro/sucesso.
- Sem E2E nesta fase — YAGNI, reconsiderar quando houver fluxo de usuário crítico o bastante pra
  justificar (ex: login admin na Fase 5).

## Fora de escopo

- Refino visual via Figma (paleta, tipografia, componentes finais) — sub-fase futura, esta fase
  entrega estrutura funcional com Tailwind utilitário, não o visual final.
- Login/admin — Fase 5.
- Alertas por e-mail, PWA/cache offline — já fora de escopo da spec mestre inteira.
