# Diretrizes de Design — Personal Leveling

Estas diretrizes definem o estilo visual, a linguagem de interação e os padrões de UI/UX para o projeto. Objetivo: criar uma experiência moderna, imersiva e motivadora, com forte inspiração estética em RPGs e no tema "Solo Leveling" (high-tech, neon, dark, HUD futurista).

## Princípios de Design

- Imersão utilitária: visual de jogo moderno, mas sempre a serviço da clareza e produtividade.
- Hierarquia clara: contraste e escala tipográfica para priorizar informações.
- Feedback constante: cada ação deve responder visualmente (hover, press, loading, success/fail).
- Consistência modular: tokens de design, componentes reutilizáveis e layouts previsíveis.
- Acessibilidade: contraste AA, foco visível, sem dependência exclusiva de cor.

## Identidade Visual

- Tema escuro predominante com acentos neon (ciano/azul/emerald) e detalhes roxos.
- Estética "painel/HUD": bordas suaves, glassmorphism leve, linhas de energia/scan discretas.
- Motion sutil: microinterações rápidas, easing natural, sem exageros.

## Design Tokens (base)

- Cores (exemplo inicial, refinar conforme necessidade):
  - Base: `--bg:#0f172a`, `--bg-elev:#111827`, `--text:#e5e7eb`, `--muted:#94a3b8`
  - Primárias: `--primary:#22c55e` (emerald), `--accent:#06b6d4` (cyan), `--purple:#8b5cf6`
  - Estado: `--success:#22c55e`, `--warning:#f59e0b`, `--danger:#ef4444`, `--info:#38bdf8`
- Tipografia:
  - Família: UI sans moderna (system-ui/Inter/Roboto). Títulos podem usar uma display mais "tech" se disponível (opcional).
  - Escala sugerida: 12, 14, 16 (base), 18, 20, 24, 30, 36, 48.
  - Peso: 400 (texto), 600 (títulos e botões).
- Espaçamento: escala de 4px (4, 8, 12, 16, 20, 24, 32, 48).
- Raios: `--radius:10px` (painéis e cartões), `--radius-sm:8px`, `--radius-lg:14px`.
- Sombras/vidro:
  - Sombra: camadas suaves com opacidade baixa.
  - Vidro: fundo semitransparente + `backdrop-filter:blur(6–12px)`.
- Borda: 1px a 2px com cor `rgba(148,163,184,0.2–0.35)`.
- Motion:
  - Duração: 120–220ms para hovers/press; 300–500ms para transições de painel.
  - Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.
  - Redução: respeitar `prefers-reduced-motion`.

## Padrões de Layout

- Grid responsivo: container `max-width: 1200–1440px`, gutters 16–24px.
- Estrutura:
  - Header compacto com título e ações globais.
  - Conteúdo em painéis/cards (até 3 colunas em desktop; 1 em mobile).
  - Sidebar opcional para navegação de features (colapsável).
- Seções-chave (wireframe de alto nível):
  - Dashboard: visão rápida de XP, nível, barras de progresso, próximas missões, streaks.
  - Missões: lista e filtros (diárias/semanais/repeatables), detalhes em drawer/modal.
  - Registro/Log: timeline de atividades; botão de adicionar rápido; presets.
  - Conquistas: grade de badges; filtros; progresso de desbloqueio.
  - Combate (PvE): painel com inimigo atual, escala de dificuldade, recompensas, histórico.
  - Perfil/Stats: atributos, árvore de talentos (futuro), preferências/tema.
  - Comparação/Rank (futuro): leaderboards, comparação anônima/consentida.

## Componentes (guidelines)

- Botões
  - Tamanhos: sm, md (padrão), lg. Padding horizontal 12–16px.
  - Estados: default, hover (eleva/brighten), active (press), disabled (reduz contraste), loading (spinner sutil).
  - Variantes: primary (neon), secondary (vidro/borda), ghost (texto com destaque on-hover), danger.
- Cards/Painéis
  - Fundo gradiente sutil + vidro leve; borda 1px; sombra discreta.
  - Header opcional (título + ações); conteúdo organizado por blocos.
