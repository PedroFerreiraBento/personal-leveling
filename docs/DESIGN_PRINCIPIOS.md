# RPG Modern UI – Design System (Solo-Leveling vibe)

**Objetivo:** este documento especifica diretrizes e padrões para que um agente de IA crie toda a UI da aplicação gamificada com estética **RPG moderno + HUD futurista**, clara para leitura de históricos e sem referências a medieval/pixel art/realismo texturizado.

---

## 0) Princípios de experiência

* **Clareza acima de tudo:** contraste alto, hierarquia tipográfica nítida, copy direta.
* **Futurismo místico:** superfícies translúcidas (glass), contornos finos, brilhos sutis neon.
* **Leveza visual:** poucos ornamentos, espaçamento generoso, animações curtas e fluidas.
* **Consistência token-first:** toda cor, raio, sombra e espaçamento vem de *design tokens*.
* **Leitura de histórico:** timeline cronológica, filtros, busca, agrupamento por datas e “event types”.

---

## 1) Design tokens (cores, tipografia, espaçamentos, raios, sombras)

### 1.1 Cores (modo escuro padrão)

**Paleta base**

* `--bg-0` #070B12  (fundo de app)
* `--bg-1` #0C1320  (superfície base)
* `--bg-2` #111A2C  (superfície elevada)
* `--line` rgba(255,255,255,.08) (bordas sutis)
* `--text-0` #E9F0FF (título)
* `--text-1` #C2CCE5 (corpo)
* `--text-2` #8B95B2 (secundário/placeholder)
* `--muted`  #5A678A

**Ações/realces (neon clean)**

* `--pri`   #009DFF (primário Solo-Leveling-like)
* `--pri-2` #6D5AE6 (complementar roxo)
* `--ok`    #00E3A2
* `--warn`  #FF8C42
* `--err`   #FF4D5E
* `--info`  #00D1FF

**Gradientes**

* `--grad-pri`: linear 135deg, #009DFF → #6D5AE6
* `--grad-ok`:  linear 135deg, #00E3A2 → #00FFFF
* `--grad-xp`:  linear 90deg,  #8A2BE2 → #00D1FF

**Raridade (para itens/ranks/achievements)**

* `common`  #AAB2BF
* `uncommon`#00E3A2
* `rare`    #009DFF
* `epic`    #6D5AE6
* `legend`  #FFB02E
* `mythic`  #FF4D5E

### 1.2 Tipografia

* **Primária:** Inter (fallback: system-ui, Segoe UI, Roboto)
* **Numérica/mono (status/logs):** JetBrains Mono (fallback: Roboto Mono)
* **Escala (rem):**

  * `h1` 2.25 / 1.2; `h2` 1.75 / 1.25; `h3` 1.5 / 1.3
  * `body` 1.0 / 1.6; `small` .875 / 1.5; `micro` .75 / 1.4
* **Estilo:** títulos em **semibold/bold**, números com *tabular-nums*.

### 1.3 Espaçamento (4-pt)

`2, 4, 8, 12, 16, 24, 32, 48, 64` px (tokens: `--space-1..9`)

### 1.4 Raios

* `--radius-1` 8px (inputs/labels)
* `--radius-2` 12px (cards)
* `--radius-3` 20px (painéis, modais)
* **Sem cantos agudos**.

### 1.5 Elevação, vidro e brilho

* **Glass surface:** `background: rgba(17,26,44,.55); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.06);`
* **Shadow base:** `0 10px 30px rgba(0,0,0,.35)`
* **Glow neon (controlado):** `0 0 18px color(—pri/—pri-2) @ .35`
* **Focus ring (acessível):** `0 0 0 3px rgba(0,157,255,.35)`

### 1.6 Z-index (camadas)

`toast 9000, modal 8000, dropdown 7000, header 2000, overlay 1500, base 0`.

---

## 2) Layout & navegação

### 2.1 Grid responsivo

* **Breakpoints:** sm 640, md 768, lg 1024, xl 1280, 2xl 1536.
* **Container:** largura máxima 1280–1440px; padding lateral `--space-6`.
* **Colunas:** 12 colunas, gutter `--space-5`.

### 2.2 App Shell

* **Header (64px):** logo minimal + título de seção + ações rápidas (search, command, notificação, perfil). Fundo `--bg-1` com blur sutil.
* **Sidebar (72–280px):** colapsável; ícones stroke 1.5px; item ativo com borda esquerda neon 2px + leve glow.
* **Content area:** cards modulares, blocos 1–3 colunas.
* **Footer opcional:** infos de versão / atalho teclado.

### 2.3 Navegação

