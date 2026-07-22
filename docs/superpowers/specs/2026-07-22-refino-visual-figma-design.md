# Refino visual via Figma — design

## Contexto

O plano original da migração (`2026-07-17-migracao-react-python-hexagonal-design.md`) previa
portar as telas pro Figma e refinar visualmente ali antes de finalizar o frontend. A spec da
Fase 4 empurrou esse refino pra uma "sub-fase futura" que nunca foi agendada — o frontend atual
(Fases 4-5) usa Tailwind funcional espelhando o app antigo (Next.js) por paridade visual, sem
passar por Figma.

Com a Fase 6 (Hardening & Deploy) pausada até resolver uma pendência com a UFAC, o usuário decidiu
retomar esse refino agora: não é mais sobre igualar o app antigo, é sobre evoluir pra uma nova
direção visual, decidida no Figma antes de voltar pro código.

## Decisões

- **Escopo: as 5 páginas públicas** (Home, Gráficos Gerais, Gráficos Municipais, Sensores,
  Relatórios/Publicações). Área admin (Fase 5) fica de fora por agora.
- **Referência lado a lado no Figma**: trazer tanto o estado do app **antigo** (Next.js,
  `airquality-app`) quanto do app **atual** (React, `airquality-js-app`) pras mesmas 5 páginas,
  pra comparar visualmente antes de desenhar a versão nova.
- **App antigo → screenshot/imagem estática.** Stack diferente (Next.js vs React), sem Code
  Connect configurado — reconstrução fiel como frames editáveis não compensa o esforço. Trazido
  como imagem de referência, não editável.
- **App atual → code-to-design real** (via skill `figma-generate-design`), gerando frames Figma
  de verdade (auto-layout, editável), já que é o nosso próprio código React — serve de base
  editável pra desenhar a versão nova em cima.
- **Conta Figma confirmada**: `willian.flores@ufac.br` (plano student, time "A equipe de Antonio
  Willian Flores de Melo").
- **Fluxo**: captura → montagem no Figma (10 telas: 5 antigo + 5 atual, lado a lado) → usuário
  desenha a direção nova no Figma → aprovação → nova fase de implementação (fora deste documento)
  traz o design aprovado de volta pro código via VS Code + Claude Code.

## Fora de escopo

- Implementação do design final em código — fica pra uma fase separada, depois da aprovação no
  Figma.
- Área admin (Fase 5).
- Fase 6 (Hardening & Deploy) — segue pausada, sem relação com este refino.