- Tabs/Segmented
  - Linha de energia (accent) sob a aba ativa; foco visível.
- Barras de Progresso
  - Fundo escuro; preenchimento com gradiente neon animado (sutil); label com % e meta.
- Badges/Chips
  - Pequenos, cores de estado, ícones minimalistas.
- Toaster/Feedback
  - Canto superior direito; 3–4s; variantes success/warn/danger/info.
- Modais/Drawers
  - Fundo escurecido 60–70%; painel vidro; foco e escape garantidos; tamanhos sm/md/lg.
- Tooltips
  - Atraso curto; não bloquear interação; acessíveis (teclado/leitor de tela).
- Listas/Tabelas
  - Alternância de linhas sutil; destacar item selecionado; ações inline claras.
- Formulários
  - Inputs com borda vidro; foco colorido; mensagens de erro claras; validações inline.

### Biblioteca de Componentes (CSS modular)

Para garantir consistência e reuso, os estilos de UI foram modularizados em `assets/styles/components/` e importados em `assets/styles/main.css`:

- `buttons.css`: `.btn`, `.btn-primary`, `.btn-ghost`, tamanhos (`.btn-sm`, `.btn-lg`) e botões de ícone (`.btn-icon`, `.icon-btn`). Inclui sizing base para `.material-symbols-outlined`.
- `sidebar.css`: `.sidebar` (overlay), `.nav-list` e `.sidebar-backdrop` com transições e estados.
- `layout.css`: utilitários de layout como `.grid`, `.grid-3`, `.container` e espaçamentos `.mt-*`.

Uso recomendado:

- Prefira classes de componente (`.btn`, `.card`, `.sidebar`) a estilos ad-hoc.
- Se um estilo for reaproveitável em 2+ telas, mova-o para um arquivo em `components/` e atualize `main.css` com o `@import` correspondente.
- Documente novos componentes aqui (intenção, API de classes, estados) e, quando aplicável, inclua exemplos de marcação no documento da feature.

## Estilo Visual Específico (inspiração "Solo Leveling")

- Paleta neon fria: ciano/azul/emerald como energia; roxo para destaque secundário.
- Efeitos discretos de scan/energia em headers e separadores.
- Animações contextuais: aumentar levemente o brilho ao ganhar XP; tremor/impulso ao subir de nível.
- Ilustrações/ícones: geometria afiada/minimalista; evitar cartoon excessivo.

## Estados, Variações e Temas

- Tema padrão escuro. Futuro: tema claro (alto contraste), e variações cromáticas (emerald/cyan/purple).
- Estados de carregamento: skeletons onde aplicável, spinners minimalistas.
- Erros: destaque claro (vermelho), com explicação breve e ação de correção.

## Acessibilidade

- Contraste mínimo AA (texto normal ≥ 4.5:1; grandes ≥ 3:1).
- Foco visível com anel/halo acentuado (ex.: ciano/emerald + glow).
- Navegação por teclado completa; ordem lógica de tabulação; `aria-*` quando preciso.
- Feedback não apenas por cor; incluir ícone/texto.

## Conteúdo e Tom

- Linguagem encorajadora, objetiva e sem jargão excessivo.
- Microcópias orientadas à ação: "Iniciar missão", "Registrar atividade", "Reivindicar recompensa".
- Evitar culpabilização; promover consistência e melhoria incremental.

## Preferências e i18n

- Idiomas suportados: `pt-BR` (padrão) e `en`.
- Persistência: `state.prefs.language` salvo em LocalStorage por `App.db` (ver `assets/scripts/main.js`).
- Toggle: botão de idioma no header (`assets/components/header.html`, `#languageToggle`).
- Aplicação: textos gerados via dicionário i18n central (ex.: streak, missões, botões) e re-render no `init()`.
- Acessibilidade: manter rótulos descritivos e não depender apenas de flags/ícones para idioma.

## Conquistas (MVP)

- Objetivo: reforçar hábito com marcos simples e claros.
- Desbloqueios atuais:
  - Contagem de atividades: 10, 50.
  - Streak: 3+, 7+ dias.
