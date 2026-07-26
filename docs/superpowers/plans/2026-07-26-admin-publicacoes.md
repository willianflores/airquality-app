# Admin — Publicações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRUD de publicações (criar/editar/excluir, com upload de capa + PDF) na aba admin do
airquality-js-app, migrando a página pública `/publicacoes` de `reports.json` estático pro backend.

**Architecture:** Mesmo padrão hexagonal das fases anteriores — `domain/entities/report.py`,
`ReportRepository` (port), casos de uso finos, `PostgresReportRepository` (adapter). Upload de
arquivo é um helper de infraestrutura à parte (`infrastructure/file_storage.py`, não é porta
hexagonal), disco local + volume Docker, servido via `StaticFiles`. Rotas admin (`/admin/reports*`,
multipart, atrás de `get_current_admin`) e rota pública (`/reports`, sem auth) seguem o mesmo
esqueleto de `admin_sensors_router.py`/`sensors_router.py`. Frontend ganha `AdminPublicacoesPage.tsx`
(mesmo padrão de `AdminSensoresPage.tsx`) e `PublicacoesPage.tsx` passa a usar `useQuery` em vez do
JSON estático.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest (+ `python-multipart`, dependência nova pra
`UploadFile`/`Form`); React 19, `@tanstack/react-query`, Vitest + Testing Library.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-26-admin-publicacoes-design.md`
- Migração total: as 14 publicações atuais de `reports.json` são importadas pro banco; depois de
  confirmar em produção, `reports.json` e `frontend/public/reports/*` são removidos (passo manual,
  fora deste plano).
- Storage é disco local + volume Docker nomeado (`reports_data`), não bytea no Postgres nem storage
  externo.
- CRUD completo com **hard-delete** (diferente do soft-delete de sensores) — publicação não tem
  dependência de milhões de linhas como `sensor_index` tem.
- Capa: `image/jpeg`, `image/png`, `image/webp`, máx. 5MB. PDF: `application/pdf`, máx. 20MB.
- `published_date` é campo manual (date picker), nunca timestamp de upload.
- Update aceita arquivos opcionais — se omitidos, mantém os arquivos já associados.
- Sem workflow de rascunho/publicação — toda publicação criada aparece imediatamente na página
  pública, ordenada por `published_date` desc.

---

### Task 1: Backend — entidade, porta e casos de uso de publicações (sem I/O de arquivo/DB)

**Files:**
- Create: `backend/domain/entities/report.py`
- Create: `backend/application/ports/report_repository.py`
- Create: `backend/adapters/outbound/memory/in_memory_report_repository.py`
- Create: `backend/application/use_cases/create_report.py`
- Create: `backend/application/use_cases/update_report.py`
- Create: `backend/application/use_cases/delete_report.py`
- Create: `backend/application/use_cases/list_all_reports.py`
- Test: `backend/tests/application/test_create_report.py`
- Test: `backend/tests/application/test_update_report.py`
- Test: `backend/tests/application/test_delete_report.py`
- Test: `backend/tests/application/test_list_all_reports.py`

**Interfaces:**
- Produces: `Report(id, title, description, image_path, file_path, published_date, created_at)`;
  `ReportRepository.list_all() -> list[Report]` (ordenado por `published_date` desc),
  `get_by_id(report_id: int) -> Report | None`,
  `create(title, description, image_path, file_path, published_date) -> Report`,
  `update(report_id, title, description, published_date, image_path=None, file_path=None) -> Report`
  (paths `None` = mantém os atuais), `delete(report_id) -> None`.
  `CreateReport.execute(*, title, description, image_path, file_path, published_date) -> Report`.
  `UpdateReport.execute(*, report_id, title, description, published_date, image_path=None, file_path=None) -> Report`
  levanta `ReportNotFoundError` se `report_id` não existir.
  `DeleteReport.execute(report_id) -> None` levanta `ReportNotFoundError` se não existir.
  `ListAllReports.execute() -> list[Report]`. Usado pela Task 3 (adapter Postgres) e Task 4 (rotas).

- [ ] **Step 1: Escrever os testes de `CreateReport` e `ListAllReports` (RED)**

`backend/tests/application/test_create_report.py`:

```python
from datetime import date, datetime, timezone

from application.use_cases.create_report import CreateReport
from adapters.outbound.memory.in_memory_report_repository import InMemoryReportRepository


def test_create_report_returns_new_report():
    repository = InMemoryReportRepository([])
    use_case = CreateReport(repository)

    report = use_case.execute(
        title="Relatório Teste",
        description="Descrição do relatório",
        image_path="img/a.jpg",
        file_path="pdf/a.pdf",
        published_date=date(2024, 3, 1),
    )

    assert report.title == "Relatório Teste"
    assert report.image_path == "img/a.jpg"
    assert report.published_date == date(2024, 3, 1)
    assert len(repository.list_all()) == 1
```

`backend/tests/application/test_list_all_reports.py`:

```python
from datetime import date, datetime, timezone

from application.use_cases.list_all_reports import ListAllReports
from adapters.outbound.memory.in_memory_report_repository import InMemoryReportRepository
from domain.entities.report import Report


def test_list_all_reports_orders_by_published_date_desc():
    older = Report(
        id=1, title="Antigo", description="d", image_path="img/a.jpg", file_path="pdf/a.pdf",
        published_date=date(2023, 1, 1), created_at=datetime.now(timezone.utc),
    )
    newer = Report(
        id=2, title="Novo", description="d", image_path="img/b.jpg", file_path="pdf/b.pdf",
        published_date=date(2024, 6, 1), created_at=datetime.now(timezone.utc),
    )
    repository = InMemoryReportRepository([older, newer])
    use_case = ListAllReports(repository)

    reports = use_case.execute()

    assert [r.id for r in reports] == [2, 1]
```

- [ ] **Step 2: Rodar os testes, confirmar que falham**

Run: `cd backend && pytest tests/application/test_create_report.py tests/application/test_list_all_reports.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'application.use_cases.create_report'`

- [ ] **Step 3: Criar a entidade `Report`**

`backend/domain/entities/report.py`:

```python
from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class Report:
    id: int
    title: str
    description: str
    image_path: str
    file_path: str
    published_date: date
    created_at: datetime
```

- [ ] **Step 4: Criar o port `ReportRepository`**

`backend/application/ports/report_repository.py`:

```python
from abc import ABC, abstractmethod
from datetime import date

from domain.entities.report import Report


class ReportRepository(ABC):
    @abstractmethod
    def list_all(self) -> list[Report]:
        raise NotImplementedError

    @abstractmethod
    def get_by_id(self, report_id: int) -> Report | None:
        raise NotImplementedError

    @abstractmethod
    def create(
        self, title: str, description: str, image_path: str, file_path: str,
        published_date: date,
    ) -> Report:
        raise NotImplementedError

    @abstractmethod
    def update(
        self, report_id: int, title: str, description: str, published_date: date,
        image_path: str | None = None, file_path: str | None = None,
    ) -> Report:
        raise NotImplementedError

    @abstractmethod
    def delete(self, report_id: int) -> None:
        raise NotImplementedError
```

- [ ] **Step 5: Criar `InMemoryReportRepository`**

`backend/adapters/outbound/memory/in_memory_report_repository.py`:

```python
from datetime import datetime, timezone

from application.ports.report_repository import ReportRepository
from domain.entities.report import Report


class InMemoryReportRepository(ReportRepository):
    def __init__(self, reports: list[Report]) -> None:
        self._reports = reports
        self._next_id = max((r.id for r in reports), default=0) + 1

    def list_all(self) -> list[Report]:
        return sorted(self._reports, key=lambda r: r.published_date, reverse=True)

    def get_by_id(self, report_id: int) -> Report | None:
        return next((r for r in self._reports if r.id == report_id), None)

    def create(self, title, description, image_path, file_path, published_date) -> Report:
        report = Report(
            id=self._next_id, title=title, description=description, image_path=image_path,
            file_path=file_path, published_date=published_date,
            created_at=datetime.now(timezone.utc),
        )
        self._reports.append(report)
        self._next_id += 1
        return report

    def update(
        self, report_id, title, description, published_date, image_path=None, file_path=None,
    ) -> Report:
        existing = next(r for r in self._reports if r.id == report_id)
        updated = Report(
            id=existing.id, title=title, description=description,
            image_path=image_path if image_path is not None else existing.image_path,
            file_path=file_path if file_path is not None else existing.file_path,
            published_date=published_date, created_at=existing.created_at,
        )
        self._reports = [updated if r.id == report_id else r for r in self._reports]
        return updated

    def delete(self, report_id: int) -> None:
        self._reports = [r for r in self._reports if r.id != report_id]
```

- [ ] **Step 6: Rodar os testes de `CreateReport`/`ListAllReports`, confirmar que passam**

Run: `cd backend && pytest tests/application/test_create_report.py tests/application/test_list_all_reports.py -v`
Expected: 2 passed

- [ ] **Step 7: Escrever os testes de `UpdateReport` e `DeleteReport` (RED)**

`backend/tests/application/test_update_report.py`:

```python
from datetime import date, datetime, timezone

import pytest

from application.use_cases.update_report import ReportNotFoundError, UpdateReport
from adapters.outbound.memory.in_memory_report_repository import InMemoryReportRepository
from domain.entities.report import Report


def _existing_report() -> Report:
    return Report(
        id=1, title="Original", description="d", image_path="img/a.jpg", file_path="pdf/a.pdf",
        published_date=date(2024, 3, 1), created_at=datetime.now(timezone.utc),
    )


def test_update_report_without_new_paths_keeps_existing_files():
    repository = InMemoryReportRepository([_existing_report()])
    use_case = UpdateReport(repository)

    updated = use_case.execute(
        report_id=1, title="Editado", description="Nova descrição",
        published_date=date(2024, 4, 1),
    )

    assert updated.title == "Editado"
    assert updated.image_path == "img/a.jpg"
    assert updated.file_path == "pdf/a.pdf"


def test_update_report_with_new_paths_replaces_files():
    repository = InMemoryReportRepository([_existing_report()])
    use_case = UpdateReport(repository)

    updated = use_case.execute(
        report_id=1, title="Editado", description="Nova descrição",
        published_date=date(2024, 4, 1), image_path="img/novo.jpg", file_path="pdf/novo.pdf",
    )

    assert updated.image_path == "img/novo.jpg"
    assert updated.file_path == "pdf/novo.pdf"


def test_update_report_raises_when_not_found():
    repository = InMemoryReportRepository([])
    use_case = UpdateReport(repository)

    with pytest.raises(ReportNotFoundError):
        use_case.execute(
            report_id=999, title="X", description="X", published_date=date(2024, 1, 1),
        )
```

`backend/tests/application/test_delete_report.py`:

```python
from datetime import date, datetime, timezone

import pytest

from application.use_cases.delete_report import DeleteReport
from application.use_cases.update_report import ReportNotFoundError
from adapters.outbound.memory.in_memory_report_repository import InMemoryReportRepository
from domain.entities.report import Report


def test_delete_report_removes_it():
    report = Report(
        id=1, title="A", description="d", image_path="img/a.jpg", file_path="pdf/a.pdf",
        published_date=date(2024, 3, 1), created_at=datetime.now(timezone.utc),
    )
    repository = InMemoryReportRepository([report])
    use_case = DeleteReport(repository)

    use_case.execute(1)

    assert repository.list_all() == []


def test_delete_report_raises_when_not_found():
    repository = InMemoryReportRepository([])
    use_case = DeleteReport(repository)

    with pytest.raises(ReportNotFoundError):
        use_case.execute(999)
```

- [ ] **Step 8: Rodar, confirmar que falham**

Run: `cd backend && pytest tests/application/test_update_report.py tests/application/test_delete_report.py -v`
Expected: FAIL — módulos não existem ainda

- [ ] **Step 9: Criar `UpdateReport`, `DeleteReport`, `ListAllReports`**

`backend/application/use_cases/update_report.py`:

```python
from datetime import date

from application.ports.report_repository import ReportRepository
from domain.entities.report import Report


class ReportNotFoundError(Exception):
    pass


class UpdateReport:
    def __init__(self, report_repository: ReportRepository) -> None:
        self._report_repository = report_repository

    def execute(
        self, *, report_id: int, title: str, description: str, published_date: date,
        image_path: str | None = None, file_path: str | None = None,
    ) -> Report:
        if self._report_repository.get_by_id(report_id) is None:
            raise ReportNotFoundError(f"Publicação id={report_id} não encontrada")
        return self._report_repository.update(
            report_id=report_id, title=title, description=description,
            published_date=published_date, image_path=image_path, file_path=file_path,
        )
```

`backend/application/use_cases/delete_report.py`:

```python
from application.ports.report_repository import ReportRepository
from application.use_cases.update_report import ReportNotFoundError


class DeleteReport:
    def __init__(self, report_repository: ReportRepository) -> None:
        self._report_repository = report_repository

    def execute(self, report_id: int) -> None:
        if self._report_repository.get_by_id(report_id) is None:
            raise ReportNotFoundError(f"Publicação id={report_id} não encontrada")
        self._report_repository.delete(report_id)
```

`backend/application/use_cases/list_all_reports.py`:

```python
from application.ports.report_repository import ReportRepository
from domain.entities.report import Report


class ListAllReports:
    def __init__(self, report_repository: ReportRepository) -> None:
        self._report_repository = report_repository

    def execute(self) -> list[Report]:
        return self._report_repository.list_all()
```

Também criar `backend/application/use_cases/create_report.py` (usado no Step 1, faltava o
arquivo de implementação):

```python
from datetime import date

from application.ports.report_repository import ReportRepository
from domain.entities.report import Report


class CreateReport:
    def __init__(self, report_repository: ReportRepository) -> None:
        self._report_repository = report_repository

    def execute(
        self, *, title: str, description: str, image_path: str, file_path: str,
        published_date: date,
    ) -> Report:
        return self._report_repository.create(
            title=title, description=description, image_path=image_path,
            file_path=file_path, published_date=published_date,
        )
```

- [ ] **Step 10: Rodar todos os testes desta task, confirmar que passam**

Run: `cd backend && pytest tests/application/test_create_report.py tests/application/test_update_report.py tests/application/test_delete_report.py tests/application/test_list_all_reports.py -v`
Expected: 7 passed

- [ ] **Step 11: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/domain/entities/report.py \
        backend/application/ports/report_repository.py \
        backend/adapters/outbound/memory/in_memory_report_repository.py \
        backend/application/use_cases/create_report.py \
        backend/application/use_cases/update_report.py \
        backend/application/use_cases/delete_report.py \
        backend/application/use_cases/list_all_reports.py \
        backend/tests/application/test_create_report.py \
        backend/tests/application/test_update_report.py \
        backend/tests/application/test_delete_report.py \
        backend/tests/application/test_list_all_reports.py
git commit -m "feat(admin): adiciona entidade, porta e casos de uso de publicações"
```

---

### Task 2: Backend — storage de arquivo (upload de capa + PDF)

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/infrastructure/settings.py`
- Create: `backend/infrastructure/file_storage.py`
- Create: `backend/tests/infrastructure/__init__.py`
- Test: `backend/tests/infrastructure/test_file_storage.py`

**Interfaces:**
- Produces: `settings.reports_storage_dir: str` (default `"./data/reports"`),
  `save_upload(upload: UploadFile, subdir: Literal["img", "pdf"]) -> str` (retorna path relativo
  tipo `"img/<uuid>.jpg"`, levanta `InvalidFileError` se mime/tamanho inválido),
  `delete_file(relative_path: str) -> None` (idempotente). Usado pela Task 4 (rotas) e Task 5
  (script de migração).

- [ ] **Step 1: Instalar a dependência nova**

`backend/requirements.txt` — adicionar a linha:

```
python-multipart>=0.0.9
```

Run: `cd backend && .venv/bin/pip install python-multipart`
Expected: `Successfully installed python-multipart-...`

- [ ] **Step 2: Escrever os testes de `file_storage` (RED)**

`backend/tests/infrastructure/__init__.py`: arquivo vazio.

`backend/tests/infrastructure/test_file_storage.py`:

```python
import io

import pytest
from starlette.datastructures import Headers, UploadFile

from infrastructure import file_storage
from infrastructure.file_storage import InvalidFileError, delete_file, save_upload
from infrastructure.settings import settings


@pytest.fixture(autouse=True)
def reports_storage_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "reports_storage_dir", str(tmp_path))


def _upload(content: bytes, content_type: str) -> UploadFile:
    return UploadFile(file=io.BytesIO(content), filename="test", headers=Headers({"content-type": content_type}))


def test_save_upload_accepts_valid_image_and_returns_relative_path():
    relative_path = save_upload(_upload(b"fake-png-bytes", "image/png"), "img")

    assert relative_path.startswith("img/")
    assert relative_path.endswith(".png")


def test_save_upload_accepts_valid_pdf():
    relative_path = save_upload(_upload(b"fake-pdf-bytes", "application/pdf"), "pdf")

    assert relative_path.startswith("pdf/")
    assert relative_path.endswith(".pdf")


def test_save_upload_rejects_invalid_mime():
    with pytest.raises(InvalidFileError):
        save_upload(_upload(b"not an image", "application/x-msdownload"), "img")


def test_save_upload_rejects_oversized_image():
    big_content = b"0" * (5 * 1024 * 1024 + 1)
    with pytest.raises(InvalidFileError):
        save_upload(_upload(big_content, "image/png"), "img")


def test_delete_file_is_idempotent():
    relative_path = save_upload(_upload(b"data", "application/pdf"), "pdf")

    delete_file(relative_path)
    delete_file(relative_path)  # segunda chamada não deve levantar erro
```

- [ ] **Step 3: Rodar, confirmar que falha**

Run: `cd backend && pytest tests/infrastructure/test_file_storage.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.file_storage'`

- [ ] **Step 4: Adicionar `reports_storage_dir` às settings**

Em `backend/infrastructure/settings.py`, adicionar o campo (junto dos outros):

```python
    reports_storage_dir: str = "./data/reports"
```

- [ ] **Step 5: Criar `file_storage.py`**

`backend/infrastructure/file_storage.py`:

```python
import os
import uuid
from typing import Literal

from fastapi import UploadFile

from infrastructure.settings import settings

_ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
_ALLOWED_PDF_TYPES = {"application/pdf": ".pdf"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_MAX_PDF_BYTES = 20 * 1024 * 1024


class InvalidFileError(Exception):
    pass


def _validate(upload: UploadFile, allowed: dict[str, str], max_bytes: int) -> str:
    if upload.content_type not in allowed:
        raise InvalidFileError(
            f"Tipo de arquivo não suportado: {upload.content_type!r}. Aceitos: {sorted(allowed)}"
        )
    upload.file.seek(0, os.SEEK_END)
    size = upload.file.tell()
    upload.file.seek(0)
    if size > max_bytes:
        raise InvalidFileError(f"Arquivo muito grande: {size} bytes (máx. {max_bytes})")
    return allowed[upload.content_type]


def save_upload(upload: UploadFile, subdir: Literal["img", "pdf"]) -> str:
    allowed, max_bytes = (
        (_ALLOWED_IMAGE_TYPES, _MAX_IMAGE_BYTES) if subdir == "img"
        else (_ALLOWED_PDF_TYPES, _MAX_PDF_BYTES)
    )
    extension = _validate(upload, allowed, max_bytes)

    directory = os.path.join(settings.reports_storage_dir, subdir)
    os.makedirs(directory, exist_ok=True)
    filename = f"{uuid.uuid4()}{extension}"
    with open(os.path.join(directory, filename), "wb") as out:
        out.write(upload.file.read())
    return f"{subdir}/{filename}"


def delete_file(relative_path: str) -> None:
    full_path = os.path.join(settings.reports_storage_dir, relative_path)
    if os.path.exists(full_path):
        os.remove(full_path)
```

- [ ] **Step 6: Rodar os testes, confirmar que passam**

Run: `cd backend && pytest tests/infrastructure/test_file_storage.py -v`
Expected: 5 passed

- [ ] **Step 7: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/requirements.txt \
        backend/infrastructure/settings.py \
        backend/infrastructure/file_storage.py \
        backend/tests/infrastructure/__init__.py \
        backend/tests/infrastructure/test_file_storage.py
git commit -m "feat(admin): adiciona storage de arquivo em disco pra capa+PDF de publicações"
```

---

### Task 3: Backend — tabela `reports` e adapter Postgres

**Files:**
- Modify: `backend/adapters/outbound/postgres/models.py`
- Create: `backend/alembic/versions/0008_create_reports_table.py`
- Create: `backend/adapters/outbound/postgres/postgres_report_repository.py`
- Test: `backend/tests/adapters/test_postgres_report_repository.py`

**Interfaces:**
- Consumes: `Report`, `ReportRepository` (Task 1).
- Produces: `PostgresReportRepository` implementando `ReportRepository` contra a tabela `reports`.
  Usado pela Task 4 (rotas) e Task 5 (script de migração).

- [ ] **Step 1: Adicionar `ReportModel` aos models SQLAlchemy**

Em `backend/adapters/outbound/postgres/models.py`, trocar a linha de import:

```python
from datetime import datetime
```

por:

```python
from datetime import date, datetime
```

E trocar:

```python
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
```

por:

```python
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String, Text, func
```

Adicionar a classe no final do arquivo:

```python
class ReportModel(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    image_path: Mapped[str] = mapped_column(String)
    file_path: Mapped[str] = mapped_column(String)
    published_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 2: Criar a migration Alembic**

`backend/alembic/versions/0008_create_reports_table.py`:

```python
"""create reports table

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("image_path", sa.String, nullable=False),
        sa.Column("file_path", sa.String, nullable=False),
        sa.Column("published_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("reports")
```

- [ ] **Step 3: Aplicar a migration nos bancos de dev e teste**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality alembic upgrade head`
Expected: `Running upgrade 0007 -> 0008, create reports table`

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test alembic upgrade head`
Expected: `Running upgrade 0007 -> 0008, create reports table`

- [ ] **Step 4: Escrever o teste do adapter Postgres (RED)**

`backend/tests/adapters/test_postgres_report_repository.py`:

```python
from datetime import date

from adapters.outbound.postgres.postgres_report_repository import PostgresReportRepository


def test_create_update_delete_roundtrip(db_session):
    repository = PostgresReportRepository(db_session)

    created = repository.create(
        title="TEST Relatório", description="Descrição de teste",
        image_path="img/test.jpg", file_path="pdf/test.pdf",
        published_date=date(2024, 3, 1),
    )
    assert created.id is not None
    assert created.title == "TEST Relatório"

    fetched = repository.get_by_id(created.id)
    assert fetched is not None
    assert fetched.title == "TEST Relatório"

    updated = repository.update(
        created.id, title="TEST Editado", description="Nova descrição",
        published_date=date(2024, 4, 1),
    )
    assert updated.title == "TEST Editado"
    assert updated.image_path == "img/test.jpg"  # não passado no update, mantém

    updated_with_new_image = repository.update(
        created.id, title="TEST Editado", description="Nova descrição",
        published_date=date(2024, 4, 1), image_path="img/novo.jpg",
    )
    assert updated_with_new_image.image_path == "img/novo.jpg"

    repository.delete(created.id)
    assert repository.get_by_id(created.id) is None


def test_list_all_orders_by_published_date_desc(db_session):
    repository = PostgresReportRepository(db_session)
    repository.create(
        title="TEST Antigo", description="d", image_path="img/a.jpg", file_path="pdf/a.pdf",
        published_date=date(2023, 1, 1),
    )
    repository.create(
        title="TEST Novo", description="d", image_path="img/b.jpg", file_path="pdf/b.pdf",
        published_date=date(2024, 6, 1),
    )

    reports = [r for r in repository.list_all() if r.title.startswith("TEST")]

    assert reports[0].title == "TEST Novo"
    assert reports[1].title == "TEST Antigo"
```

- [ ] **Step 5: Rodar, confirmar que falha**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/adapters/test_postgres_report_repository.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'adapters.outbound.postgres.postgres_report_repository'`

- [ ] **Step 6: Implementar `PostgresReportRepository`**

`backend/adapters/outbound/postgres/postgres_report_repository.py`:

```python
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from adapters.outbound.postgres.models import ReportModel
from application.ports.report_repository import ReportRepository
from domain.entities.report import Report


def _to_domain(row: ReportModel) -> Report:
    return Report(
        id=row.id, title=row.title, description=row.description, image_path=row.image_path,
        file_path=row.file_path, published_date=row.published_date, created_at=row.created_at,
    )


class PostgresReportRepository(ReportRepository):
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_all(self) -> list[Report]:
        rows = self._session.execute(
            select(ReportModel).order_by(ReportModel.published_date.desc())
        ).scalars()
        return [_to_domain(row) for row in rows]

    def get_by_id(self, report_id: int) -> Report | None:
        row = self._session.get(ReportModel, report_id)
        return _to_domain(row) if row else None

    def create(
        self, title: str, description: str, image_path: str, file_path: str,
        published_date: date,
    ) -> Report:
        row = ReportModel(
            title=title, description=description, image_path=image_path,
            file_path=file_path, published_date=published_date,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return _to_domain(row)

    def update(
        self, report_id: int, title: str, description: str, published_date: date,
        image_path: str | None = None, file_path: str | None = None,
    ) -> Report:
        row = self._session.get(ReportModel, report_id)
        row.title = title
        row.description = description
        row.published_date = published_date
        if image_path is not None:
            row.image_path = image_path
        if file_path is not None:
            row.file_path = file_path
        self._session.commit()
        self._session.refresh(row)
        return _to_domain(row)

    def delete(self, report_id: int) -> None:
        row = self._session.get(ReportModel, report_id)
        self._session.delete(row)
        self._session.commit()
```

- [ ] **Step 7: Rodar os testes do adapter, confirmar que passam**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/adapters/test_postgres_report_repository.py -v`
Expected: 2 passed

- [ ] **Step 8: Rodar toda a suíte, confirmar zero regressão**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/ -q`
Expected: todos passam

- [ ] **Step 9: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/adapters/outbound/postgres/models.py \
        backend/alembic/versions/0008_create_reports_table.py \
        backend/adapters/outbound/postgres/postgres_report_repository.py \
        backend/tests/adapters/test_postgres_report_repository.py
git commit -m "feat(admin): adiciona tabela reports e adapter Postgres"
```

---

### Task 4: Backend — rotas HTTP (admin CRUD multipart + rota pública) e storage servido

**Files:**
- Create: `backend/adapters/inbound/http/admin_reports_router.py`
- Create: `backend/adapters/inbound/http/reports_router.py`
- Modify: `backend/infrastructure/main.py`
- Modify: `infra/docker-compose.yml`
- Test: `backend/tests/adapters/test_admin_reports_router.py`
- Test: `backend/tests/adapters/test_reports_router.py`

**Interfaces:**
- Consumes: `get_current_admin`, `CreateReport`/`UpdateReport`/`DeleteReport`/`ListAllReports`
  (Task 1), `PostgresReportRepository` (Task 3), `save_upload`/`delete_file`/`InvalidFileError`
  (Task 2).
- Produces: `GET /admin/reports`, `POST /admin/reports`, `PATCH /admin/reports/{id}`,
  `DELETE /admin/reports/{id}` (todas atrás de `Depends(get_current_admin)`); `GET /reports`
  (pública). Ambas devolvem `image_path`/`file_path` como `"/media/reports/..."` (path absoluto
  relativo ao backend). Usado pelo frontend (Tasks 6-8).

- [ ] **Step 1: Escrever os testes do router admin (RED)**

`backend/tests/adapters/test_admin_reports_router.py`:

```python
import base64
import io

import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from adapters.outbound.postgres.postgres_admin_user_repository import PostgresAdminUserRepository
from adapters.outbound.security.argon2_password_hasher import Argon2idPasswordHasher
from infrastructure.settings import settings

_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.fixture(autouse=True)
def reports_storage_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "reports_storage_dir", str(tmp_path))


@pytest.fixture(autouse=True)
def cleanup_tables(db_engine):
    yield
    with db_engine.connect() as connection:
        connection.execute(text("DELETE FROM admin_sessions"))
        connection.execute(text("DELETE FROM admin_users"))
        connection.execute(text("DELETE FROM reports WHERE title LIKE 'RPTTEST%'"))
        connection.commit()


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from adapters.inbound.http.auth_router import _rate_limiter
    _rate_limiter._attempts.clear()
    yield
    _rate_limiter._attempts.clear()


def _logged_in_client(client, db_connection, email="admin-reports@ufac.br"):
    session = sessionmaker(bind=db_connection)()
    hasher = Argon2idPasswordHasher()
    PostgresAdminUserRepository(session).create(email, hasher.hash("senha-forte-123"))
    session.commit()
    session.close()

    login_response = client.post(
        "/auth/login", json={"email": email, "password": "senha-forte-123"}
    )
    client.cookies.set("admin_session", login_response.cookies["admin_session"])
    return client


def _create_payload(title="RPTTEST1"):
    return {
        "data": {"title": title, "description": "Descrição de teste", "published_date": "2024-03-01"},
        "files": {
            "image": ("cover.png", io.BytesIO(_TINY_PNG), "image/png"),
            "file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"),
        },
    }


def test_get_admin_reports_requires_auth(client):
    response = client.get("/admin/reports")
    assert response.status_code == 401


def test_create_report_then_appears_in_list(client, db_connection):
    client = _logged_in_client(client, db_connection)
    payload = _create_payload()

    create_response = client.post("/admin/reports", data=payload["data"], files=payload["files"])

    assert create_response.status_code == 201
    body = create_response.json()
    assert body["title"] == "RPTTEST1"
    assert body["image_path"].startswith("/media/reports/img/")
    assert body["file_path"].startswith("/media/reports/pdf/")

    list_response = client.get("/admin/reports")
    assert any(r["title"] == "RPTTEST1" for r in list_response.json())


def test_create_report_rejects_invalid_image_mime(client, db_connection):
    client = _logged_in_client(client, db_connection)
    payload = _create_payload("RPTTEST2")
    payload["files"]["image"] = ("cover.exe", io.BytesIO(b"not-an-image"), "application/x-msdownload")

    response = client.post("/admin/reports", data=payload["data"], files=payload["files"])

    assert response.status_code == 422


def test_update_report_without_new_files_keeps_existing_paths(client, db_connection):
    client = _logged_in_client(client, db_connection)
    payload = _create_payload("RPTTEST3")
    created = client.post("/admin/reports", data=payload["data"], files=payload["files"]).json()

    response = client.patch(
        f"/admin/reports/{created['id']}",
        data={"title": "RPTTEST3-B", "description": "Nova descrição", "published_date": "2024-04-01"},
        files={"image": ("", b""), "file": ("", b"")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "RPTTEST3-B"
    assert body["image_path"] == created["image_path"]
    assert body["file_path"] == created["file_path"]


def test_delete_report_removes_it(client, db_connection):
    client = _logged_in_client(client, db_connection)
    payload = _create_payload("RPTTEST4")
    created = client.post("/admin/reports", data=payload["data"], files=payload["files"]).json()

    response = client.delete(f"/admin/reports/{created['id']}")

    assert response.status_code == 204
    list_response = client.get("/admin/reports")
    assert not any(r["id"] == created["id"] for r in list_response.json())


def test_update_and_delete_unknown_report_return_404(client, db_connection):
    client = _logged_in_client(client, db_connection)

    update_response = client.patch(
        "/admin/reports/99999999",
        data={"title": "X", "description": "X", "published_date": "2024-01-01"},
        files={"image": ("", b""), "file": ("", b"")},
    )
    delete_response = client.delete("/admin/reports/99999999")

    assert update_response.status_code == 404
    assert delete_response.status_code == 404
```

`backend/tests/adapters/test_reports_router.py`:

```python
import io

from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from adapters.outbound.postgres.postgres_admin_user_repository import PostgresAdminUserRepository
from adapters.outbound.security.argon2_password_hasher import Argon2idPasswordHasher
import base64
import pytest
from infrastructure.settings import settings

_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


@pytest.fixture(autouse=True)
def reports_storage_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "reports_storage_dir", str(tmp_path))


@pytest.fixture(autouse=True)
def cleanup_tables(db_engine):
    yield
    with db_engine.connect() as connection:
        connection.execute(text("DELETE FROM admin_sessions"))
        connection.execute(text("DELETE FROM admin_users"))
        connection.execute(text("DELETE FROM reports WHERE title LIKE 'PUBTEST%'"))
        connection.commit()


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    from adapters.inbound.http.auth_router import _rate_limiter
    _rate_limiter._attempts.clear()
    yield
    _rate_limiter._attempts.clear()


def test_public_reports_endpoint_requires_no_auth_and_lists_created_report(client, db_connection):
    session = sessionmaker(bind=db_connection)()
    hasher = Argon2idPasswordHasher()
    PostgresAdminUserRepository(session).create("admin-pub@ufac.br", hasher.hash("senha-forte-123"))
    session.commit()
    session.close()

    login_response = client.post(
        "/auth/login", json={"email": "admin-pub@ufac.br", "password": "senha-forte-123"}
    )
    client.cookies.set("admin_session", login_response.cookies["admin_session"])
    client.post(
        "/admin/reports",
        data={"title": "PUBTEST1", "description": "d", "published_date": "2024-05-01"},
        files={
            "image": ("cover.png", io.BytesIO(_TINY_PNG), "image/png"),
            "file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"),
        },
    )
    client.cookies.clear()

    response = client.get("/reports")

    assert response.status_code == 200
    assert any(r["title"] == "PUBTEST1" for r in response.json())
```

- [ ] **Step 2: Rodar, confirmar que falham**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/adapters/test_admin_reports_router.py tests/adapters/test_reports_router.py -v`
Expected: FAIL — `404 Not Found` (rotas não existem ainda)

- [ ] **Step 3: Criar o router admin**

`backend/adapters/inbound/http/admin_reports_router.py`:

```python
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from adapters.inbound.http.auth_router import get_current_admin
from adapters.outbound.postgres.postgres_report_repository import PostgresReportRepository
from application.use_cases.create_report import CreateReport
from application.use_cases.delete_report import DeleteReport
from application.use_cases.list_all_reports import ListAllReports
from application.use_cases.update_report import ReportNotFoundError, UpdateReport
from domain.entities.admin_user import AdminUser
from domain.entities.report import Report
from infrastructure.dependencies import get_db_session
from infrastructure.file_storage import InvalidFileError, delete_file, save_upload

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_admin)])


def _to_dict(report: Report) -> dict:
    return {
        "id": report.id,
        "title": report.title,
        "description": report.description,
        "image_path": f"/media/reports/{report.image_path}",
        "file_path": f"/media/reports/{report.file_path}",
        "published_date": report.published_date.isoformat(),
    }


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=422, detail="published_date deve estar no formato YYYY-MM-DD"
        )


@router.get("/reports")
def get_admin_reports(
    session: Session = Depends(get_db_session), _admin: AdminUser = Depends(get_current_admin)
) -> list[dict]:
    reports = ListAllReports(PostgresReportRepository(session)).execute()
    return [_to_dict(r) for r in reports]


@router.post("/reports", status_code=201)
def create_report(
    title: str = Form(...),
    description: str = Form(...),
    published_date: str = Form(...),
    image: UploadFile = File(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_db_session),
    _admin: AdminUser = Depends(get_current_admin),
) -> dict:
    parsed_date = _parse_date(published_date)
    try:
        image_path = save_upload(image, "img")
        file_path = save_upload(file, "pdf")
    except InvalidFileError as error:
        raise HTTPException(status_code=422, detail=str(error))

    report = CreateReport(PostgresReportRepository(session)).execute(
        title=title, description=description, image_path=image_path,
        file_path=file_path, published_date=parsed_date,
    )
    return _to_dict(report)


@router.patch("/reports/{report_id}")
def update_report(
    report_id: int,
    title: str = Form(...),
    description: str = Form(...),
    published_date: str = Form(...),
    image: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    session: Session = Depends(get_db_session),
    _admin: AdminUser = Depends(get_current_admin),
) -> dict:
    repository = PostgresReportRepository(session)
    existing = repository.get_by_id(report_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Publicação id={report_id} não encontrada")
    parsed_date = _parse_date(published_date)

    try:
        new_image_path = save_upload(image, "img") if image is not None and image.filename else None
        new_file_path = save_upload(file, "pdf") if file is not None and file.filename else None
    except InvalidFileError as error:
        raise HTTPException(status_code=422, detail=str(error))

    try:
        updated = UpdateReport(repository).execute(
            report_id=report_id, title=title, description=description,
            published_date=parsed_date, image_path=new_image_path, file_path=new_file_path,
        )
    except ReportNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error))

    if new_image_path is not None:
        delete_file(existing.image_path)
    if new_file_path is not None:
        delete_file(existing.file_path)

    return _to_dict(updated)


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    session: Session = Depends(get_db_session),
    _admin: AdminUser = Depends(get_current_admin),
) -> None:
    repository = PostgresReportRepository(session)
    existing = repository.get_by_id(report_id)
    if existing is None:
        raise HTTPException(status_code=404, detail=f"Publicação id={report_id} não encontrada")
    DeleteReport(repository).execute(report_id)
    delete_file(existing.image_path)
    delete_file(existing.file_path)
```

Nota: o teste de update sem arquivo novo manda `files={"image": ("", b""), "file": ("", b"")}` —
isso força o cliente HTTP a montar a requisição como `multipart/form-data` (necessário pros campos
`Form(...)` serem parseados), mas com um arquivo "vazio" (nome e conteúdo em branco) em vez de
omitir o campo. Por isso a rota checa `image.filename` (não só `image is not None`): um `UploadFile`
com `filename=""` é falsy, então `new_image_path`/`new_file_path` continuam `None` e os arquivos
existentes são mantidos.

- [ ] **Step 4: Criar o router público**

`backend/adapters/inbound/http/reports_router.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from adapters.outbound.postgres.postgres_report_repository import PostgresReportRepository
from application.use_cases.list_all_reports import ListAllReports
from domain.entities.report import Report
from infrastructure.dependencies import get_db_session

router = APIRouter()


def _to_dict(report: Report) -> dict:
    return {
        "id": report.id,
        "title": report.title,
        "description": report.description,
        "image_path": f"/media/reports/{report.image_path}",
        "file_path": f"/media/reports/{report.file_path}",
        "published_date": report.published_date.isoformat(),
    }


@router.get("/reports")
def get_reports(session: Session = Depends(get_db_session)) -> list[dict]:
    reports = ListAllReports(PostgresReportRepository(session)).execute()
    return [_to_dict(r) for r in reports]
```

- [ ] **Step 5: Registrar os routers, montar o storage estático e liberar DELETE no CORS**

Em `backend/infrastructure/main.py`, o arquivo completo passa a ser:

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from adapters.inbound.http.admin_ingestion_router import router as admin_ingestion_router
from adapters.inbound.http.admin_reports_router import router as admin_reports_router
from adapters.inbound.http.admin_sensors_router import router as admin_sensors_router
from adapters.inbound.http.auth_router import router as auth_router
from adapters.inbound.http.health_router import router as health_router
from adapters.inbound.http.metrics_router import router as metrics_router
from adapters.inbound.http.municipios_router import router as municipios_router
from adapters.inbound.http.readings_router import router as readings_router
from adapters.inbound.http.reports_router import router as reports_router
from adapters.inbound.http.sensors_router import router as sensors_router
from infrastructure.settings import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(admin_sensors_router)
app.include_router(admin_ingestion_router)
app.include_router(admin_reports_router)
app.include_router(health_router)
app.include_router(metrics_router)
app.include_router(municipios_router)
app.include_router(readings_router)
app.include_router(sensors_router)
app.include_router(reports_router)

os.makedirs(settings.reports_storage_dir, exist_ok=True)
app.mount("/media/reports", StaticFiles(directory=settings.reports_storage_dir), name="reports-media")
```

- [ ] **Step 6: Rodar os testes desta task, confirmar que passam**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/adapters/test_admin_reports_router.py tests/adapters/test_reports_router.py -v`
Expected: 8 passed

- [ ] **Step 7: Adicionar o volume de storage ao Docker Compose**

Em `infra/docker-compose.yml`, no serviço `backend`, adicionar `volumes` e a env var:

```yaml
  backend:
    build:
      context: ../backend
    container_name: airquality_js_backend
    environment:
      ENVIRONMENT: development
      DATABASE_URL: postgresql://airquality_user:${POSTGRES_PASSWORD:-devpassword}@postgres:5432/airquality
      REPORTS_STORAGE_DIR: /app/data/reports
    volumes:
      - reports_data:/app/data/reports
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
```

E no bloco `volumes:` do final do arquivo:

```yaml
volumes:
  postgres_data:
    driver: local
  reports_data:
    driver: local
```

- [ ] **Step 8: Rodar toda a suíte, confirmar zero regressão**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/ -q`
Expected: todos passam

- [ ] **Step 9: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/adapters/inbound/http/admin_reports_router.py \
        backend/adapters/inbound/http/reports_router.py \
        backend/infrastructure/main.py \
        backend/tests/adapters/test_admin_reports_router.py \
        backend/tests/adapters/test_reports_router.py \
        infra/docker-compose.yml
git commit -m "feat(admin): adiciona rotas HTTP de publicações e storage estático servido"
```

---

### Task 5: Backend — script de migração de `reports.json`

**Files:**
- Create: `backend/infrastructure/migrate_reports_json.py`
- Test: `backend/tests/infrastructure/test_migrate_reports_json.py`

**Interfaces:**
- Consumes: `PostgresReportRepository` (Task 3), `ReportRepository` (Task 1, usado via
  `InMemoryReportRepository` no teste).
- Produces: `migrate(entries: list[dict], public_dir: Path, storage_dir: Path, repository: ReportRepository) -> list[Report]`
  (função testável, copia arquivos + cria linhas) e `main()` (CLI que chama `migrate` com
  `PostgresReportRepository` de verdade). Não é consumido por nenhuma outra task — roda uma vez,
  manualmente, contra o `reports.json` real.

- [ ] **Step 1: Escrever o teste de `migrate` (RED)**

`backend/tests/infrastructure/test_migrate_reports_json.py`:

```python
from adapters.outbound.memory.in_memory_report_repository import InMemoryReportRepository
from infrastructure.migrate_reports_json import migrate


def test_migrate_copies_files_and_creates_reports_sorted_by_input_order(tmp_path):
    public_dir = tmp_path / "public"
    (public_dir / "reports" / "img").mkdir(parents=True)
    (public_dir / "reports" / "pdf").mkdir(parents=True)
    (public_dir / "reports" / "img" / "a.jpg").write_bytes(b"fake-image")
    (public_dir / "reports" / "pdf" / "a.pdf").write_bytes(b"fake-pdf")

    storage_dir = tmp_path / "storage"
    repository = InMemoryReportRepository([])
    entries = [
        {
            "title": "Relatório A",
            "description": "Descrição A",
            "imageUrl": "/reports/img/a.jpg",
            "fileUrl": "/reports/pdf/a.pdf",
            "date": "01/03/2024",
        }
    ]

    created = migrate(entries, public_dir, storage_dir, repository)

    assert len(created) == 1
    assert created[0].title == "Relatório A"
    assert created[0].published_date.isoformat() == "2024-03-01"
    assert (storage_dir / "img" / "a.jpg").exists()
    assert (storage_dir / "pdf" / "a.pdf").exists()
    assert repository.get_by_id(created[0].id).image_path == "img/a.jpg"
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd backend && pytest tests/infrastructure/test_migrate_reports_json.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'infrastructure.migrate_reports_json'`

- [ ] **Step 3: Implementar o script**

`backend/infrastructure/migrate_reports_json.py`:

```python
import argparse
import json
import shutil
from datetime import date
from pathlib import Path

from application.ports.report_repository import ReportRepository
from domain.entities.report import Report
from infrastructure.database import SessionLocal
from infrastructure.settings import settings


def _parse_date(value: str) -> date:
    day, month, year = value.split("/")
    return date(int(year), int(month), int(day))


def migrate(
    entries: list[dict], public_dir: Path, storage_dir: Path, repository: ReportRepository,
) -> list[Report]:
    (storage_dir / "img").mkdir(parents=True, exist_ok=True)
    (storage_dir / "pdf").mkdir(parents=True, exist_ok=True)

    created = []
    for entry in entries:
        image_name = Path(entry["imageUrl"]).name
        file_name = Path(entry["fileUrl"]).name
        shutil.copy(public_dir / "reports" / "img" / image_name, storage_dir / "img" / image_name)
        shutil.copy(public_dir / "reports" / "pdf" / file_name, storage_dir / "pdf" / file_name)

        created.append(
            repository.create(
                title=entry["title"], description=entry["description"],
                image_path=f"img/{image_name}", file_path=f"pdf/{file_name}",
                published_date=_parse_date(entry["date"]),
            )
        )
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Migra reports.json + arquivos estáticos pro backend")
    parser.add_argument("--reports-json", required=True, help="Caminho pro reports.json do frontend")
    parser.add_argument(
        "--public-dir", required=True,
        help="Caminho pra frontend/public (contém reports/img e reports/pdf)",
    )
    args = parser.parse_args()

    entries = json.loads(Path(args.reports_json).read_text())

    from adapters.outbound.postgres.postgres_report_repository import PostgresReportRepository

    session = SessionLocal()
    try:
        repository = PostgresReportRepository(session)
        created = migrate(entries, Path(args.public_dir), Path(settings.reports_storage_dir), repository)
        for report in created:
            print(f"Importado: {report.title} (id={report.id})")
    finally:
        session.close()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Rodar o teste, confirmar que passa**

Run: `cd backend && pytest tests/infrastructure/test_migrate_reports_json.py -v`
Expected: 1 passed

- [ ] **Step 5: Rodar toda a suíte, confirmar zero regressão**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/ -q`
Expected: todos passam

- [ ] **Step 6: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add backend/infrastructure/migrate_reports_json.py \
        backend/tests/infrastructure/test_migrate_reports_json.py
git commit -m "feat(admin): adiciona script de migração de reports.json pro backend"
```

**Nota de execução futura (fora deste plano, manual):** depois que a Task 9 (deploy) estiver de pé
em produção, rodar `python -m infrastructure.migrate_reports_json --reports-json ../frontend/src/data/reports.json --public-dir ../frontend/public` uma vez contra o banco de produção, confirmar as 14
publicações na página `/publicacoes`, e só então remover `frontend/src/data/reports.json` e
`frontend/public/reports/*`.

---

### Task 6: Frontend — tipos de domínio e cliente HTTP de publicações

**Files:**
- Modify: `frontend/src/domain/report.ts`
- Modify: `frontend/src/infrastructure/api-client.ts`
- Test: `frontend/src/infrastructure/api-client.test.ts`

**Interfaces:**
- Produces: `Report { id, title, description, imageUrl, fileUrl, publishedDate }`,
  `fetchReports(): Promise<Report[]>` (pública), `fetchAdminReports(): Promise<Report[]>`,
  `createReport(formData: FormData): Promise<void>`, `updateReport(id, formData: FormData): Promise<void>`,
  `deleteReport(id): Promise<void>`. Usado pelas Tasks 7 e 8.

- [ ] **Step 1: Escrever os testes do cliente HTTP (RED)**

Adicionar em `frontend/src/infrastructure/api-client.test.ts` (o arquivo já existe da Fase 5 —
adicionar estes casos ao `describe` existente ou criar um novo `describe` no mesmo arquivo):

```typescript
import { createReport, deleteReport, fetchAdminReports, fetchReports } from './api-client'

describe('report api-client functions', () => {
  it('fetchReports maps backend paths to absolute URLs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 1, title: 'Relatório A', description: 'Descrição',
          image_path: '/media/reports/img/a.jpg', file_path: '/media/reports/pdf/a.pdf',
          published_date: '2024-03-01',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const reports = await fetchReports()

    expect(reports).toEqual([
      {
        id: 1, title: 'Relatório A', description: 'Descrição',
        imageUrl: 'http://localhost:8000/media/reports/img/a.jpg',
        fileUrl: 'http://localhost:8000/media/reports/pdf/a.pdf',
        publishedDate: '2024-03-01',
      },
    ])
  })

  it('fetchAdminReports includes credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAdminReports()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/reports')
    expect(options.credentials).toBe('include')
  })

  it('createReport posts FormData without forcing a Content-Type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const formData = new FormData()
    formData.set('title', 'Relatório A')

    await createReport(formData)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/reports')
    expect(options.method).toBe('POST')
    expect(options.credentials).toBe('include')
    expect(options.body).toBe(formData)
    expect(options.headers).toBeUndefined()
  })

  it('deleteReport sends a DELETE request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await deleteReport(1)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/admin/reports/1')
    expect(options.method).toBe('DELETE')
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npx vitest run api-client`
Expected: FAIL — `fetchReports`/`fetchAdminReports`/`createReport`/`deleteReport` não exportados

- [ ] **Step 3: Atualizar `domain/report.ts`**

`frontend/src/domain/report.ts`:

```typescript
export interface Report {
  id: number
  title: string
  description: string
  imageUrl: string
  fileUrl: string
  publishedDate: string
}
```

- [ ] **Step 4: Adicionar as funções ao `api-client.ts`**

Em `frontend/src/infrastructure/api-client.ts`, adicionar o import no topo:

```typescript
import type { Report } from '../domain/report'
```

E, no final do arquivo, adicionar:

```typescript
interface ReportResponse {
  id: number
  title: string
  description: string
  image_path: string
  file_path: string
  published_date: string
}

function _toReport(row: ReportResponse): Report {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: `${API_BASE_URL}${row.image_path}`,
    fileUrl: `${API_BASE_URL}${row.file_path}`,
    publishedDate: row.published_date,
  }
}

export async function fetchReports(): Promise<Report[]> {
  const rows = await fetchJson<ReportResponse[]>('/reports')
  return rows.map(_toReport)
}

export async function fetchAdminReports(): Promise<Report[]> {
  const rows = await authFetch<ReportResponse[]>('/admin/reports')
  return rows.map(_toReport)
}

async function authFetchForm<T>(path: string, method: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method, credentials: 'include', body: formData })
  if (!response.ok) {
    throw new Error(`Falha em ${path}: ${response.status}`)
  }
  return response.json()
}

export async function createReport(formData: FormData): Promise<void> {
  await authFetchForm('/admin/reports', 'POST', formData)
}

export async function updateReport(id: number, formData: FormData): Promise<void> {
  await authFetchForm(`/admin/reports/${id}`, 'PATCH', formData)
}

export async function deleteReport(id: number): Promise<void> {
  await authFetch(`/admin/reports/${id}`, { method: 'DELETE' })
}
```

- [ ] **Step 5: Rodar os testes, confirmar que passam**

Run: `cd frontend && npx vitest run api-client`
Expected: todos passam (testes novos + já existentes da Fase 5)

- [ ] **Step 6: Rodar typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add frontend/src/domain/report.ts \
        frontend/src/infrastructure/api-client.ts \
        frontend/src/infrastructure/api-client.test.ts
git commit -m "feat(admin): adiciona cliente HTTP de publicações (multipart)"
```

---

### Task 7: Frontend — `AdminPublicacoesPage` (CRUD com upload)

**Files:**
- Create: `frontend/src/ui/admin/AdminPublicacoesPage.tsx`
- Test: `frontend/src/ui/admin/AdminPublicacoesPage.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/ui/admin/AdminShell.tsx`

**Interfaces:**
- Consumes: `fetchAdminReports`, `createReport`, `updateReport`, `deleteReport` (Task 6),
  `Report` (Task 6).
- Produces: rota `/admin/publicacoes` navegável a partir do `AdminShell`.

- [ ] **Step 1: Escrever o teste do componente (RED)**

`frontend/src/ui/admin/AdminPublicacoesPage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { AdminPublicacoesPage } from './AdminPublicacoesPage'
import * as apiClient from '../../infrastructure/api-client'

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminPublicacoesPage />
    </QueryClientProvider>,
  )
}

describe('AdminPublicacoesPage', () => {
  it('lists existing reports', async () => {
    vi.spyOn(apiClient, 'fetchAdminReports').mockResolvedValue([
      {
        id: 1, title: 'Relatório A', description: 'Descrição A',
        imageUrl: 'http://x/a.jpg', fileUrl: 'http://x/a.pdf', publishedDate: '2024-03-01',
      },
    ])

    renderWithClient()

    expect(await screen.findByText('Relatório A')).toBeInTheDocument()
  })

  it('creates a report with the uploaded files', async () => {
    vi.spyOn(apiClient, 'fetchAdminReports').mockResolvedValue([])
    const createSpy = vi.spyOn(apiClient, 'createReport').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithClient()
    await user.click(await screen.findByText('Nova publicação'))
    await user.type(screen.getByLabelText('Título'), 'Relatório Novo')
    await user.type(screen.getByLabelText('Descrição'), 'Descrição nova')
    await user.type(screen.getByLabelText('Data de publicação'), '2024-05-01')
    await user.click(screen.getByText('Salvar'))

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1))
    const formData = createSpy.mock.calls[0][0]
    expect(formData.get('title')).toBe('Relatório Novo')
    expect(formData.get('published_date')).toBe('2024-05-01')
  })

  it('deletes a report after confirmation', async () => {
    vi.spyOn(apiClient, 'fetchAdminReports').mockResolvedValue([
      {
        id: 1, title: 'Relatório A', description: 'Descrição A',
        imageUrl: 'http://x/a.jpg', fileUrl: 'http://x/a.pdf', publishedDate: '2024-03-01',
      },
    ])
    const deleteSpy = vi.spyOn(apiClient, 'deleteReport').mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    renderWithClient()
    await user.click(await screen.findByText('Excluir'))

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(1))
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npx vitest run AdminPublicacoesPage`
Expected: FAIL — `Failed to resolve import "./AdminPublicacoesPage"`

- [ ] **Step 3: Criar o componente**

`frontend/src/ui/admin/AdminPublicacoesPage.tsx`:

```tsx
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createReport,
  deleteReport,
  fetchAdminReports,
  updateReport,
} from '../../infrastructure/api-client'
import type { Report } from '../../domain/report'

export function AdminPublicacoesPage() {
  const queryClient = useQueryClient()
  const reportsQuery = useQuery({ queryKey: ['admin-reports'], queryFn: fetchAdminReports })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Report | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [publishedDate, setPublishedDate] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitle('')
    setDescription('')
    setPublishedDate('')
    setEditing(null)
    setShowForm(false)
  }

  function buildFormData(): FormData {
    const formData = new FormData()
    formData.set('title', title)
    formData.set('description', description)
    formData.set('published_date', publishedDate)
    const image = imageInputRef.current?.files?.[0]
    const file = fileInputRef.current?.files?.[0]
    if (image) formData.set('image', image)
    if (file) formData.set('file', file)
    return formData
  }

  const createMutation = useMutation({
    mutationFn: () => createReport(buildFormData()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editing) return Promise.resolve()
      return updateReport(editing.id, buildFormData())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteReport(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  })

  function startEdit(report: Report) {
    setEditing(report)
    setTitle(report.title)
    setDescription(report.description)
    setPublishedDate(report.publishedDate)
    setShowForm(true)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  function handleDelete(id: number) {
    if (window.confirm('Excluir esta publicação?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Publicações</h1>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="rounded bg-blue-600 px-3 py-1.5 text-white"
        >
          Nova publicação
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-2 rounded border border-gray-200 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded border border-gray-300 p-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Descrição</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded border border-gray-300 p-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Data de publicação</span>
            <input
              type="date"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              className="rounded border border-gray-300 p-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Capa (imagem)</span>
            <input type="file" accept="image/*" ref={imageInputRef} />
            {editing && <span className="text-xs text-gray-500">Deixe em branco pra manter a capa atual</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Arquivo (PDF)</span>
            <input type="file" accept="application/pdf" ref={fileInputRef} />
            {editing && <span className="text-xs text-gray-500">Deixe em branco pra manter o PDF atual</span>}
          </label>
          <div className="mt-2 flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-white">
              Salvar
            </button>
            <button type="button" onClick={resetForm} className="rounded border border-gray-300 px-3 py-1.5">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {reportsQuery.isLoading && <p>Carregando...</p>}
      {reportsQuery.isError && <p>Não foi possível carregar as publicações.</p>}
      {reportsQuery.data && (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left">Título</th>
              <th className="border-b p-2 text-left">Data</th>
              <th className="border-b p-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {reportsQuery.data.map((report) => (
              <tr key={report.id}>
                <td className="border-b p-2">{report.title}</td>
                <td className="border-b p-2">{report.publishedDate}</td>
                <td className="border-b p-2">
                  <button onClick={() => startEdit(report)} className="mr-2 text-blue-600">
                    Editar
                  </button>
                  <button onClick={() => handleDelete(report.id)} className="text-red-600">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste do componente, confirmar que passa**

Run: `cd frontend && npx vitest run AdminPublicacoesPage`
Expected: 3 passed

- [ ] **Step 5: Adicionar a rota e o link de navegação**

Em `frontend/src/App.tsx`, adicionar o import:

```typescript
import { AdminPublicacoesPage } from './ui/admin/AdminPublicacoesPage'
```

E a rota, junto das outras rotas admin:

```tsx
          <Route
            path="/admin/publicacoes"
            element={
              <RequireAdminAuth>
                <AdminShell>
                  <AdminPublicacoesPage />
                </AdminShell>
              </RequireAdminAuth>
            }
          />
```

Em `frontend/src/ui/admin/AdminShell.tsx`, adicionar o link de nav (entre "Sensores" e "Ingestão"):

```tsx
          <Link to="/admin/publicacoes" className="rounded px-2 py-1 hover:bg-gray-100">
            Publicações
          </Link>
```

- [ ] **Step 6: Rodar toda a suíte do frontend e o typecheck**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: todos passam, sem erros de tipo

- [ ] **Step 7: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add frontend/src/ui/admin/AdminPublicacoesPage.tsx \
        frontend/src/ui/admin/AdminPublicacoesPage.test.tsx \
        frontend/src/App.tsx \
        frontend/src/ui/admin/AdminShell.tsx
git commit -m "feat(admin): adiciona tela de gestão de publicações (CRUD com upload)"
```

---

### Task 8: Frontend — `PublicacoesPage` consome o backend

**Files:**
- Modify: `frontend/src/ui/pages/PublicacoesPage.tsx`
- Modify: `frontend/src/ui/pages/PublicacoesPage.test.tsx`

**Interfaces:**
- Consumes: `fetchReports` (Task 6), `Report` (Task 6).
- Produces: `/publicacoes` renderiza a partir do backend, com o mesmo layout de cards e a mesma
  lógica de busca/filtro por ano já existentes (não mexidas nesta task).

- [ ] **Step 1: Reescrever o teste (RED — mocka `fetchReports` em vez do JSON estático)**

`frontend/src/ui/pages/PublicacoesPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { PublicacoesPage } from './PublicacoesPage'
import * as apiClient from '../../infrastructure/api-client'

const REPORTS = [
  {
    id: 1, title: 'Relatório A', description: 'Descrição do relatório A sobre queimadas',
    imageUrl: '/reports/img/a.jpg', fileUrl: '/reports/pdf/a.pdf', publishedDate: '2024-03-01',
  },
  {
    id: 2, title: 'Relatório B', description: 'Descrição do relatório B sobre monitoramento',
    imageUrl: '/reports/img/b.jpg', fileUrl: '/reports/pdf/b.pdf', publishedDate: '2023-06-15',
  },
]

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <PublicacoesPage />
    </QueryClientProvider>,
  )
}

describe('PublicacoesPage', () => {
  it('renders all reports sorted by date descending by default', async () => {
    vi.spyOn(apiClient, 'fetchReports').mockResolvedValue(REPORTS)

    renderWithClient()

    const titles = await screen.findAllByRole('heading', { level: 2 })
    expect(titles.map((el) => el.textContent)).toEqual(['Relatório A', 'Relatório B'])
    expect(screen.getByText('2 publicações disponíveis')).toBeInTheDocument()
  })

  it('filters by search text across title and description', async () => {
    vi.spyOn(apiClient, 'fetchReports').mockResolvedValue(REPORTS)
    const { default: userEvent } = await import('@testing-library/user-event')
    renderWithClient()
    await screen.findByText('Relatório A')

    await userEvent.type(screen.getByPlaceholderText('Buscar por título ou descrição'), 'queimadas')

    expect(screen.getByText('Relatório A')).toBeInTheDocument()
    expect(screen.queryByText('Relatório B')).not.toBeInTheDocument()
    expect(screen.getByText('1 de 2 publicações encontradas')).toBeInTheDocument()
  })

  it('filters by year', async () => {
    vi.spyOn(apiClient, 'fetchReports').mockResolvedValue(REPORTS)
    const { default: userEvent } = await import('@testing-library/user-event')
    renderWithClient()
    await screen.findByText('Relatório A')

    await userEvent.selectOptions(screen.getByRole('combobox'), '2023')

    expect(screen.getByText('Relatório B')).toBeInTheDocument()
    expect(screen.queryByText('Relatório A')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar, confirmar que falha**

Run: `cd frontend && npx vitest run PublicacoesPage`
Expected: FAIL — página ainda lê de `reports.json`, `fetchReports` nunca é chamado, datas não batem
(formato antigo `dd/mm/yyyy` no `parseDate`)

- [ ] **Step 3: Atualizar `PublicacoesPage.tsx`**

`frontend/src/ui/pages/PublicacoesPage.tsx` — trocar o topo do arquivo:

```tsx
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchReports } from '../../infrastructure/api-client'

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}
```

(Remove o import de `reportsData` e `Report`, e a linha `const reports = reportsData as Report[]` —
`reports` agora vem do `useQuery`.)

Dentro do componente, trocar:

```tsx
export function PublicacoesPage() {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<string>('todos')
```

por:

```tsx
export function PublicacoesPage() {
  const [search, setSearch] = useState('')
  const [year, setYear] = useState<string>('todos')
  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: fetchReports })
  const reports = reportsQuery.data ?? []
```

E, logo abaixo do JSX de abertura (`<main ...>` + `<h1>`), adicionar os estados de loading/erro,
no mesmo padrão de `SensoresPage.tsx`:

```tsx
      {reportsQuery.isLoading && <p>Carregando...</p>}
      {reportsQuery.isError && <p>Não foi possível carregar as publicações.</p>}
```

(logo antes do `<div className="mb-4 flex flex-wrap gap-3 ...">` da busca — mantém a busca sempre
visível, só o grid de cards fica condicionado a `!isLoading && !isError`, igual `SensoresPage.tsx`).
O grid de cards existente passa a ser envolvido por
`{!reportsQuery.isLoading && !reportsQuery.isError && (<div className="grid ...">...</div>)}`.

- [ ] **Step 4: Rodar os testes, confirmar que passam**

Run: `cd frontend && npx vitest run PublicacoesPage`
Expected: 3 passed

- [ ] **Step 5: Rodar toda a suíte do frontend e o typecheck**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: todos passam, sem erros de tipo

- [ ] **Step 6: Verificar visualmente**

Run: `cd frontend && npm run dev` (em background, se ainda não estiver rodando) e:

```bash
google-chrome --headless=new --disable-gpu --no-sandbox --window-size=1440,1400 \
  --screenshot=/tmp/publicacoes-backend-check.png --virtual-time-budget=3000 \
  "http://localhost:5173/publicacoes"
```

Expected: cards carregando normalmente a partir do backend (mesmo layout já existente), sem
diferença visual em relação ao `reports.json` estático — confirma que a migração de fonte de dado
não regrediu o design.

- [ ] **Step 7: Commit**

```bash
cd /home/willianflores/localhost/airquality-js-app
git add frontend/src/ui/pages/PublicacoesPage.tsx \
        frontend/src/ui/pages/PublicacoesPage.test.tsx
git commit -m "feat(admin): PublicacoesPage passa a consumir GET /reports do backend"
```

---

### Task 9: Revisão final da branch inteira

**Files:** nenhum arquivo novo — task de verificação.

- [ ] **Step 1: Rodar a suíte completa do backend**

Run: `cd backend && DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality TEST_DATABASE_URL=postgresql://airquality_user:devpassword@localhost:5435/airquality_test pytest tests/ -q`
Expected: todos passam

- [ ] **Step 2: Rodar a suíte completa do frontend + typecheck**

Run: `cd frontend && npx vitest run && npx tsc --noEmit`
Expected: todos passam, sem erros de tipo

- [ ] **Step 3: Subir via Docker Compose e verificar o fluxo completo end-to-end**

Run: `cd infra && docker compose build backend && docker compose up -d`
Expected: `backend` sobe saudável, `docker compose exec backend python -m alembic upgrade head`
aplica a `0008` sem erro.

Login no admin (`/admin/login`), criar uma publicação de teste em `/admin/publicacoes` com capa +
PDF reais, confirmar que ela aparece em `/publicacoes` com a capa carregando (servida via
`/media/reports/img/...`), editar sem reenviar arquivo (mantém a capa), excluir, confirmar que some
da lista pública.

- [ ] **Step 4: Revisar o diff inteiro da branch**

Run: `git log --oneline main..HEAD` e `git diff main...HEAD --stat`
Expected: só os commits desta feature, nenhum arquivo fora do escopo (backend/frontend de
publicações + `docker-compose.yml`).
