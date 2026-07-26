# Admin — Publicações (airquality-js-app): design

## Contexto

A página pública `/publicacoes` (`frontend/src/ui/pages/PublicacoesPage.tsx`) lista relatórios a
partir de `frontend/src/data/reports.json` (14 entradas estáticas), com arquivos físicos (capa +
PDF) em `frontend/public/reports/{img,pdf}`, servidos pelo Vite. Não existe suporte nenhum no
backend para publicações, nem mecanismo de upload de arquivo em nenhum lugar do projeto.

Escopo desta fase: dar à aba admin (a mesma área protegida por `get_current_admin` criada na Fase
5) uma tela de gestão de publicações — criar (com upload de capa + PDF), editar e excluir — e migrar
a página pública para consumir essas publicações via backend, aposentando `reports.json`.

## Decisões

- **Migração total, sem duas fontes de verdade.** As 14 publicações atuais são importadas pro banco
  num passo único (script), e os arquivos físicos copiados pro novo storage. Depois de confirmar em
  produção, `reports.json` e `frontend/public/reports/*` são removidos. A página pública passa a
  depender 100% do backend.
- **Storage de arquivo é disco local + volume Docker**, não bytea no Postgres nem objeto externo —
  projeto não tem storage de objetos hoje e é self-hosted; disco+volume é o mesmo modelo já usado
  pro Postgres (`postgres_data` no `infra/docker-compose.yml`). Novo volume nomeado `reports_data`
  montado só no serviço `backend`, em `REPORTS_STORAGE_DIR` (default `/app/data/reports`, subpastas
  `img/` e `pdf/`), servido via `StaticFiles` montado em `/media/reports`.
- **Validação de upload**: capa aceita `image/jpeg`, `image/png`, `image/webp`, máx. 5MB; PDF aceita
  só `application/pdf`, máx. 20MB. Nome de arquivo salvo é um `uuid4` + extensão original (evita
  colisão e path traversal a partir do nome enviado pelo usuário).
- **CRUD completo com hard-delete.** Diferente de sensores (soft-delete, porque `sensor_index` é
  referenciado por milhões de linhas de leitura), publicação não tem essa dependência — excluir
  remove a linha e os arquivos físicos associados. Sem confirmação dupla no backend; a confirmação
  fica só na UI (`window.confirm` ou modal simples), mesmo padrão leve já aceitável no projeto.
- **Data de publicação é campo manual** (date picker), não timestamp de upload — necessário porque
  as publicações migradas têm datas de 2021 a 2025, e publicações futuras podem se referir a
  relatórios de período passado.
- **Update aceita arquivos opcionais.** Se o admin não reenviar capa/PDF na edição, mantém o arquivo
  já associado (não apaga nem exige reenvio).
- **Sem workflow de rascunho/publicação.** Toda publicação criada aparece imediatamente na página
  pública, listada por `published_date` desc — mesmo comportamento do `reports.json` hoje. Não foi
  pedido controle de visibilidade, então não entra (YAGNI).

## Backend

### Entidade e porta

```python
# domain/entities/report.py
@dataclass
class Report:
    id: int
    title: str
    description: str
    image_path: str   # caminho relativo servido, ex. "img/<uuid>.jpg"
    file_path: str     # ex. "pdf/<uuid>.pdf"
    published_date: date
    created_at: datetime
```

```python
# application/ports/report_repository.py
class ReportRepository(ABC):
    def list_all(self) -> list[Report]: ...
    def get_by_id(self, report_id: int) -> Report | None: ...
    def create(self, report: NewReport) -> Report: ...
    def update(self, report_id: int, fields: ReportUpdate) -> Report: ...
    def delete(self, report_id: int) -> None: ...
```

`NewReport`/`ReportUpdate` são dataclasses simples com os campos aceitos em cada operação (mesmo
padrão de `NewSensor`/`SensorUpdate` da Fase 5). `ReportUpdate.image_path`/`file_path` são
`str | None` — `None` significa "não mudou".

### Casos de uso novos

- `CreateReport` — salva os arquivos recebidos (via um `FileStorage` helper, ver abaixo) e persiste.
- `UpdateReport` — se vier arquivo novo, salva e substitui o path; se o path antigo mudar, apaga o
  arquivo físico anterior do disco. Levanta `ReportNotFoundError` se `report_id` não existe.