- Render: lista dinâmica em `#achievementsList` (ver `ui.renderAchievements()` em `assets/scripts/main.js`).
- Cópias: usar i18n para fallback "sem conquistas".
- Evolução futura: badges visuais, progressão parcial, categorias.

## Atributos (MVP)

- Mapeamento de categorias → atributos principais: `FOR`, `INT`, `VIT`, `AGI`, `WIS`.
- Regras atuais:
  - `estudo→INT`, `leitura→WIS`, `saude→VIT`, `exercicio/treino→AGI`, `trabalho/projeto→FOR`.
- Cálculo: soma de durações ponderadas por categoria; normalização visual por barras.
- Render: contêiner `#attributesBox` (ver `ui.renderAttributes()` em `assets/scripts/main.js`).
- Futuro: pesos ajustáveis por usuário, árvore de talentos e sinergias.

## PWA (básico)

- Manifesto: `manifest.json` na raiz do projeto.
  - `name`, `short_name`, `start_url`, `display:standalone`, `theme_color`, `background_color`, `icons`.
- Service Worker: `sw.js` na raiz.
  - Estratégias: network-first para navegação (HTML) e cache-first para estáticos.
  - Pré-cache: `index.html`, CSS/JS principais e favicon.
- Registro: em `assets/scripts/main.js` durante `init()` (`navigator.serviceWorker.register('/sw.js')`).
- Head do HTML (`index.html`):
  - `<meta name="theme-color" content="#111827">`
  - `<link rel="manifest" href="/manifest.json">`
  - `<link rel="apple-touch-icon" sizes="180x180" href="assets/images/icons/icon-180.png">`
- Notas de design: garantir ícones 192/512 para instalabilidade e contraste de splash.

## Ícones de Interface (UI)

- Biblioteca: Material Symbols (Outlined) via Google Fonts.
- Inclusão: em `index.html` há o `<link>` para a folha de estilo do Google Fonts.
- Uso: inserir `<span class="material-symbols-outlined">menu</span>` dentro de botões/links.
- Acessibilidade: manter `aria-label`/`title` descritivos; não depender apenas do ícone.
- Alternativas: Font Awesome ou SF Symbols (versões web) podem substituir Material; preferir uma única biblioteca para consistência.

## Testes rápidos (QA de UX)

- Idioma: alternar PT/EN e verificar atualização de streak, missões e botões.
- Conquistas: registrar atividades para atingir marcos e checar lista.
- Atributos: variar categorias e durações; observar proporcionalidade das barras.
- PWA: instalar no Chrome/Edge; desativar rede e recarregar (app deve abrir do cache).

## Ilustrações e Efeitos (opcionais)

- Gradientes radiais suaves no background (já iniciados no CSS), partículas leves.
- Efeitos HUD: linhas/grades discretas; não poluir a leitura.
- Áudio/vibração (opcional): efeitos sutis ao subir de nível/conquista (sempre mutáveis).

## Exemplos de Layout por Feature (rascunhos)

- Dashboard
  - Header: Level, XP atual/necessário, botão "Registrar".
  - Grid: Progresso semanal, missões ativas, conquistas recentes, streak.
- Missões
  - Lista com filtros e tags; card com recompensa (XP/atributos) e checklist.
  - Detalhe em drawer com botão de concluir/falhar; cooldown para repeatables.
- Registro/Log
  - Timeline com cartões; botão flutuante para adicionar; presets por categoria.
- Combate PvE
  - Painel do inimigo: nome, nível, barra de dificuldade.
  - Ações: "Atacar" (consome/relaciona atividades concluídas), previsões e recompensas.

## Roadmap de Design

1. Consolidar tokens e paleta (definitivos) e revisar `assets/styles/main.css`.
2. Definir biblioteca de componentes (HTML/CSS) neste projeto, sem dependências externas.
3. Criar exemplos de telas (estáticos) conforme wireframes acima.
4. Ajustar microinterações e acessibilidade com teste em 2+ navegadores.

---

Referência de implementação: manter os tokens em CSS (variáveis) e documentar qualquer exceção visual nesta página. Cada nova feature deve anexar seu layout/fluxo ao documento de feature correspondente em `docs/features/`.