* **Tabs:** underline luminosa (2px); ativo com gradiente `--grad-pri`.
* **Breadcrumb:** discreto; último segmento destacado.
* **Command Palette (⌘K/Ctrl K):** overlay glass, busca com sugestões, ações rápidas.
* **Search global:** barra destacada; resultados por grupo (Quests, Logs, Itens, Usuários).

---

## 3) Componentes base (padrões de estados)

> **Estados padronizados para todo componente:** `default, hover (+2% iluminação), focus (ring), active (compress 98% + darken 4%), disabled (opacidade .5, sem glow), loading (spinner fino).`
> **Atenção a acessibilidade:** contraste mínimo 4.5:1 para texto normal.

### 3.1 Botões

**Tamanhos:** sm(28/12px), md(36/14px), lg(44/16px).
**Variantes:**

* **Primary:** gradiente `--grad-pri`, texto `--bg-0`, ícone 1.5px.
* **Secondary:** superfície `--bg-2` com borda `--line`.
* **Ghost:** transparente + hover com filme `rgba(255,255,255,.04)`.
* **Success/Warning/Error:** usam `--ok/--warn/--err` (sólidos ou outline).
* **Icon button:** 36x36, raio 10, ripple leve.

### 3.2 Inputs & Formulários

* **Text/Email/Password:** superfície `--bg-2`, borda `--line`, placeholder `--text-2`.

  * Focus: borda `--pri` + ring.
  * Error: borda `--err`, helper `--err`.
* **Select/Combobox:** lista glass, highlight `--bg-2` + borda `--pri`.
* **Checkbox/Radio:** traço 1.5px; marca neon.
* **Switch:** thumb flutuante (sombra interna), on = `--pri`.
* **TextArea:** 4–8 linhas padrão, contador opcional.
* **Field group + label + hint + error** sempre previstos.

### 3.3 Tooltips, Popovers, Dropdowns

* **Tooltip:** micro, atraso 250ms, fundo `rgba(10,15,28,.9)`, seta 8px.
* **Dropdown/Popover:** menu glass, shadow alto, separadores com `--line`.

### 3.4 Cards & Painéis

* **Card padrão:** raio `--radius-2`, glass surface, título `h3`, actions canto superior direito.
* **Painel seção:** cabeçalho com ícone linha + subtítulo.

### 3.5 Tabelas & Listas

* **Tabela:** linhas com `--bg-1` alternadas sutilmente; hover eleva; seleção com borda neon suave.
* **Header fixo, células com 12/16px padding**, sort ícone linear.
* **Listas densas:** avatar + título + metadados mono (datas/IDs).

### 3.6 Empty, Loading & Errors

* **Empty state:** ilustração geométrica minimal + CTA primária.
* **Skeleton:** blocos com *shimmer* linear (2.2s).
* **Inline error:** card fino `--err` de borda e ícone.

### 3.7 Notificações & Toasts

* **Toast:** canto superior direito; 3.5–5s; variantes `info/ok/warn/err`.
* **Achievement/Level-Up toast (especial):** veja 5.3.

---

## 4) Componentes de RPG moderno (gamificação)

### 4.1 Barra de Status (HP/MP/XP/Stamina)

* **Base:** container 8–12px altura, raio 9999px, fundo `rgba(255,255,255,.05)`.
* **HP:** preenchimento `#FF4D5E`; **MP:** `#00D1FF`; **XP:** `--grad-xp`; **Stamina:** `#00E3A2`.
* **Glow discreto** na borda; **tick marks** a cada 10%.
* **Label embutida** (mono) com valor atual/total; animação 220ms `easeOutQuad`.

### 4.2 Stat Blocks (Atributos)

* **Cards quadrados** 120–160px: ícone linear + título (STR/AGI/INT/DEX/VIT) + valor grande mono.
* **Rótulos auxiliares** (buff/debuff) como *pills* com cor de status.
* **Up/down flash** rápido ao alterar.

### 4.3 Rank Badge

* **Formato:** hexágono suave ou escudo minimal; contorno 1.5px, **inner glow** da cor de raridade.
* **Texto** centrado (ex.: *S, A, B, C, D*); **gradiente** sutil do tier.

### 4.4 Inventory Grid (se aplicável)

* **Grid 6–8 colunas**, slots 72–88px, borda `--line`, hover realça.
* **Raridade** colore a borda externa e o *chip* da etiqueta.
* **Tooltip rico** com nome, raridade, atributos, flavor curto.

### 4.5 Quest Log

* **Seções:** *Active*, *Completed*, *Archived*.
* **Item de quest:** ícone, título, progresso (barra xp fina), deadline, *chips* (Main/Daily/Side).
* **Detalhe expandido:** descrição, subtarefas checklist, recompensas, histórico de alterações.