- `DeleteReport` — apaga a linha e os dois arquivos físicos (capa + PDF). Levanta
  `ReportNotFoundError` se não existe.
- `ListAllReports` — usado tanto pela rota pública quanto pela admin (não há distinção
  ativo/inativo aqui).

### `FileStorage` (novo helper, não é porta hexagonal — é infraestrutura)

```python
# infrastructure/file_storage.py
class InvalidFileError(Exception): ...

def save_upload(upload: UploadFile, subdir: Literal["img", "pdf"]) -> str:
    """Valida mime/tamanho, salva em REPORTS_STORAGE_DIR/<subdir>/<uuid4>.<ext>,
    retorna o path relativo (ex. "img/<uuid>.jpg"). Levanta InvalidFileError se
    mime ou tamanho não bater."""

def delete_file(relative_path: str) -> None:
    """Remove o arquivo se existir; não levanta erro se já não existir (idempotente)."""
```

`settings.reports_storage_dir: str = "./data/reports"` novo campo em `infrastructure/settings.py`.

### Rotas HTTP novas

`adapters/inbound/http/admin_reports_router.py`, atrás de `Depends(get_current_admin)`:

| Rota | Método | Corpo | Descrição |
|---|---|---|---|
| `/admin/reports` | GET | — | Lista todas as publicações |
| `/admin/reports` | POST | multipart: `title`, `description`, `published_date`, `image`, `file` | Cria (imagem e PDF obrigatórios) |
| `/admin/reports/{id}` | PATCH | multipart: `title`, `description`, `published_date`, `image?`, `file?` | Edita; arquivos opcionais |
| `/admin/reports/{id}` | DELETE | — | Exclui (linha + arquivos) |

`adapters/inbound/http/reports_router.py`, público (sem auth), mesmo estilo de `sensors_router.py`:

| Rota | Método | Descrição |
|---|---|---|
| `/reports` | GET | Lista todas as publicações, ordenadas por `published_date` desc |

Erros: `401` sem sessão admin (rotas `/admin/*`); `404` id inexistente (update/delete); `422` mime ou
tamanho de arquivo inválido (`InvalidFileError` → `HTTPException(422, ...)`), ou `published_date`
fora do formato `YYYY-MM-DD`.

### Mudanças em `infrastructure/main.py`

- `app.include_router(admin_reports_router)` e `app.include_router(reports_router)`.
- `app.mount("/media/reports", StaticFiles(directory=settings.reports_storage_dir), name="reports-media")`.
- `allow_methods` do `CORSMiddleware` ganha `"DELETE"` (hoje só tem `GET`, `POST`, `PATCH`).

### Migration Alembic

Nova revision `0008_create_reports_table.py`: tabela `reports` (`id` serial PK, `title` text not
null, `description` text not null, `image_path` text not null, `file_path` text not null,
`published_date` date not null, `created_at` timestamptz not null default `now()`). Sem índice
especial — volume é pequeno (dezenas de linhas).

### Script de migração (`infrastructure/migrate_reports_json.py`)

CLI único uso, mesmo estilo de `create_admin.py`: lê `frontend/src/data/reports.json`, copia cada
arquivo de `frontend/public/reports/{img,pdf}` pro `REPORTS_STORAGE_DIR` correspondente (mantendo o
nome original — não precisa de uuid aqui, é migração de dado já estável), e insere uma linha por
entrada via `PostgresReportRepository`. Roda uma vez manualmente (`python -m infrastructure.migrate_reports_json --reports-json ... --public-dir ...`), não faz parte do
Alembic nem dos testes automatizados. Depois de confirmado em produção, remoção de `reports.json` e
`frontend/public/reports/*` é um passo manual separado (não automatizado pelo script, pra manter a
operação reversível até confirmação).

### `docker-compose.yml`

```yaml
backend:
  volumes:
    - reports_data:/app/data/reports
  environment:
    REPORTS_STORAGE_DIR: /app/data/reports
# ...
volumes:
  reports_data:
    driver: local
```

## Frontend

### `domain/report.ts` (atualizado)

```ts
export interface Report {
  id: number
  title: string
  description: string
  imageUrl: string      // URL completa servida pelo backend (/media/reports/img/...)
  fileUrl: string       // idem, /media/reports/pdf/...
  publishedDate: string // ISO "YYYY-MM-DD"
}
```

### `api-client.ts` — funções novas

- Pública: `fetchReports(): Promise<Report[]>` — `GET /reports` retorna `image_path`/`file_path`
  como paths relativos ao backend (ex. `"/media/reports/img/x.jpg"`, mesmo prefixo do `StaticFiles`).
  `fetchReports` mapeia a resposta prefixando `API_BASE_URL` (mesma constante já usada por
  `fetchJson`) pra montar `imageUrl`/`fileUrl` absolutos — necessário porque em dev o backend
  (`:8000`) e o frontend (`:5173`) são origens diferentes, então não dá pra usar path relativo puro
  como o `reports.json` atual usa hoje.
- Admin: `fetchAdminReports()`, `createReport(formData: FormData)`, `updateReport(id, formData: FormData)`,
  `deleteReport(id)` — usam `authFetch` (cookie de sessão), mas com `body: formData` sem setar
  `Content-Type` manualmente (o browser define o boundary do multipart sozinho).

### `AdminPublicacoesPage.tsx` (novo, espelha `AdminSensoresPage.tsx`)

Tabela (título, data, ações Editar/Excluir) + formulário de criação/edição: campos `title`,
`description` (textarea), `published_date` (`<input type="date">`), `image` (`<input type="file"
accept="image/*">`), `file` (`<input type="file" accept="application/pdf">`). Na edição, os inputs
de arquivo ficam opcionais — texto auxiliar "deixe em branco pra manter o arquivo atual". Excluir
usa `window.confirm` antes de chamar `deleteReport`. `useMutation` + `queryClient.invalidateQueries`
no mesmo padrão dos sensores.

### Roteamento e nav

- `App.tsx`: nova rota `/admin/publicacoes` dentro de `RequireAdminAuth` + `AdminShell`.
- `AdminShell.tsx`: novo item de nav "Publicações" ao lado de "Sensores"/"Ingestão".

### `PublicacoesPage.tsx` (atualizado)

Troca o import estático de `reportsData` por `useQuery({ queryKey: ['reports'], queryFn:
fetchReports })`, com estados de loading/erro no mesmo padrão de `SensoresPage.tsx`. `parseDate`
passa a interpretar `publishedDate` ISO (`YYYY-MM-DD`) em vez de `dd/mm/yyyy`. Lógica de busca/filtro
por ano e o layout de cards (já redesenhado) ficam iguais.

## Testes

Mesmo padrão da Fase 5 — casos de uso com fakes de porta (sem FastAPI/DB), rotas com `TestClient`
contra `airquality_test`:

- Criar publicação via caso de uso e via rota (multipart), com arquivo de teste real (fixture
  pequena, ex. um PNG 1x1 e um PDF mínimo).
- Rejeitar upload com mime inválido (ex. `.exe` renomeado pra `.jpg`) e arquivo acima do limite —
  `422`.
- Editar sem reenviar arquivo mantém `image_path`/`file_path` antigos; editar reenviando substitui e
  remove o arquivo antigo do disco (verificado com `os.path.exists`).
- Excluir remove a linha e os dois arquivos físicos; excluir id inexistente devolve `404`.
- Rota pública `/reports` não exige sessão e retorna ordenado por `published_date` desc.
- Todas as rotas `/admin/reports*` retornam `401` sem cookie de sessão válido.
- Frontend: `AdminPublicacoesPage` — criar/editar/excluir com mocks de `api-client`; `PublicacoesPage.test.tsx`
  reescrito pra mockar `fetchReports` em vez do JSON estático (mantendo os 3 testes existentes:
  ordenação por data, busca por texto, filtro por ano).

## Fora de escopo

- Storage externo (S3/R2) — fica pra quando/se o volume de arquivos justificar.
- Workflow de rascunho/publicação (visibilidade controlada).
- Reordenação manual (a ordem é sempre `published_date` desc).
- Versionamento de arquivo (reenviar substitui, não guarda histórico do arquivo antigo).
- Remoção automática de `reports.json`/`frontend/public/reports/*` pelo script de migração — fica
  manual, depois de confirmar a migração em produção.