### 4.6 Skill Tree (se aplicável)

* **Nós circulares** 40–56px; locked = opacidade .4 + padlock fino; unlocked = borda `--pri`; selected = glow.
* **Conectores** com linhas neon suaves; *hover* sugere caminhos possíveis.

### 4.7 Floating Feedback (HUD)

* **Damage/XP/Points floats:** texto mono micro com **trail** e fade 500–900ms; cores por tipo (+XP = `--pri`; -HP = `--err`).
* **Achievement pop-up:** card glass 360–420px, ícone grande, título, descrição curta, **borda gradiente**.

---

## 5) Histórico, timeline e leitura de registros

### 5.1 Timeline “Chronicle”

* **Agrupamento por dia** (Today, Yesterday, DD Mon YYYY).
* **Item:** ícone (tipo de evento), título (forte), *meta* mono (HH\:MM, actor, IDs), descrição curta, *tags*.
* **Conectores** verticais neon sutil; hover destaca bloco.
* **Filtros:** por tipo (quest, item, level, transação), por usuário, por período.
* **Busca full-text** + **paginador** ou scroll infinito.

### 5.2 Activity Feed compacto

* **Lista densa** com 56–64px de altura por linha; ícone, título, *meta*.
* **Badges de status**: success/warn/err/processing.

### 5.3 Eventos especiais

* **Level Up:** overlay radial leve: escala 1.03 → 1 (180ms), *glow* `--grad-xp`, som opcional curto (≤400ms).
* **New Achievement:** toast como 4.7, persiste até 8s, botão “Ver detalhes”.

---

## 6) Páginas/fluxos essenciais

### 6.1 Autenticação

* **Card glass** central (max 480px), título forte, tabs Entrar/Cadastrar, inputs md, botão `Primary lg`.
* **Mensagem de segurança** em `--text-2`.
* **Social (opcional):** ghost buttons com ícones lineares.

### 6.2 Dashboard

* **Hero** com Level/Rank, barras HP/XP, *quick actions*.
* **Cards métricas** (KPIs, streak, quests ativas) com mini-sparklines.
* **Feed/Timeline** à direita em coluna 1/3.

### 6.3 Detalhes de jogador/usuário

* **Header** com avatar, nome, nível, chips de classe/facção.
* **Aba Status, Quests, Inventário, Histórico**.

### 6.4 Configurações

* **Seções**: Perfil, Notificações, Aparência (toggle tema), Teclas de atalho, Dados.
* **Controles** padrão; salvar com toast `ok`.

---

## 7) Ícones e ilustração

* **Estilo:** traçado linear 1.5px, cantos levemente arredondados, sem preenchimentos pesados.
* **Tamanhos:** 16, 20, 24, 32.
* **Biblioteca sugerida:** Lucide/Remix (apenas strokes).
* **Ilustrações:** abstratas geométricas, linhas neon; **evitar** realismo/texturas orgânicas.

---

## 8) Movimento (animações)

* **Durações:** micro 120–160ms; UI 180–240ms; overlays 240–320ms.
* **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (easeOutExpo-like) para entradas; `cubic-bezier(0.4, 0, 0.2, 1)` para transições gerais.
* **Parallax leve** em heros (translateY 2–6px no mouse/scroll).
* **Reduzir movimento** se `prefers-reduced-motion`.

---

## 9) Acessibilidade & usabilidade

* **Contraste:** texto ≥ 4.5:1; botões/foco claramente visíveis.
* **Tamanho de alvo:** mínimo 40x40px.
* **Navegação por teclado** completa; **foco visível** (ring).
* **ARIA/semântica** em componentes de navegação, tabs, modais e listas virtuais.
* **Textos internacionais curtos**, evitar jargões.

---

## 10) Conteúdo & microcopy

* **Tom:** direto, confiante, motivador (breve).
* **Exemplos:**

  * Botão primário: “Entrar”, “Iniciar missão”, “Subir de nível”.
  * Toast ok: “Progresso salvo.”
  * Empty: “Nada por aqui — que tal começar uma missão?”

---

## 11) Padrões de componentes (blueprints para o agente)

> **Formato:** cada componente possui *props*, *variantes*, *estados*, *tokens* e *regras*.

### 11.1 `Button`

* **Props:** `variant: primary|secondary|ghost|success|warning|error`, `size: sm|md|lg`, `iconLeft`, `iconRight`, `loading`, `disabled`.
* **Regras:** aplicar gradiente em `primary`; estados conforme §3; ícones 20px a 8px do texto.

### 11.2 `InputField`

* **Props:** `label`, `type`, `placeholder`, `value`, `hint`, `error`, `icon`, `required`.
* **Regras:** label acima 12px; hint/erro abaixo; `error` substitui `hint`.

### 11.3 `Select/Combobox`

* **Props:** `options`, `searchable`, `multi`, `chips`, `onCreate`.
* **Regras:** menu com altura máx. 320px, scroll suave, teclas ↑↓ Enter.

### 11.4 `Card`

* **Props:** `title`, `subtitle`, `actions[]`, `variant: default|glass|solid`, `elevated`.
* **Regras:** usar surface glass por padrão; `elevated` aumenta sombra/glow.

### 11.5 `Modal`

* **Props:** `title`, `size: sm(420)|md(640)|lg(880)`, `footer`, `dismissable`.
* **Regras:** overlay `rgba(0,0,0,.5)`; animação scale 0.98→1.

### 11.6 `Toast`

* **Props:** `type: info|ok|warn|err|achievement`, `title`, `desc`, `actions[]`, `duration`.
* **Regras:** posição top-right; `achievement` usa gradiente e ícone grande.

### 11.7 `ProgressBar`

* **Props:** `value`, `max`, `variant: hp|mp|xp|stamina|neutral`, `label`.
* **Regras:** variantes mapeiam cores §4.1; animação fill 220ms.

### 11.8 `Timeline`

* **Props:** `groupsBy: day|week|month`, `filters[]`, `items[]({type,icon,title,meta,desc,tags})`, `onLoadMore`.
* **Regras:** cabeçalhos de dia; conectores; tags como pills.

### 11.9 `Badge`

* **Props:** `tone: neutral|ok|warn|err|info|tier(common..mythic)`, `icon`, `soft|solid`.
* **Regras:** `tier` usa paleta de raridade.

### 11.10 `QuestItem`

* **Props:** `title`, `type: main|daily|side`, `progress(0..100)`, `deadline`, `rewards[]`, `status: active|paused|done`.
* **Regras:** status define cor do chip/borda; expand mostra subtarefas.

### 11.11 `RankBadge`

* **Props:** `tier: D|C|B|A|S|SS`, `label`, `compact`.
* **Regras:** forma escudo/hex; tier colore contorno + glow.

### 11.12 `InventoryGrid`

* **Props:** `cols`, `items[]({icon,name,rarity,qty})`, `onContextMenu`.
* **Regras:** item hover mostra tooltip rico.

---

## 12) Implementação (referência rápida para o agente)

### 12.1 Tokens CSS (exemplo)

```css
:root{
  --bg-0:#070B12; --bg-1:#0C1320; --bg-2:#111A2C; --line:rgba(255,255,255,.08);
  --text-0:#E9F0FF; --text-1:#C2CCE5; --text-2:#8B95B2;
  --pri:#009DFF; --pri-2:#6D5AE6; --ok:#00E3A2; --warn:#FF8C42; --err:#FF4D5E; --info:#00D1FF;
  --radius-1:8px; --radius-2:12px; --radius-3:20px;
}
.glass{ background:rgba(17,26,44,.55); backdrop-filter:blur(14px);
  border:1px solid rgba(255,255,255,.06); box-shadow:0 10px 30px rgba(0,0,0,.35); }
.btn-primary{ background-image:linear-gradient(135deg,#009DFF,#6D5AE6); color:#070B12; }
```

### 12.2 Animações (keyframes base)

```css
@keyframes fadeInUp{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
```

### 12.3 Acessibilidade (focus)

```css
:focus-visible{ outline:none; box-shadow:0 0 0 3px rgba(0,157,255,.35) }
```

---

## 13) Não fazer (anti-padrões)

* Texturas de couro/madeira/pergaminho, rebordos pesados, serifas medievais.
* Pixel art, ruído excessivo, gradients saturados demais.
* Sombras gigantes “flutuantes” ou glow forte em todos os elementos.
* Placeholders com baixo contraste; conteúdos sem hierarquia clara.

---

## 14) Checklist de página (para o agente)

1. Definir **título claro** da tela e breadcrumbs (se aplicável).
2. Usar **cards glass** com `--radius-2` e *tokens* de spacing para blocos.
3. Ações principais em **botão primary** (um só por bloco).
4. Inputs com label, hint/erro e estados completos.
5. Se houver progresso, usar **barras XP/HP** com variantes corretas.
6. Histórico sempre com **Timeline** agrupada e filtros.
7. Garantir contraste, foco visível e navegação por teclado.
8. Aplicar animações ≤ 240ms e respeitar *reduced motion*.
9. Validar responsividade (sm → 1 coluna; md → 2; lg+ → 3+).
10. Usar *toasts* para feedback, **achievement** quando pertinente.
