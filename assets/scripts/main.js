      /*
  main.js
  - Ponto de entrada da aplicação.
  - Define um namespace global `App` com:
    - `db`: wrapper de localStorage (get/set/remove, seed)
    - `ui`: renderização e bindings
    - `init()`: fluxo inicial da aplicação
*/

(function () {
  const STORAGE_KEY = 'app:personal-leveling';

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch (_) { return fallback; }
  }

  // =====================
  // Atributos e Métricas
  // =====================
  // Lista canônica de atributos (códigos estáveis para persistência)
  const ATTR_LIST = [
    'disciplina', 'clareza', 'conhecimento', 'habilidade', 'entrega',
    'financas', 'vitalidade', 'relacoes', 'resiliencia', 'criatividade'
  ];

  // Métricas globais (iguais para todos os usuários)
  // Por atributo: unidade padrão (u), pontos por unidade (ppu), cap diário S (unidades),
  // faixa de clamp para Tk (subtier) e rampa macro (aplicada por bloco de tiers longos futuramente)
  const ATTR_METRICS = {
    disciplina:   { unit: 'hábitos',   ppu: 1.0,  S: 3,  Tmin: 80, Tmax: 160 },
    clareza:      { unit: 'min_foco',  ppu: 0.3,  S: 100, Tmin: 80, Tmax: 160 },
    conhecimento: { unit: 'min_estudo',ppu: 0.25, S: 120, Tmin: 80, Tmax: 160 },
    habilidade:   { unit: 'min_pratica',ppu: 0.3, S: 90,  Tmin: 80, Tmax: 160 },
    entrega:      { unit: 'outputs',   ppu: 8.0,  S: 2,   Tmin: 80, Tmax: 160 },
    financas:     { unit: 'eventos',   ppu: 5.0,  S: 1,   Tmin: 80, Tmax: 160 },
    vitalidade:   { unit: 'min_atividade', ppu: 0.2, S: 60, Tmin: 80, Tmax: 160 },
    relacoes:     { unit: 'sessões',   ppu: 2.0,  S: 2,   Tmin: 80, Tmax: 160 },
    resiliencia:  { unit: 'min_cuidado', ppu: 0.2, S: 40, Tmin: 80, Tmax: 160 },
    criatividade: { unit: 'sessões',   ppu: 3.0,  S: 2,   Tmin: 80, Tmax: 160 },
  };

  // Network helper: fetch with timeout that aborts the request and throws a TimeoutError
  class TimeoutError extends Error { constructor(msg) { super(msg); this.name = 'TimeoutError'; } }
  async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      throw err;
    }
  }

  // Créditos em faixas (anti-grind universal): até S (100%), S..2S (50%), >2S (10%)
  function applyCreditBands(units, usedToday, S) {
    const rem100 = Math.max(0, Math.min(S - usedToday, units));
    let credited = rem100; // 100%
    const left = Math.max(0, units - rem100);
    const tier2Cap = Math.max(0, (2 * S) - Math.min(usedToday + rem100, 2 * S));
    const rem50 = Math.max(0, Math.min(tier2Cap, left));
    credited += rem50 * 0.5; // 50%
    const left2 = Math.max(0, left - rem50);
    credited += left2 * 0.1; // 10%
    return credited;
  }

  // Threshold alvo por subtier (fixo global): D_attr = ppu * S, Tk = clamp(D_attr*7, Tmin, Tmax)
  function subtierThreshold(attr) {
    const m = ATTR_METRICS[attr];
    if (!m) return 100; // fallback
    const D = m.ppu * m.S;
    const Tk = Math.max(m.Tmin, Math.min(m.Tmax, D * 7));
    return Tk;
  }

  // Mapeamento inicial de categoria -> atributos afetados com pesos relativos de unidades
  // As unidades de entrada normalmente são minutos (duration) ou 1 evento quando sem duração.
  const CATEGORY_MAP = {
    estudo: { conhecimento: 1.0 },
    leitura: { conhecimento: 0.8, clareza: 0.2 },
    treino: { vitalidade: 1.0, resiliencia: 0.2 },
    exercicio: { vitalidade: 1.0, resiliencia: 0.2 },
    saude: { vitalidade: 0.6, resiliencia: 0.4 },
    meditacao: { clareza: 0.7, resiliencia: 0.5 },
    trabalho: { entrega: 0.7, habilidade: 0.5 },
    projeto: { habilidade: 0.8, entrega: 0.6 },
    networking: { relacoes: 1.0 },
    social: { relacoes: 1.0 },
    financas: { financas: 1.0 },
    habito: { disciplina: 1.0 },
  };

  function normalizeCategory(raw) {
    return String(raw || '').toLowerCase().trim();
  }

  // =====================
  // Engine de Progressão
  // =====================
  const engine = {
    ensureAttrState(state) {
      state.attributes = state.attributes && typeof state.attributes === 'object' ? state.attributes : {};
      for (const a of ATTR_LIST) {
        if (!state.attributes[a]) {
          state.attributes[a] = {
            tier: 0, // índice longo (nomes ainda não mapeados aqui)
            subtier: 0, // 0..4 (V..I); aqui usamos 0..9 para barra 0-10 visual; progresso numérico é rp
            rp: 0, // RP atual dentro do subtier
            lastUpdate: null,
            promotedAt: null,
          };
        }
      }
    },
    // Renderiza campos dinâmicos do preset selecionado no formulário de atividade (#activityDynamicFields)
    renderDynamicFieldsForPresetId(presetId) {
      const box = this.els?.activityDynamicFields || document.getElementById('activityDynamicFields');
      if (!box) return;
      box.innerHTML = '';
      if (!presetId) return;
      const state = App.db.getState();
      const pr = (state.presets || []).find(p => p.id === presetId);
      if (!pr || !pr.metricsSpec || !Array.isArray(pr.metricsSpec.fields) || pr.metricsSpec.fields.length === 0) return;
      // Título opcional da seção
      const head = document.createElement('div');
      head.className = 'text-muted';
      head.textContent = 'Campos do preset';
      box.appendChild(head);
      const grid = document.createElement('div');
      // Keep existing grid class and add Bootstrap responsive grid helpers
      grid.className = 'grid-3 mt-2 row row-cols-1 row-cols-md-3 g-3';
      box.appendChild(grid);
      for (const f of pr.metricsSpec.fields) {
        const wrap = document.createElement('label');
        wrap.className = 'form-group mb-3 col';
        const span = document.createElement('span');
        span.className = 'form-label';
        span.textContent = f.label || f.name;
        wrap.appendChild(span);
        const name = `dyn_${f.name}`;
        if (f.type === 'select') {
          const sel = document.createElement('select');
          sel.name = name;
          sel.id = name;
          sel.setAttribute('aria-label', f.label || f.name);
          sel.className = 'form-select';
          const opts = Array.isArray(f.options) ? f.options : [];
          for (const opt of opts) {
            const o = document.createElement('option');
            if (typeof opt === 'object') { o.value = opt.value; o.textContent = opt.label ?? String(opt.value); }
            else { o.value = String(opt); o.textContent = String(opt); }
            sel.appendChild(o);
          }
          if (f.required) sel.required = true;
          wrap.appendChild(sel);
        } else {
          const inp = document.createElement('input');
          inp.name = name;
          inp.id = name;
          inp.placeholder = f.placeholder || '';
          inp.setAttribute('aria-label', f.label || f.name);
          if (f.type === 'number') {
            inp.type = 'number';
            if (typeof f.min === 'number') inp.min = String(f.min);
            if (typeof f.max === 'number') inp.max = String(f.max);
            if (typeof f.step === 'number') inp.step = String(f.step);
          } else {
            inp.type = 'text';
          }
          inp.className = 'form-control';
          if (f.required) inp.required = true;
          wrap.appendChild(inp);
        }
        grid.appendChild(wrap);
      }
      // Rebalance UI: aparece quando a opção selecionada usa rebalance
      try {
        const hasRebalance = pr.scoring && Array.isArray(pr.scoring.options) && pr.scoring.options.some(o => o && o.rebalance);
        const typeFieldName = pr.scoring && typeof pr.scoring.typeField === 'string' ? `dyn_${pr.scoring.typeField}` : null;
        const typeFieldEl = typeFieldName ? box.querySelector(`[name="${typeFieldName}"]`) : null;
        if (hasRebalance && typeFieldEl) {
          const rbWrap = document.createElement('div');
          rbWrap.className = 'mt-2';
          rbWrap.id = 'rebalanceControls';
          const label = document.createElement('label');
          label.className = 'form-group';
          const span = document.createElement('span');
          span.className = 'form-label';
          span.textContent = 'Rebalance: adicionar ao alvo (%)';
          const input = document.createElement('input');
          input.type = 'number';
          input.name = 'dyn_rebalance_addPercent';
          input.id = 'dyn_rebalance_addPercent';
          input.className = 'form-control';
          input.min = '0';
          input.step = '1';
          // será ajustado dinamicamente conforme a opção
          const hint = document.createElement('p');
          hint.className = 'form-text text-muted mt-1';
          label.appendChild(span);
          label.appendChild(input);
          rbWrap.appendChild(label);
          rbWrap.appendChild(hint);
          box.appendChild(rbWrap);

          const updateRebalanceUI = () => {
            const selectedVal = typeFieldEl.value;
            const opt = pr.scoring.options.find(o => (o && o.value) === selectedVal);
            const rb = opt && opt.rebalance;
            if (!rb) {
              rbWrap.style.display = 'none';
              return;
            }
            rbWrap.style.display = '';
            const defPct = ((rb.addPercent == null ? 0.10 : Math.max(0, Math.min(1, Number(rb.addPercent) || 0)))) * 100;
            const maxPct = (rb.maxPercent == null ? null : Math.max(0, Math.min(1, Number(rb.maxPercent) || 0)));
            // Default value and max bound in percent units
            input.value = String(Math.round(defPct));
            input.max = String(maxPct == null ? 100 : Math.round(maxPct * 100));
            const maxTxt = (maxPct == null ? 'sem limite máximo explícito.' : `máximo ${Math.round(maxPct * 100)}%.`);
            hint.textContent = `Informe um percentual entre 0 e ${input.max}. Dica: valores menores causam ajustes suaves; ${maxTxt}`;
            // Clear any previous errors when option changes
            input.setCustomValidity('');
          };
          // Initialize and bind
          updateRebalanceUI();
          typeFieldEl.addEventListener('change', updateRebalanceUI);

          // Validation & clamping
          const validateClamp = () => {
            const raw = input.value;
            const maxNum = Number(input.max);
            if (raw === '') { input.setCustomValidity(''); return; }
            let n = Number(raw);
            if (!Number.isFinite(n)) {
              input.setCustomValidity(`Informe um número entre 0 e ${isFinite(maxNum) ? maxNum : 100}.`);
              input.reportValidity();
              return;
            }
            // Clamp 0..max
            const upper = Number.isFinite(maxNum) ? maxNum : 100;
            n = Math.max(0, Math.min(upper, n));
            const rounded = Math.round(n);
            if (String(rounded) !== raw) input.value = String(rounded);
            input.setCustomValidity('');
          };
          input.addEventListener('input', validateClamp);
          input.addEventListener('blur', validateClamp);
        }
      } catch {}
      // Dica opcional
      if (pr.metricsSpec?.hint) {
        const p = document.createElement('p');
        p.className = 'form-text text-muted mt-2';
        p.textContent = pr.metricsSpec.hint;
        box.appendChild(p);
      }
    },
    // Soma unidades do dia para um atributo, varrendo itens do próprio estado
    dayUnitsForAttr(state, attr, isoDate) {
      const items = state.items || [];
      let total = 0;
      for (const it of items) {
        const key = (it.ts ? new Date(it.ts) : new Date()).toISOString().slice(0,10);
        if (key !== isoDate) continue;
        // Preferir overrides por item quando existentes
        const weights = (it.attrWeights && typeof it.attrWeights === 'object') ? it.attrWeights : null;
        if (weights && weights[attr]) {
          const baseUnits = Number(it.baseUnits) || Math.max(0, Number(it.duration) || 0) || 30;
          total += baseUnits * (Number(weights[attr]) || 0);
          continue;
        }
        const cat = normalizeCategory(it.category || '');
        const map = CATEGORY_MAP[cat];
        if (!map || !map[attr]) continue;
        const baseUnits = Math.max(0, Number(it.duration) || 0) || 30; // se sem duração, assume 30 min como unidade padrão
        total += baseUnits * map[attr];
      }
      return total;
    },
    // Aplica uma atividade ao estado de atributos
    applyActivity(state, activity) {
      this.ensureAttrState(state);
      const dateKey = (activity.ts ? new Date(activity.ts) : new Date()).toISOString().slice(0,10);
      // Permitir overrides por atividade
      const cat = normalizeCategory(activity.category || '');
      const overrideWeights = (activity.attrWeights && typeof activity.attrWeights === 'object') ? activity.attrWeights : null;
      const overrideCaps = (activity.attrCaps && typeof activity.attrCaps === 'object') ? activity.attrCaps : null; // fração 0..1 do baseUnits
      const map = overrideWeights || (CATEGORY_MAP[cat] || {});
      // baseUnits: permitir override; senão minutos quando disponível; caso contrário 1 sessão
      const baseUnits = (Number(activity.baseUnits) || 0) > 0
        ? Number(activity.baseUnits)
        : ((Number(activity.duration) || 0) > 0 ? Number(activity.duration) : 1);
      for (const attr of Object.keys(map)) {
        const weight = Number(map[attr]) || 0;
        let rawUnits = baseUnits * weight;
        // Aplicar limite por atributo, se definido (fração do baseUnits)
        if (overrideCaps && typeof overrideCaps[attr] !== 'undefined') {
          const capFrac = Math.max(0, Math.min(1, Number(overrideCaps[attr]) || 0));
          const capUnits = baseUnits * capFrac;
          rawUnits = Math.min(rawUnits, capUnits);
        }
        const usedToday = this.dayUnitsForAttr(state, attr, dateKey);
        const S = ATTR_METRICS[attr]?.S || 60;
        const creditedUnits = applyCreditBands(rawUnits, usedToday, S);
        const ppu = ATTR_METRICS[attr]?.ppu || 0.2;
        const rpGain = creditedUnits * ppu;
        this.applyRPGain(state, attr, rpGain);
      }
    },
    applyRPGain(state, attr, rpGain) {
      const node = state.attributes[attr];
      if (!node) return;
      const Tk = subtierThreshold(attr);
      node.rp = Math.max(0, (node.rp || 0) + rpGain);
      // Promoções encadeadas se exceder o limiar
      while (node.rp >= Tk) {
        node.rp -= Tk;
        node.subtier += 1;
        // a cada 5 subtiers, avança 1 tier amplo
        if (node.subtier >= 5) { node.subtier = 0; node.tier += 1; }
        node.promotedAt = new Date().toISOString();
      }
      node.lastUpdate = new Date().toISOString();
    },
    // Reconstrói inteiramente o progresso de atributos a partir dos itens
    rebuildFromItems(state) {
      this.ensureAttrState(state);
      for (const a of ATTR_LIST) {
        state.attributes[a].tier = 0;
        state.attributes[a].subtier = 0;
        state.attributes[a].rp = 0;
        state.attributes[a].lastUpdate = null;
        state.attributes[a].promotedAt = null;
      }
      const items = Array.isArray(state.items) ? [...state.items] : [];
      // Aplicar em ordem cronológica
      items.sort((a,b)=> new Date(a.ts||0) - new Date(b.ts||0));
      for (const it of items) this.applyActivity(state, it);
    }
  };

  // Detecta se está rodando via protocolo file://
  function isFileProtocol() {
    try { return window.location.protocol === 'file:'; } catch (_) { return false; }
  }

  function getToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Retorna a data (yyyy-mm-dd) da segunda-feira da semana de uma data (ISO week start)
  function getIsoWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0(dom) .. 6(sab)
    const diff = (day === 0 ? -6 : 1 - day); // segunda-feira como início
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Calcula progresso dentro do nível atual dado um total de XP
  function levelProgressFromXP(xpTotal) {
    let lvl = 1;
    let needed = 200;
    let remaining = Math.max(0, xpTotal || 0);
    while (remaining >= needed) {
      remaining -= needed;
      lvl += 1;
      needed += 200;
      if (lvl > 99) break;
    }
    const current = remaining; // xp dentro do nível atual
    const pct = needed > 0 ? Math.min(1, current / needed) : 0;
    return { lvl, current, needed, pct };
  }

  const i18n = {
    dict: {
      pt: {
        streak_none: 'Nenhuma sequência ainda. Registre sua primeira atividade!',
        streak_text: (n) => `Você está em uma sequência de <strong>${n} dia${n === 1 ? '' : 's'}</strong>! Continue assim.`,
        bonus_badge: (b) => `Bônus XP +${b}%`,
        weekly_streak_none: 'Nenhuma semana consecutiva ainda.',
        weekly_streak_text: (n) => `Você tem <strong>${n} semana${n === 1 ? '' : 's'}</strong> consecutiva(s) com atividade.`,
        weekly_weeks_badge: (n) => `Semanas ${n}`,
        missions_none_today: 'Sem missões para hoje.',
        missions_none_week: 'Sem missões nesta semana.',
        complete: 'Concluir',
        completed: 'Concluída',
        achievements_none: 'Sem conquistas ainda.',
        attributes_title: 'Atributos',
      },
      en: {
        streak_none: 'No streak yet. Log your first activity!',
        streak_text: (n) => `You are on a <strong>${n} day${n === 1 ? '' : 's'}</strong> streak! Keep it up.`,
        bonus_badge: (b) => `XP Bonus +${b}%`,
        weekly_streak_none: 'No consecutive weeks yet.',
        weekly_streak_text: (n) => `You have <strong>${n} consecutive week${n === 1 ? '' : 's'}</strong> with activity.`,
        weekly_weeks_badge: (n) => `Weeks ${n}`,
        missions_none_today: 'No missions for today.',
        missions_none_week: 'No missions this week.',
        complete: 'Complete',
        completed: 'Completed',
        achievements_none: 'No achievements yet.',
        attributes_title: 'Attributes',
      }
    },
    t(key, ...args) {
      const lang = (App?.db?.getState()?.prefs?.language) || 'pt';
      const d = this.dict[lang] || this.dict.pt;
      const v = d[key] ?? this.dict.pt[key];
      return typeof v === 'function' ? v(...args) : v;
    }
  };

  const db = {
    // Obtém estado completo do app
    getState() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const fallback = { items: [], presets: [], missions: { daily: [], weekly: [] }, stats: { level: 1, xp: 0 }, prefs: { theme: 'dark', density: 'cozy', language: 'pt', filters: { activities: { category: 'all', interval: 'all' }, missions: { status: 'all', type: 'all' } } } };
      if (!raw) {
        try {
          fallback.prefs.theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        } catch (_) { /* noop */ }
      }
      const state = raw ? safeJSONParse(raw, fallback) : fallback;
      // Garantir formatos mínimos
      state.items = Array.isArray(state.items) ? state.items : [];
      state.presets = Array.isArray(state.presets) ? state.presets : [];
      state.missions = state.missions && Array.isArray(state.missions.daily) ? state.missions : { daily: [], weekly: [] };
      if (!Array.isArray(state.missions.weekly)) state.missions.weekly = [];
      state.stats = state.stats && typeof state.stats.level === 'number' && typeof state.stats.xp === 'number'
        ? state.stats : { level: 1, xp: 0 };
      // Normaliza prefs e filtros (retrocompatível)
      const basePrefs = state.prefs && typeof state.prefs === 'object' ? state.prefs : {};
      const filters = (basePrefs.filters && typeof basePrefs.filters === 'object') ? basePrefs.filters : {};
      const activities = (filters.activities && typeof filters.activities === 'object') ? filters.activities : {};
      const missionsFilters = (filters.missions && typeof filters.missions === 'object') ? filters.missions : {};
      state.prefs = {
        theme: basePrefs.theme || 'dark',
        density: basePrefs.density || 'cozy',
        language: basePrefs.language || 'pt',
        filters: {
          activities: {
            category: activities.category || 'all',
            interval: (activities.interval === 'today' || activities.interval === 'week' || activities.interval === 'all') ? activities.interval : 'all'
          },
          missions: {
            status: (missionsFilters.status === 'pending' || missionsFilters.status === 'done' || missionsFilters.status === 'all') ? missionsFilters.status : 'all',
            type: (missionsFilters.type === 'daily' || missionsFilters.type === 'weekly' || missionsFilters.type === 'all') ? missionsFilters.type : 'all'
          }
        }
      };
      return state;
    },
    // Persiste estado completo
    setState(state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
    // Operações utilitárias
    addItem(item) {
      const state = this.getState();
      state.items.push(item);
      this.setState(state);
      return item;
    },
    removeItem(id) {
      const state = this.getState();
      const items = state.items || [];
      const idx = items.findIndex(it => it.id === id);
      if (idx === -1) return null;
      const [removed] = items.splice(idx, 1);
      state.items = items;
      this.setState(state);
      return removed || null;
    },
    addPreset(preset) {
      const state = this.getState();
      const sess = App?.auth?.getSession ? App.auth.getSession() : null;
      const ownerId = preset.ownerId || (sess && sess.userId ? String(sess.userId) : null);
      const visibility = (preset.visibility === 'personal' || preset.visibility === 'general') ? preset.visibility : 'general';
      const next = {
        id: Date.now(),
        title: String(preset.title || 'Sem título'),
        category: preset.category || '',
        duration: Number(preset.duration) || 0,
        visibility,
        ownerId,
        // Opcional: specs para campos dinâmicos e pontuação
        metricsSpec: (preset.metricsSpec && typeof preset.metricsSpec === 'object') ? preset.metricsSpec : null,
      };
      state.presets = Array.isArray(state.presets) ? state.presets : [];
      state.presets.unshift(next);
      this.setState(state);
      return next;
    },
    removePreset(id) {
      const state = this.getState();
      const list = Array.isArray(state.presets) ? state.presets : [];
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const sess = App?.auth?.getSession ? App.auth.getSession() : null;
      const me = sess && sess.userId ? String(sess.userId) : null;
      const target = list[idx];
      // Only owner can delete
      if (target && target.ownerId && me && String(target.ownerId) !== me) {
        return null;
      }
      const [removed] = list.splice(idx, 1);
      state.presets = list;
      this.setState(state);
      return removed || null;
    },
    addDailyMission(mission) {
      const state = this.getState();
      const today = getToday();
      const next = { id: Date.now(), title: mission.title, category: mission.category || null, xp: mission.xp || 25, done: false, date: today };
      state.missions.daily.push(next);
      this.setState(state);
      return next;
    },
    addWeeklyMission(mission) {
      const state = this.getState();
      const weekStart = getIsoWeekStart();
      const next = { id: Date.now(), title: mission.title, category: mission.category || null, xp: mission.xp || 50, done: false, weekStart };
      state.missions.weekly.push(next);
      this.setState(state);
      return next;
    },
    updateItem(id, patchOrUpdater) {
      const state = this.getState();
      const items = state.items || [];
      const idx = items.findIndex(it => it.id === id);
      if (idx === -1) return null;
      const current = items[idx];
      const next = typeof patchOrUpdater === 'function' ? patchOrUpdater({ ...current }) : { ...current, ...patchOrUpdater };
      items[idx] = next;
      state.items = items;
      this.setState(state);
      return next;
    },
    completeDailyMission(id) {
      const state = this.getState();
      const today = getToday();
      const m = state.missions.daily.find(m => m.id === id && m.date === today);
      if (m && !m.done) {
        m.done = true;
        this.applyXP(state, m.xp || 0);
        this.setState(state);
        return true;
      }
      return false;
    },
    completeWeeklyMission(id) {
      const state = this.getState();
      const ws = getIsoWeekStart();
      const m = state.missions.weekly.find(m => m.id === id && m.weekStart === ws);
      if (m && !m.done) {
        m.done = true;
        this.applyXP(state, m.xp || 0);
        this.setState(state);
        return true;
      }
      return false;
    },
    applyXP(state, amount) {
      state.stats.xp = Math.max(0, (state.stats.xp || 0) + (amount || 0));
      this.recalcLevel(state);
    },
    recalcLevel(state) {
      // Regra simples de nivel: nível 1 começa em 0 XP, cada nível requer +200 XP a mais que o anterior (aritmética)
      // Ex.: L1->L2: 200, L2->L3: 400, L3->L4: 600 ... total cumulativo.
      const xp = state.stats.xp || 0;
      let lvl = 1;
      let needed = 200;
      let remaining = xp;
      while (remaining >= needed) {
        remaining -= needed;
        lvl += 1;
        needed += 200;
        if (lvl > 99) break; // teto de segurança
      }
      state.stats.level = lvl;
    },
    clear() {
      localStorage.removeItem(STORAGE_KEY);
    },
    // Aplica seed se ainda não houver dados
    async applySeedIfEmpty() {
      const current = this.getState();
      const hasAny = (current.items && current.items.length > 0) ||
        (current.missions && (
          (current.missions.daily && current.missions.daily.length > 0) ||
          (current.missions.weekly && current.missions.weekly.length > 0)
        ));
      if (hasAny) return false;

      // 1) Tenta seed inline (caso exista)
      const inline = document.getElementById('seed-inline');
      if (inline && inline.textContent) {
        const data = safeJSONParse(inline.textContent, null);
        if (data) { this.setState(data); return true; }
      }

      // 2) Tenta buscar data/seed.json (funciona melhor em http/https)
      if (!isFileProtocol()) {
        try {
          const res = await fetch('data/seed.json', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data) { this.setState(data); return true; }
          }
        } catch (err) {
          console.warn('Falha ao carregar seed.json:', err);
        }
      } else {
        console.info('Rodando via file:// — fetch de seed.json pode ser bloqueado. Use seed inline ou um servidor estático.');
      }
      return false;
    }
  };

  // Overlay sidebar state (open/close). We won't persist open state across reloads.
  function isSidebarOpen() { return document.body.classList.contains('sidebar-open'); }
  function openSidebar() {
    document.body.classList.add('sidebar-open');
  }
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }
  function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
  }

  const ui = {
    els: {},
    // Over-form notification card helpers
    ensureNoticeHost() {
      let host = document.getElementById('overFormNoticeHost');
      if (!host) {
        host = document.createElement('div');
        host.id = 'overFormNoticeHost';
        host.style.position = 'fixed';
        host.style.inset = '0';
        host.style.pointerEvents = 'none';
        host.style.zIndex = '9999';
        document.body.appendChild(host);
      }
      return host;
    },
    showOverFormCard(type, title, message) {
      const host = this.ensureNoticeHost();
      let card = document.getElementById('overFormNotice');
      if (!card) {
        card = document.createElement('div');
        card.id = 'overFormNotice';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-live', 'polite');
        card.style.pointerEvents = 'auto';
        card.style.position = 'absolute';
        card.style.top = '24px';
        card.style.left = '50%';
        card.style.transform = 'translateX(-50%)';
        card.style.maxWidth = '640px';
        card.style.width = 'min(92vw, 640px)';
        card.style.borderRadius = '10px';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,.35)';
        card.style.padding = '16px 18px';
        card.style.backdropFilter = 'saturate(140%) blur(6px)';
        card.style.border = '1px solid rgba(255,255,255,0.12)';
        card.style.background = 'linear-gradient(180deg, rgba(28,28,36,.95), rgba(22,22,30,.92))';
        card.innerHTML = `<div id="overFormNoticeTitle" class="h5" style="margin:0 0 6px 0"></div>
                          <div id="overFormNoticeMsg" class="small"></div>
                          <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end">
                            <button type="button" id="overFormNoticeClose" class="btn btn-ghost">Fechar</button>
                          </div>`;
        host.appendChild(card);
        card.querySelector('#overFormNoticeClose').addEventListener('click', () => this.dismissOverFormCard());
      }
      const titleEl = card.querySelector('#overFormNoticeTitle');
      const msgEl = card.querySelector('#overFormNoticeMsg');
      titleEl.textContent = title || '';
      msgEl.textContent = message || '';
      // Color by type
      if (type === 'error') { titleEl.style.color = '#f87171'; }
      else if (type === 'success') { titleEl.style.color = '#34d399'; }
      else { titleEl.style.color = ''; }
      return card;
    },
    updateOverFormCard(type, title, message) {
      if (!document.getElementById('overFormNotice')) return this.showOverFormCard(type, title, message);
      return this.showOverFormCard(type, title, message);
    },
    dismissOverFormCard() {
      const card = document.getElementById('overFormNotice');
      if (card) card.remove();
    },
    // Helpers: categories and inline validation
    getCategoryList() {
      try { return Object.keys(CATEGORY_MAP).sort(); } catch { return []; }
    },
    populateCategorySelect(selectEl, includeEmpty = true) {
      if (!selectEl) return;
      const cats = this.getCategoryList();
      selectEl.innerHTML = '';
      if (includeEmpty) {
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Selecione...';
        selectEl.appendChild(opt0);
      }
      for (const c of cats) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
        selectEl.appendChild(opt);
      }
    },
    showInlineError(targetEl, message) {
      if (!targetEl) return;
      targetEl.setAttribute('aria-invalid', 'true');
      let msgEl = targetEl.parentElement && targetEl.parentElement.querySelector('.field-error');
      if (!msgEl) {
        msgEl = document.createElement('small');
        msgEl.className = 'field-error muted';
        msgEl.style.display = 'block';
        msgEl.style.marginTop = '4px';
        targetEl.parentElement && targetEl.parentElement.appendChild(msgEl);
      }
      msgEl.textContent = message || 'Valor inválido';
    },
    clearInlineError(targetEl) {
      if (!targetEl) return;
      targetEl.removeAttribute('aria-invalid');
      const msgEl = targetEl.parentElement && targetEl.parentElement.querySelector('.field-error');
      if (msgEl) msgEl.remove();
    },
    renderActivityPresets() {
      // Render presets as quick buttons on app.html (#activityPresets)
      const box = document.getElementById('activityPresets');
      if (!box) return;
      const state = App.db.getState();
      const presets = Array.isArray(state.presets) ? state.presets : [];
      const sess = App?.auth?.getSession ? App.auth.getSession() : null;
      const me = sess && sess.userId ? String(sess.userId) : null;
      // Filter by visibility: general = visible to all; personal = only to owner in quick selection
      const visible = presets.filter(pr => {
        const vis = pr.visibility || 'general';
        if (vis === 'general') return true;
        if (vis === 'personal') return pr.ownerId && me && String(pr.ownerId) === me;
        return true;
      });
      box.innerHTML = '';
      if (visible.length === 0) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'Nenhum preset disponível.';
        box.appendChild(p);
        return;
      }
      for (const pr of visible) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.setAttribute('data-preset-id', String(pr.id));
        btn.setAttribute('data-preset-title', pr.title);
        btn.setAttribute('data-preset-category', pr.category || '');
        if (Number(pr.duration) > 0) btn.setAttribute('data-preset-duration', String(pr.duration));
        btn.textContent = pr.duration ? `${pr.title} ${pr.duration}m` : pr.title;
        box.appendChild(btn);
      }
    },
    async renderPresetsManager() {
      // Render presets list on activities.html (#presetsList)
      const ul = document.getElementById('presetsList');
      if (!ul) return;
      // ensure reference for delegation
      this.els = this.els || {};
      this.els.presetsList = ul;
      try { console.debug('[presets] render:start'); } catch {}
      // Try to grab the heading just above the list to show a visible count
      let heading = null;
      try {
        const prev = ul.previousElementSibling;
        if (prev && prev.tagName === 'H3') heading = prev;
      } catch {}
      // Show loading placeholder while fetching
      ul.innerHTML = '';
      ul.classList.add('list-group','preset-list');
      const liLoading = document.createElement('li');
      liLoading.className = 'list-group-item bg-transparent text-muted border-secondary-subtle';
      liLoading.textContent = 'Carregando presets...';
      ul.appendChild(liLoading);
      const state = App.db.getState();
      const localPresets = Array.isArray(state.presets) ? state.presets : [];
      const sess = App?.auth?.getSession ? App.auth.getSession() : null;
      const me = sess && sess.userId ? String(sess.userId) : null;

      // Try to load remote presets (general + personal) without persisting
      let remote = [];
      if (!isFileProtocol()) {
        try {
          const resG = await fetchWithTimeout('/api/activities', { headers: { 'Cache-Control': 'no-store' } }, 10000);
          if (resG.ok) {
            const listG = await resG.json();
            if (Array.isArray(listG)) remote = remote.concat(listG.map(p => ({ ...p, source: 'remote' })));
          }
        } catch (e) {
          try { console.warn('[presets] falha ao buscar gerais', e); } catch {}
        }
        if (me) {
          try {
            const resP = await fetchWithTimeout(`/api/activities/${encodeURIComponent(me)}`, { headers: { 'Cache-Control': 'no-store' } }, 10000);
            if (resP.ok) {
              const listP = await resP.json();
              if (Array.isArray(listP)) remote = remote.concat(listP.map(p => ({ ...p, source: 'remote' })));
            }
          } catch (e) {
            try { console.warn('[presets] falha ao buscar pessoais', e); } catch {}
          }
        }
      }

      // Merge remote + local (remote first to highlight server data)
      const presets = [...remote, ...localPresets];
      // Cache for edit prefill
      try {
        this.cache = this.cache || {};
        this.cache.managerPresets = presets;
      } catch {}

      // Loading/empty placeholder while building
      ul.innerHTML = '';
      try { console.debug('[presets] render', { remote: remote.length, local: localPresets.length, total: presets.length }); } catch {}
      // Update heading with a visible count to confirm render path
      if (heading) {
        try { heading.textContent = `Seus Presets (${presets.length})`; } catch {}
      }
      if (presets.length === 0) {
        const li = document.createElement('li');
        li.className = 'list-group-item bg-transparent text-muted border-secondary-subtle';
        li.textContent = isFileProtocol()
          ? 'Sem presets cadastrados. Dica: rode em http/https ou via "netlify dev" para carregar da API.'
          : 'Sem presets cadastrados.';
        ul.appendChild(li);
        return;
      }
      for (const pr of presets) {
        const vis = pr.visibility || 'general';
        const isMine = pr.ownerId && me && String(pr.ownerId) === me;
        const isRemote = pr.source === 'remote';
        const ownerHint = vis === 'personal' && !isMine ? ' • de outro usuário' : '';
        const badge = vis === 'general'
          ? '<span class="badge bg-secondary-subtle text-dark me-2">Geral</span>'
          : `<span class="badge bg-info-subtle text-dark me-2">Individual${ownerHint}</span>`;
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex align-items-start justify-content-between gap-2 bg-transparent border-secondary-subtle preset-item';
        li.setAttribute('data-id', String(pr.id));
        // dataset to support delegated actions
        try {
          li.dataset.source = isRemote ? 'remote' : 'local';
          li.dataset.visibility = vis;
          if (pr.ownerId != null) li.dataset.ownerId = String(pr.ownerId);
        } catch {}
        const left = document.createElement('div');
        left.className = 'd-flex flex-column';
        const title = document.createElement('div');
        const strong = document.createElement('strong');
        strong.className = 'text-white';
        strong.textContent = String(pr.title || '');
        title.appendChild(strong);
        // badge as HTML string (controlled)
        const badgeWrap = document.createElement('span');
        badgeWrap.innerHTML = ' ' + badge;
        title.appendChild(badgeWrap);
        const meta = document.createElement('div');
        meta.className = 'small text-muted';
        const metaParts = [];
        metaParts.push(String(pr.category || 'geral'));
        if (Number(pr.duration)) metaParts.push(`${Number(pr.duration)}m`);
        if (isRemote) metaParts.push('(API)');
        meta.textContent = metaParts.join(' · ');
        left.appendChild(title);
        left.appendChild(meta);
        const right = document.createElement('div');
        right.className = 'btn-group btn-group-sm';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn btn-outline-warning';
        editBtn.setAttribute('data-action','edit-preset');
        editBtn.setAttribute('data-id', String(pr.id));
        editBtn.textContent = 'Editar';
        const canDeleteLocally = !isRemote && (isMine || !pr.ownerId);
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn btn-outline-danger';
        delBtn.setAttribute('data-action','delete-preset');
        delBtn.setAttribute('data-id', String(pr.id));
        delBtn.textContent = 'Excluir';
        // Keep delete enabled for all; inform when API preset
        if (!canDeleteLocally) {
          delBtn.title = 'Preset de API: remover localmente não é possível';
        }
        right.appendChild(editBtn);
        right.appendChild(delBtn);
        li.appendChild(left);
        li.appendChild(right);
        ul.appendChild(li);
      }
    },
    renderWeeklyStreak() {
      const textEl = document.getElementById('weeklyStreakText');
      const badgeEl = document.getElementById('weeklyStreakBadge');
      if (!textEl) return;
      const state = App.db.getState();
      const items = state.items || [];
      if (items.length === 0) {
        textEl.textContent = i18n.t('weekly_streak_none');
        if (badgeEl) badgeEl.textContent = i18n.t('weekly_weeks_badge', 0);
        return;
      }
      const weeks = new Set(items.map(it => getIsoWeekStart(new Date(it.ts || Date.now()))));
      let streak = 0;
      let cursor = new Date();
      cursor.setHours(0,0,0,0);
      while (true) {
        const ws = getIsoWeekStart(cursor);
        if (weeks.has(ws)) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 7);
        } else {
          break;
        }
      }
      textEl.innerHTML = i18n.t('weekly_streak_text', streak);
      if (badgeEl) badgeEl.textContent = i18n.t('weekly_weeks_badge', streak);
    },
    renderWeeklyMetrics() {
      const ulCat = document.getElementById('weeklyStatsByCategory');
      const ulTrend = document.getElementById('weeklyTrend7d');
      if (!ulCat && !ulTrend) return;
      const state = App.db.getState();
      const items = state.items || [];
      const start = new Date(getIsoWeekStart());
      const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23,59,59,999);
      const inWeek = it => { const d = new Date(it.ts || Date.now()); return d >= start && d <= end; };
      if (ulCat) {
        const agg = new Map();
        for (const it of items) { if (!inWeek(it)) continue; const k = (it.category || 'geral').toLowerCase(); agg.set(k, (agg.get(k) || 0) + (Number(it.duration) || 0)); }
        ulCat.innerHTML = '';
        const rows = Array.from(agg.entries()).sort((a,b)=>b[1]-a[1]);
        if (rows.length === 0) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'Sem dados.'; ulCat.appendChild(li); }
        else { for (const [cat, min] of rows) { const li = document.createElement('li'); li.textContent = `${cat} · ${min} min`; ulCat.appendChild(li); } }
      }
      if (ulTrend) {
        const days = []; const today = new Date(); today.setHours(0,0,0,0);
        for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); const key = d.toISOString().slice(0,10); days.push({ key, total: 0 }); }
        for (const it of items) { const ts = new Date(it.ts || Date.now()); const k = ts.toISOString().slice(0,10); const idx = days.findIndex(x => x.key === k); if (idx >= 0) days[idx].total += Number(it.duration) || 0; }
        ulTrend.innerHTML = '';
        for (const d of days) { const li = document.createElement('li'); li.textContent = `${d.key} · ${d.total} min`; ulTrend.appendChild(li); }
      }
    },
    applyPrefs(prefs) {
      try {
        const root = document.documentElement;
        if (prefs?.theme === 'light') root.setAttribute('data-theme', 'light'); else root.removeAttribute('data-theme');
        const dens = prefs?.density === 'compact' ? 'compact' : 'cozy';
        root.setAttribute('data-density', dens);
        // Atualizar rótulos/estados dos botões
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
          const isLight = prefs?.theme === 'light';
          themeToggle.setAttribute('aria-pressed', String(isLight));
          themeToggle.title = `Tema: ${isLight ? 'Claro' : 'Escuro'}`;
          // Atualiza ícone sem remover o label
          const icon = themeToggle.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = isLight ? 'light_mode' : 'dark_mode';
        }
        const densityToggle = document.getElementById('densityToggle');
        if (densityToggle) {
          const isCompact = dens === 'compact';
          densityToggle.setAttribute('aria-pressed', String(isCompact));
          densityToggle.title = `Densidade: ${isCompact ? 'Compacto' : 'Conforto'}`;
          const icon = densityToggle.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = isCompact ? 'density_small' : 'density_medium';
        }
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
          // Não sobrescrever conteúdo (ícone + label). Atualiza apenas acessibilidade/estado.
          const isEn = prefs?.language === 'en';
          languageToggle.title = `Idioma: ${isEn ? 'EN' : 'PT'}`;
          languageToggle.setAttribute('aria-pressed', String(isEn));
        }
        // Aplicar seleção de filtro de atividades, se existir
        const actCat = document.getElementById('activitiesFilterCategory');
        if (actCat) {
          const current = (prefs?.filters?.activities?.category) || 'all';
          actCat.value = current;
        }
        const actInt = document.getElementById('activitiesFilterInterval');
        if (actInt) {
          const currentInt = (prefs?.filters?.activities?.interval) || 'all';
          actInt.value = currentInt;
        }
        // Missões: filtros status e tipo
        const mfStatus = document.getElementById('missionsFilterStatus');
        if (mfStatus) {
          const cur = (prefs?.filters?.missions?.status) || 'all';
          mfStatus.value = cur;
        }
        const mfType = document.getElementById('missionsFilterType');
        if (mfType) {
          const cur = (prefs?.filters?.missions?.type) || 'all';
          mfType.value = cur;
        }
      } catch (_) { /* noop */ }
    },
    bind() {
      this.els.addBtn = document.getElementById('addItemBtn');
      this.els.clearBtn = document.getElementById('clearDbBtn');
      this.els.list = document.getElementById('itemsList');
      this.els.year = document.getElementById('year');
      this.els.sidebarToggle = document.getElementById('sidebarToggle');
      this.els.sidebarBackdrop = document.querySelector('.sidebar-backdrop');
      this.els.missionsCounter = document.getElementById('missionsCounter');
      this.els.missionsList = document.getElementById('missionsList');
      this.els.activityForm = document.getElementById('activityForm');
      this.els.activityTitle = document.getElementById('activityTitle');
      this.els.activityCategory = document.getElementById('activityCategory');
      this.els.activityDuration = document.getElementById('activityDuration');
      this.els.activityTimestamp = document.getElementById('activityTimestamp');
      this.els.activityDifficulty = document.getElementById('activityDifficulty');
      this.els.activityNotes = document.getElementById('activityNotes');
      this.els.activityTags = document.getElementById('activityTags');
      this.els.activityDynamicFields = document.getElementById('activityDynamicFields');
      this.els.addActivityRepeatBtn = document.getElementById('addActivityRepeatBtn');
      this.els.activitySubmitMode = document.getElementById('activitySubmitMode');
      this.els.levelValue = document.getElementById('levelValue');
      this.els.xpText = document.getElementById('xpText');
      this.els.xpProgress = document.getElementById('xpProgress');
      this.els.statsByCategory = document.getElementById('statsByCategory');
      this.els.statsByDay = document.getElementById('statsByDay');
      this.els.achievementsList = document.getElementById('achievementsList');
      this.els.attributesBox = document.getElementById('attributesBox');
      this.els.timeByCategory = document.getElementById('timeByCategory');
      this.els.timeByDay = document.getElementById('timeByDay');
      this.els.activitiesFilterCategory = document.getElementById('activitiesFilterCategory');
      this.els.activitiesFilterInterval = document.getElementById('activitiesFilterInterval');
      // Mission filters
      this.els.missionsFilterStatus = document.getElementById('missionsFilterStatus');
      this.els.missionsFilterType = document.getElementById('missionsFilterType');
      // Presets manager (activities.html)
      this.els.presetForm = document.getElementById('presetForm');
      this.els.presetTitle = document.getElementById('presetTitle');
      this.els.presetCategory = document.getElementById('presetCategory');
      this.els.presetDuration = document.getElementById('presetDuration');
      this.els.presetsList = document.getElementById('presetsList');

      // Editors (activities.html)
      this.els.presetMetricsFields = document.getElementById('presetMetricsFields');
      this.els.addMetricFieldBtn = document.getElementById('addMetricFieldBtn');
      this.els.presetBaseUnitsTerms = document.getElementById('presetBaseUnitsTerms');
      this.els.addBaseUnitsTermBtn = document.getElementById('addBaseUnitsTermBtn');
      this.els.presetMetricsHint = document.getElementById('presetMetricsHint');
      this.els.presetMetricsSpec = document.getElementById('presetMetricsSpec');
      this.els.presetScoringJson = document.getElementById('presetScoringJson');

      // Padronizar selects de categoria conforme CATEGORY_MAP
      try { this.populateCategorySelect(this.els.presetCategory, true); } catch {}
      try { this.populateCategorySelect(this.els.activityCategory, true); } catch {}

      // Mostrar distribuição de atributos da categoria escolhida (CATEGORY_MAP)
      try {
        const infoEl = document.getElementById('presetCategoryInfo');
        const attrColor = (name) => {
          const map = {
            conhecimento: '#2563eb', // blue-600
            clareza: '#0ea5e9',       // sky-500
            vitalidade: '#16a34a',    // green-600
            resiliencia: '#065f46',   // emerald-800
            foco: '#9333ea',          // purple-600
            disciplina: '#ea580c',    // orange-600
            saude: '#059669',         // green-600
            social: '#db2777',        // pink-600
          };
          if (map[name]) return map[name];
          // Fallback: hash to hue
          let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
          const hue = h % 360;
          return `hsl(${hue} 70% 40%)`;
        };
        const pctFmt = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
        const renderCatInfo = () => {
          if (!infoEl || !this.els.presetCategory) return;
          const key = String(this.els.presetCategory.value || '').toLowerCase();
          const spec = CATEGORY_MAP[key];
          if (spec && typeof spec === 'object') {
            const entries = Object.entries(spec).filter(([,v]) => Number.isFinite(Number(v)) && Number(v) > 0);
            const total = entries.reduce((acc, [,v]) => acc + Number(v), 0) || 0;
            const parts = entries.map(([k, v]) => {
              const pct = total > 0 ? Number(v) / total : 0;
              const color = attrColor(k);
              return `<span class="badge me-1" style="background:${color};color:#fff" aria-label="${k} ${pctFmt.format(pct)}">${k} ${pctFmt.format(pct)}</span>`;
            });
            infoEl.innerHTML = parts.length ? parts.join('') : '';
          } else {
            infoEl.innerHTML = '';
          }
        };
        if (this.els.presetCategory) {
          this.els.presetCategory.addEventListener('change', renderCatInfo);
          // render inicial
          renderCatInfo();
        }
      } catch {}

      // Mostrar distribuição (badges) também para a categoria da atividade
      try {
        const infoEl2 = document.getElementById('activityCategoryInfo');
        const attrColor2 = (name) => {
          // Reusar a mesma lógica de cor definida acima
          const map = {
            conhecimento: '#2563eb',
            clareza: '#0ea5e9',
            vitalidade: '#16a34a',
            resiliencia: '#065f46',
            foco: '#9333ea',
            disciplina: '#ea580c',
            saude: '#059669',
            social: '#db2777',
          };
          if (map[name]) return map[name];
          let h = 0; for (let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) >>> 0;
          const hue = h % 360;
          return `hsl(${hue} 70% 40%)`;
        };
        const pctFmt2 = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });
        const renderActCatInfo = () => {
          if (!infoEl2 || !this.els.activityCategory) return;
          const key = String(this.els.activityCategory.value || '').toLowerCase();
          const spec = CATEGORY_MAP[key];
          if (spec && typeof spec === 'object') {
            const entries = Object.entries(spec).filter(([,v]) => Number.isFinite(Number(v)) && Number(v) > 0);
            const total = entries.reduce((acc, [,v]) => acc + Number(v), 0) || 0;
            const parts = entries.map(([k, v]) => {
              const pct = total > 0 ? Number(v) / total : 0;
              const color = attrColor2(k);
              return `<span class="badge me-1" style=\"background:${color};color:#fff\" aria-label=\"${k} ${pctFmt2.format(pct)}\">${k} ${pctFmt2.format(pct)}</span>`;
            });
            infoEl2.innerHTML = parts.length ? parts.join('') : '';
          } else {
            infoEl2.innerHTML = '';
          }
        };
        if (this.els.activityCategory) {
          this.els.activityCategory.addEventListener('change', renderActCatInfo);
          renderActCatInfo();
        }
      } catch {}

      // Filtros de atividades: categoria e intervalo
      if (this.els.activitiesFilterCategory) {
        this.els.activitiesFilterCategory.addEventListener('change', () => {
          const state = App.db.getState();
          const next = String(this.els.activitiesFilterCategory.value || 'all').toLowerCase();
          state.prefs = state.prefs || {};
          state.prefs.filters = state.prefs.filters || {};
          state.prefs.filters.activities = state.prefs.filters.activities || {};
          state.prefs.filters.activities.category = next;
          App.db.setState(state);
          this.renderList();
        });
      }
      if (this.els.activitiesFilterInterval) {
        this.els.activitiesFilterInterval.addEventListener('change', () => {
          const state = App.db.getState();
          const raw = String(this.els.activitiesFilterInterval.value || 'all').toLowerCase();
          const next = (raw === 'today' || raw === 'week' || raw === 'all') ? raw : 'all';
          state.prefs = state.prefs || {};
          state.prefs.filters = state.prefs.filters || {};
          state.prefs.filters.activities = state.prefs.filters.activities || {};
          state.prefs.filters.activities.interval = next;
          App.db.setState(state);
          this.renderList();
        });
      }

      // Filtros de missões: status e tipo
      if (this.els.missionsFilterStatus) {
        this.els.missionsFilterStatus.addEventListener('change', () => {
          const state = App.db.getState();
          const raw = String(this.els.missionsFilterStatus.value || 'all').toLowerCase();
          const next = (raw === 'pending' || raw === 'done' || raw === 'all') ? raw : 'all';
          state.prefs = state.prefs || {};
          state.prefs.filters = state.prefs.filters || {};
          state.prefs.filters.missions = state.prefs.filters.missions || {};
          state.prefs.filters.missions.status = next;
          App.db.setState(state);
          this.renderMissions();
          this.renderWeeklyMissions();
        });
      }
      if (this.els.missionsFilterType) {
        this.els.missionsFilterType.addEventListener('change', () => {
          const state = App.db.getState();
          const raw = String(this.els.missionsFilterType.value || 'all').toLowerCase();
          const next = (raw === 'daily' || raw === 'weekly' || raw === 'all') ? raw : 'all';
          state.prefs = state.prefs || {};
          state.prefs.filters = state.prefs.filters || {};
          state.prefs.filters.missions = state.prefs.filters.missions || {};
          state.prefs.filters.missions.type = next;
          App.db.setState(state);
          this.renderMissions();
          this.renderWeeklyMissions();
        });
      }

      if (this.els.year) {
        this.els.year.textContent = new Date().getFullYear();
      }

      // Preset form submission (configuration page)
      if (this.els.presetForm) {
        // Row builders
        const buildMetricFieldRow = (init = {}) => {
          const wrap = document.createElement('div');
          wrap.className = 'grid grid-4 gap-1 fieldset';
          wrap.innerHTML = `
            <div class="field"><input type="text" placeholder="nome (ex.: distancia)" data-k="name" /></div>
            <div class="field">
              <select data-k="type">
                <option value="number">Número</option>
                <option value="text">Texto</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            <div class="field"><input type="text" placeholder="rótulo" data-k="label" /></div>
            <div class="field"><input type="text" placeholder="placeholder / options (a,b,c)" data-k="placeholder" /></div>
            <div class="field inline"><label><input type="checkbox" data-k="required" /> Obrigatório</label></div>
            <div><button type="button" class="btn btn-ghost" data-action="remove">Remover</button></div>
          `;
          // init values
          wrap.querySelector('[data-k="name"]').value = init.name || '';
          wrap.querySelector('[data-k="type"]').value = init.type || 'number';
          wrap.querySelector('[data-k="label"]').value = init.label || '';
          wrap.querySelector('[data-k="placeholder"]').value = init.placeholder || '';
          if (init.required) wrap.querySelector('[data-k="required"]').checked = true;
          wrap.addEventListener('click', (ev) => { if (ev.target.closest('[data-action="remove"]')) wrap.remove(); });
          return wrap;
        };
        const buildBaseTermRow = (init = {}) => {
          const wrap = document.createElement('div');
          wrap.className = 'grid grid-4 gap-1 fieldset';
          wrap.innerHTML = `
            <div class="field"><input type="text" placeholder="campo (ex.: distancia)" data-k="field" /></div>
            <div class="field"><input type="number" step="0.01" placeholder="peso (ex.: 1)" data-k="weight" /></div>
            <div class="field"><input type="number" step="0.01" placeholder="min (opcional)" data-k="min" /></div>
            <div class="field"><input type="number" step="0.01" placeholder="max (opcional)" data-k="max" /></div>
            <div><button type="button" class="btn btn-ghost" data-action="remove">Remover</button></div>
          `;
          wrap.querySelector('[data-k="field"]').value = init.field || '';
          wrap.querySelector('[data-k="weight"]').value = (init.weight ?? '');
          if (init.min != null) wrap.querySelector('[data-k="min"]').value = init.min;
          if (init.max != null) wrap.querySelector('[data-k="max"]').value = init.max;
          wrap.addEventListener('click', (ev) => { if (ev.target.closest('[data-action="remove"]')) wrap.remove(); });
          return wrap;
        };
        // (pontuação removida)

        // Bind add buttons
        if (this.els.addMetricFieldBtn && this.els.presetMetricsFields) {
          this.els.addMetricFieldBtn.addEventListener('click', () => {
            this.els.presetMetricsFields.appendChild(buildMetricFieldRow());
          });
        }
        if (this.els.addBaseUnitsTermBtn && this.els.presetBaseUnitsTerms) {
          this.els.addBaseUnitsTermBtn.addEventListener('click', () => {
            this.els.presetBaseUnitsTerms.appendChild(buildBaseTermRow());
          });
        }
        // (controles de pontuação removidos)

        this.els.presetForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = this.els.presetForm;
          // Over-form notice: clear previous
          ui.dismissOverFormCard();
          // Clear previous errors
          [this.els.presetTitle, this.els.presetCategory, this.els.presetDuration].forEach(el => this.clearInlineError(el));
          const title = (this.els.presetTitle?.value || '').trim();
          const category = (this.els.presetCategory?.value || '').trim();
          const durationRaw = (this.els.presetDuration?.value || '').trim();
          const duration = parseInt(durationRaw || '0', 10);
          const cats = this.getCategoryList();
          let hasError = false;
          if (!title) { this.showInlineError(this.els.presetTitle, 'Informe um título.'); hasError = true; }
          if (!category || !cats.includes(category.toLowerCase())) { this.showInlineError(this.els.presetCategory, 'Escolha uma categoria válida.'); hasError = true; }
          if (durationRaw && (isNaN(duration) || duration < 0)) { this.showInlineError(this.els.presetDuration, 'Use um número inteiro ≥ 0.'); hasError = true; }
          if (hasError) { (this.els.presetTitle || form).focus(); return; }

          // Serialize editors into hidden textareas
          const fields = [];
          if (this.els.presetMetricsFields) {
            const rows = Array.from(this.els.presetMetricsFields.querySelectorAll('.fieldset'));
            for (const r of rows) {
              const name = (r.querySelector('[data-k="name"]')?.value || '').trim();
              if (!name) continue;
              const type = (r.querySelector('[data-k="type"]')?.value || 'number').trim();
              const label = (r.querySelector('[data-k="label"]')?.value || '').trim();
              const ph = (r.querySelector('[data-k="placeholder"]')?.value || '').trim();
              const req = !!r.querySelector('[data-k="required"]')?.checked;
              const node = { name, type, label, placeholder: ph, required: req };
              if (type === 'select' && ph) {
                node.options = ph.split(',').map(s=>s.trim()).filter(Boolean);
              }
              fields.push(node);
            }
          }
          const terms = [];
          if (this.els.presetBaseUnitsTerms) {
            const rows = Array.from(this.els.presetBaseUnitsTerms.querySelectorAll('.fieldset'));
            for (const r of rows) {
              const fieldName = (r.querySelector('[data-k="field"]')?.value || '').trim();
              const weight = Number(r.querySelector('[data-k="weight"]')?.value || '');
              if (!fieldName || !Number.isFinite(weight)) continue;
              const minStr = (r.querySelector('[data-k="min"]')?.value || '').trim();
              const maxStr = (r.querySelector('[data-k="max"]')?.value || '').trim();
              const term = { field: fieldName, weight };
              if (minStr !== '') term.min = Number(minStr);
              if (maxStr !== '') term.max = Number(maxStr);
              terms.push(term);
            }
          }
          const hint = (this.els.presetMetricsHint?.value || '').trim();
          const metricsSpecObj = (fields.length || terms.length || hint)
            ? { fields: fields.length ? fields : [], baseUnits: terms.length ? { terms } : undefined, hint: hint || undefined }
            : null;

          // Optional: scoring JSON (type-based attr weights and caps)
          let scoringObj = null;
          try {
            const raw = (this.els.presetScoringJson?.value || '').trim();
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object' && typeof parsed.typeField === 'string' && Array.isArray(parsed.options)) {
                scoringObj = { typeField: parsed.typeField, options: parsed.options };
              }
            }
          } catch (err) {
            console.warn('[preset] scoring JSON inválido, ignorando', err);
          }

          if (this.els.presetMetricsSpec) this.els.presetMetricsSpec.value = metricsSpecObj ? JSON.stringify(metricsSpecObj) : '';

        });
        // clear inline error on user edits
        const clr = (el) => el && el.addEventListener('input', () => this.clearInlineError(el));
        clr(this.els.presetTitle);
        clr(this.els.presetCategory);
        clr(this.els.presetDuration);
        // Delegated Edit handler: prefill form from selected preset (remote or local)
        if (this.els.presetsList) {
          this.els.presetsList.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="edit-preset"]');
            if (!btn) return;
            const id = Number(btn.getAttribute('data-id'));
            if (!Number.isFinite(id)) return;
            const li = btn.closest('li.preset-item');
            const source = li?.dataset?.source || 'local';
            const visibility = li?.dataset?.visibility || 'general';
            const ownerId = li?.dataset?.ownerId || '';
            // Prefer last rendered list (contains remote too)
            let pr = null;
            try {
              const list = (this.cache && Array.isArray(this.cache.managerPresets)) ? this.cache.managerPresets : [];
              pr = list.find(p => Number(p.id) === id);
            } catch {}
            if (!pr) {
              const state = App.db.getState();
              pr = (state.presets || []).find(p => p.id === id) || null;
            }
            if (!pr) return;

            // Ensure the form is visible inside the overpage
            try {
              document.getElementById('openPresetOverpage')?.click();
              const titleEl = document.getElementById('presetOverpageTitle');
              if (titleEl) titleEl.textContent = 'Editar Preset';
              const submit = document.getElementById('addPresetBtn');
              if (submit) submit.querySelector('span:last-child').textContent = 'Salvar Preset';
            } catch {}

            // Basic fields
            if (this.els.presetTitle) this.els.presetTitle.value = pr.title || '';
            if (this.els.presetCategory) this.els.presetCategory.value = pr.category || '';
            if (this.els.presetDuration) this.els.presetDuration.value = String(Number(pr.duration) || 0);
            try {
              const vis = (pr.visibility === 'personal' || pr.visibility === 'general') ? pr.visibility : 'general';
              const gen = this.els.presetForm.querySelector('#presetVisibilityGeneral');
              const per = this.els.presetForm.querySelector('#presetVisibilityPersonal');
              if (vis === 'general' && gen) gen.checked = true;
              if (vis === 'personal' && per) per.checked = true;
            } catch {}

            // Metrics spec editors
            if (this.els.presetMetricsFields) this.els.presetMetricsFields.innerHTML = '';
            if (this.els.presetBaseUnitsTerms) this.els.presetBaseUnitsTerms.innerHTML = '';
            if (this.els.presetMetricsHint) this.els.presetMetricsHint.value = '';
            if (pr.metricsSpec && typeof pr.metricsSpec === 'object') {
              const fs = Array.isArray(pr.metricsSpec.fields) ? pr.metricsSpec.fields : [];
              for (const f of fs) {
                try { this.els.presetMetricsFields.appendChild(buildMetricFieldRow(f)); } catch {}
              }
              const bu = pr.metricsSpec.baseUnits && Array.isArray(pr.metricsSpec.baseUnits.terms) ? pr.metricsSpec.baseUnits.terms : [];
              for (const t of bu) {
                try { this.els.presetBaseUnitsTerms.appendChild(buildBaseTermRow(t)); } catch {}
              }
              if (this.els.presetMetricsHint && typeof pr.metricsSpec.hint === 'string') this.els.presetMetricsHint.value = pr.metricsSpec.hint;
              if (this.els.presetMetricsSpec) this.els.presetMetricsSpec.value = JSON.stringify(pr.metricsSpec);
            } else {
              if (this.els.presetMetricsSpec) this.els.presetMetricsSpec.value = '';
            }

            // Scoring JSON
            if (this.els.presetScoringJson) {
              try { this.els.presetScoringJson.value = pr.scoring ? JSON.stringify(pr.scoring) : ''; } catch { this.els.presetScoringJson.value = ''; }
            }

            // Mark edit mode on form
            try {
              if (this.els.presetForm) {
                this.els.presetForm.dataset.editing = 'true';
                this.els.presetForm.dataset.presetId = String(id);
                this.els.presetForm.dataset.source = source;
                this.els.presetForm.dataset.visibility = visibility;
                if (ownerId) this.els.presetForm.dataset.ownerId = ownerId; else delete this.els.presetForm.dataset.ownerId;
              }
            } catch {}

            // Focus form
            try { this.els.presetTitle?.focus(); } catch {}
            try { this.els.presetForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
          });
        }
      }

      // Delete preset delegation
      if (this.els.presetsList) {
        this.els.presetsList.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="delete-preset"]');
          if (!btn) return;
          const id = Number(btn.getAttribute('data-id'));
          if (!Number.isFinite(id)) return;
          const li = btn.closest('li.preset-item');
          const source = li?.dataset?.source || 'local';
          const visibility = li?.dataset?.visibility || 'general';
          const ownerId = li?.dataset?.ownerId || '';
          const me = (App.auth?.getSession && App.auth.getSession()?.user?.id) ? String(App.auth.getSession().user.id) : null;

          const doRerender = () => { this.renderPresetsManager(); this.renderActivityPresets(); };

          if (source === 'remote') {
            // Build endpoint: general -> /api/activities, personal(mine) -> /api/activities/:userId
            if (visibility === 'personal') {
              if (!ownerId || !me || ownerId !== me) {
                alert('Você não pode excluir o preset pessoal de outro usuário.');
                return;
              }
            }
            const base = visibility === 'personal' ? `/api/activities/${encodeURIComponent(ownerId)}` : '/api/activities';
            const url = `${base}?id=${encodeURIComponent(String(id))}`;
            fetch(url, { method: 'DELETE' })
              .then(res => {
                if (!res.ok) throw new Error('DELETE falhou');
                return res.json().catch(() => ({}));
              })
              .then(() => doRerender())
              .catch(() => alert('Falha ao excluir preset da API.'));
            return;
          }

          // Local preset
          try { App.db.removePreset(id); } catch {}
          doRerender();
        });
      }

      // Activity form submission
      if (this.els.activityForm) {
        this.els.activityForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const title = (this.els.activityTitle?.value || '').trim();
          const categoryRaw = (this.els.activityCategory?.value || '').trim();
          const category = categoryRaw ? normalizeCategory(categoryRaw) : null;
          const duration = parseInt(this.els.activityDuration?.value || '0', 10) || 0;
          if (!title) return;
          const tsInput = (this.els.activityTimestamp?.value || '').trim();
          const ts = tsInput ? new Date(tsInput).toISOString() : new Date().toISOString();
          const rawDiff = (this.els.activityDifficulty?.value || 'normal').trim().toLowerCase();
          const difficulty = (rawDiff === 'desafiador' || rawDiff === 'extremo') ? rawDiff : 'normal';
          const notes = (this.els.activityNotes?.value || '').trim();
          const tagsRaw = (this.els.activityTags?.value || '').trim();
          const tags = tagsRaw ? tagsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
          // Regra XP simples por atividade: 1 XP por minuto, mínimo 10
          const xp = Math.max(10, duration);
          const activity = { id: Date.now(), title, category, duration, ts, xp, difficulty, notes, tags };
          // Dynamic preset overrides
          try {
            const form = this.els.activityForm;
            const presetIdStr = form?.dataset?.presetId || '';
            const presetId = presetIdStr ? Number(presetIdStr) : null;
            if (presetId) {
              const state0 = App.db.getState();
              const pr = (state0.presets || []).find(p => p.id === presetId);
              if (pr && pr.metricsSpec) {
                const values = {};
                const box = this.els.activityDynamicFields;
                if (box && pr.metricsSpec.fields && Array.isArray(pr.metricsSpec.fields)) {
                  // Inline validation for dynamic fields
                  let dynError = false;
                  for (const f of pr.metricsSpec.fields) {
                    const el = box.querySelector(`[name="dyn_${f.name}"]`);
                    if (!el) continue;
                    // clear previous errors
                    try { this.clearInlineError(el); } catch {}
                    if (f.type === 'number') {
                      const num = Number(el.value);
                      if (f.required && (el.value === '' || !Number.isFinite(num))) {
                        this.showInlineError(el, 'Informe um número válido.');
                        dynError = true;
                      }
                      values[f.name] = Number.isFinite(num) ? num : 0;
                    } else if (f.type === 'select') {
                      const v = (el.value || '').trim();
                      if (f.required && !v) { this.showInlineError(el, 'Selecione um valor.'); dynError = true; }
                      values[f.name] = v;
                    } else {
                      const v = (el.value || '').trim();
                      if (f.required && !v) { this.showInlineError(el, 'Campo obrigatório.'); dynError = true; }
                      values[f.name] = v;
                    }
                  }
                  if (dynError) return; // abort submit
                }
                // Compute baseUnits if terms configured
                let baseUnits = 0;
                if (pr.metricsSpec.baseUnits && Array.isArray(pr.metricsSpec.baseUnits.terms)) {
                  baseUnits = pr.metricsSpec.baseUnits.terms.reduce((acc, t) => {
                    let v = Number(values[t.field]) || 0;
                    if (typeof t.min === 'number') v = Math.max(v, t.min);
                    if (typeof t.max === 'number') v = Math.min(v, t.max);
                    const w = Number(t.weight) || 0;
                    return acc + (v * w);
                  }, 0);
                }
                // Base units rely solely on configured terms; no impact multiplier
                if (baseUnits > 0) {
                  activity.baseUnits = baseUnits;
                }
              }
              // Scoring/attrWeights via preset.scoring (type-based)
              try {
                const scoring = pr && pr.scoring;
                if (scoring && typeof scoring.typeField === 'string' && Array.isArray(scoring.options)) {
                  const selectedType = values[scoring.typeField];
                  const opt = scoring.options.find(o => (o && o.value) === selectedType);
                  if (opt && opt.weights && typeof opt.weights === 'object') {
                    activity.attrWeights = opt.weights;
                    if (opt.caps && typeof opt.caps === 'object') activity.attrCaps = opt.caps;
                  } else if (opt && opt.rebalance && typeof opt.rebalance === 'object') {
                    // New: rebalance mode
                    // Start from base category weights (CATEGORY_MAP)
                    const catKey = (category || '').toLowerCase();
                    const base = (CATEGORY_MAP[catKey] && typeof CATEGORY_MAP[catKey] === 'object') ? { ...CATEGORY_MAP[catKey] } : {};
                    const rb = opt.rebalance;
                    const target = String(rb.addTo || '').trim();
                    // Determine addPercent from UI override if provided; default 0.10 when omitted
                    let uiAddPct = null;
                    try {
                      const uiEl = box ? box.querySelector('#dyn_rebalance_addPercent') : null;
                      if (uiEl && uiEl.value !== '') {
                        const uiNum = Number(uiEl.value);
                        if (Number.isFinite(uiNum)) uiAddPct = Math.max(0, uiNum) / 100; // convert % to fraction
                      }
                    } catch {}
                    const addPct = (uiAddPct == null)
                      ? ((rb.addPercent == null) ? 0.10 : Math.max(0, Math.min(1, Number(rb.addPercent) || 0)))
                      : Math.max(0, Math.min(1, uiAddPct));
                    const maxPct = (rb.maxPercent == null) ? null : Math.max(0, Math.min(1, Number(rb.maxPercent) || 0));
                    const donors = Array.isArray(rb.donors) && rb.donors.length ? rb.donors.slice() : Object.keys(base).filter(k => k !== target);
                    if (target && addPct > 0 && Object.keys(base).length > 0 && donors.length > 0) {
                      // ensure target exists in base
                      if (!base[target]) base[target] = 0;
                      const currentT = Number(base[target]) || 0;
                      const capRoom = (maxPct == null) ? addPct : Math.max(0, Math.min(addPct, Math.max(0, maxPct - currentT)));
                      let effectiveAdd = capRoom;
                      // Sum donors current weights
                      const donorSum = donors.reduce((acc, d) => acc + (Number(base[d]) || 0), 0);
                      if (donorSum <= 0) {
                        // no donor budget; cannot add
                        effectiveAdd = 0;
                      }
                      // Apply proportional take from donors
                      if (effectiveAdd > 0) {
                        for (const d of donors) {
                          const w = Number(base[d]) || 0;
                          const red = donorSum > 0 ? effectiveAdd * (w / donorSum) : 0;
                          base[d] = Math.max(0, w - red);
                        }
                        base[target] = currentT + effectiveAdd;
                      }
                      activity.attrWeights = base;
                      // Optional: set cap for target per maxPercent
                      if (maxPct != null) {
                        activity.attrCaps = Object.assign({}, activity.attrCaps || {});
                        activity.attrCaps[target] = maxPct;
                      }
                    }
                  }
                }
              } catch {}
            }
          } catch {}
          const state = App.db.getState();
          state.items = state.items || [];
          state.items.unshift(activity);
          App.db.applyXP(state, xp);
          // aplicar engine de atributos para a nova atividade
          try { engine.ensureAttrState(state); engine.applyActivity(state, activity); } catch {}
          App.db.setState(state);
          // reset UI
          const repeat = (this.els.activitySubmitMode?.value || '') === 'repeat';
          if (repeat) {
            if (this.els.activityDuration) this.els.activityDuration.value = '';
            if (this.els.activityTimestamp) this.els.activityTimestamp.value = '';
            if (this.els.activityNotes) this.els.activityNotes.value = '';
            if (this.els.activityTags) this.els.activityTags.value = '';
            if (this.els.activityDynamicFields) this.els.activityDynamicFields.innerHTML = '';
            if (this.els.activityForm) delete this.els.activityForm.dataset.presetId;
            // manter título e categoria; focar duração
            this.els.activityDuration?.focus();
          } else {
            if (this.els.activityTitle) this.els.activityTitle.value = '';
            if (this.els.activityCategory) this.els.activityCategory.value = '';
            if (this.els.activityDuration) this.els.activityDuration.value = '';
            if (this.els.activityTimestamp) this.els.activityTimestamp.value = '';
            if (this.els.activityNotes) this.els.activityNotes.value = '';
            if (this.els.activityTags) this.els.activityTags.value = '';
            if (this.els.activityDifficulty) this.els.activityDifficulty.value = 'normal';
            if (this.els.activityDynamicFields) this.els.activityDynamicFields.innerHTML = '';
            if (this.els.activityForm) delete this.els.activityForm.dataset.presetId;
            this.els.activityTitle?.focus();
          }
          if (this.els.activitySubmitMode) this.els.activitySubmitMode.value = '';
          this.renderList();
          this.renderActivityFilters();
          this.renderStats();
          this.renderBasicStats();
          this.renderWeeklyMetrics();
          this.renderStreak();
          this.renderWeeklyStreak();
          this.renderAttributes();
        });
        // Salvar e repetir: mantém título/categoria e reseta demais campos
        if (this.els.addActivityRepeatBtn) {
          this.els.addActivityRepeatBtn.addEventListener('click', () => {
            if (this.els.activitySubmitMode) this.els.activitySubmitMode.value = 'repeat';
            this.els.activityForm.requestSubmit();
          });
        }
      }

      if (this.els.clearBtn) {
        this.els.clearBtn.addEventListener('click', () => {
          if (confirm('Tem certeza que deseja limpar os dados?')) {
            App.db.clear();
            this.renderList();
            this.renderActivityFilters();
            this.renderMissions();
            this.renderWeeklyMissions();
            this.renderStats();
            this.renderBasicStats();
            this.renderHeatmap();
            this.renderAchievements();
            this.renderAttributes();
            this.renderWeeklyMetrics();
            this.renderWeeklyStreak();
          }
        });
      }

      // Sidebar overlay: toggle/open/close handled via delegated listeners below
      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSidebarOpen()) closeSidebar();
      });
      // Delegated handlers for sidebar quick-action toggles and sidebar overlay (works even if loaded later)
      document.addEventListener('click', (ev) => {
        const hit = ev.target.closest('#sidebarToggle, .sidebar-backdrop, #themeToggle, #densityToggle, #languageToggle');
        if (!hit) return;
        const state = App.db.getState();
        if (hit.matches('#sidebarToggle')) {
          toggleSidebar();
          return;
        }
        if (hit.matches('.sidebar-backdrop')) {
          closeSidebar();
          return;
        }
        if (hit.matches('#themeToggle')) {
          const nextTheme = state.prefs.theme === 'light' ? 'dark' : 'light';
          state.prefs.theme = nextTheme;
          App.db.setState(state);
          this.applyPrefs(state.prefs);
          return;
        }
        if (hit.matches('#densityToggle')) {
          const next = state.prefs.density === 'compact' ? 'cozy' : 'compact';
          state.prefs.density = next;
          App.db.setState(state);
          this.applyPrefs(state.prefs);
          return;
        }
        if (hit.matches('#languageToggle')) {
          const nextLang = state.prefs.language === 'en' ? 'pt' : 'en';
          state.prefs.language = nextLang;
          App.db.setState(state);
          this.applyPrefs(state.prefs);
          this.renderStreak();
          this.renderWeeklyStreak();
          this.renderWeeklyMetrics();
          return;
        }
      });
      // Reaplicar preferências após carregamento dinâmico de componentes (header/sidebar)
      document.addEventListener('components:loaded', () => {
        try { this.applyPrefs(App.db.getState().prefs); } catch {}
        // After header/sidebar load, also render presets into app quick actions
        try { this.renderActivityPresets(); } catch {}
      });
      // Close on resize to large screens (safety)
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (window.innerWidth >= 900) closeSidebar(); }, 150);
      });

      // Highlight active nav link + close sidebar on click (UX mobile)
      const navLinks = document.querySelectorAll('.nav-list a[href]');
      if (navLinks && navLinks.length) {
        const here = window.location.pathname;
        navLinks.forEach(a => {
          try {
            const url = new URL(a.getAttribute('href'), window.location.origin);
            if (url.pathname === here) a.classList.add('active');
          } catch (_) { /* ignore invalid href */ }
          a.addEventListener('click', () => { if (isSidebarOpen()) closeSidebar(); });
        });
      }

      // Delegação para concluir missão
      if (this.els.missionsList) {
        this.els.missionsList.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="complete-mission"]');
          if (!btn) return;
          const id = Number(btn.getAttribute('data-id'));
          if (!Number.isFinite(id)) return;
          App.db.completeDailyMission(id);
          this.renderMissions();
          this.renderStats();
          this.renderAchievements();
        });
      }

      // Weekly missions delegation
      const weeklyList = document.getElementById('weeklyMissionsList');
      if (weeklyList) {
        weeklyList.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="complete-weekly-mission"]');
          if (!btn) return;
          const id = Number(btn.getAttribute('data-id'));
          if (!Number.isFinite(id)) return;
          App.db.completeWeeklyMission(id);
          this.renderWeeklyMissions();
          this.renderStats();
          this.renderAchievements();
          this.renderWeeklyMetrics();
        });
      }

      // Activity presets
      const presets = document.getElementById('activityPresets');
      if (presets) {
        // Ensure dynamic presets are rendered once on load
        try { this.renderActivityPresets(); } catch {}
        presets.addEventListener('click', (e) => {
          const btn = e.target.closest('button[data-preset-title]');
          if (!btn) return;
          const title = btn.getAttribute('data-preset-title') || '';
          const category = btn.getAttribute('data-preset-category') || '';
          const duration = btn.getAttribute('data-preset-duration') || '';
          const presetId = btn.getAttribute('data-preset-id');
          // preencher formulário
          if (this.els.activityTitle) this.els.activityTitle.value = `${title} ${duration}m`;
          if (this.els.activityCategory) this.els.activityCategory.value = category;
          if (this.els.activityDuration) this.els.activityDuration.value = duration;
          // vincular preset selecionado e renderizar campos dinâmicos
          if (presetId && this.els.activityForm) {
            this.els.activityForm.dataset.presetId = presetId;
            try { this.renderDynamicFieldsForPresetId(Number(presetId)); } catch {}
          } else {
            // limpar se botão hardcoded sem id
            if (this.els.activityDynamicFields) this.els.activityDynamicFields.innerHTML = '';
            if (this.els.activityForm) delete this.els.activityForm.dataset.presetId;
          }
          // focar submit para confirmar rápido
          const form = this.els.activityForm;
          const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
          submitBtn?.focus();
        });
      }

      // Initial renders for pages that have these sections
      try { this.renderPresetsManager(); } catch {}
      try { this.renderActivityPresets(); } catch {}

      // Exportar JSON
      const exportBtn = document.getElementById('exportJsonBtn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => {
          const state = App.db.getState();
          const data = JSON.stringify(state, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const ts = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const name = `personal-leveling-backup-${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}.json`;
          a.href = url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
      }

      // Importar JSON
      const importBtn = document.getElementById('importJsonBtn');
      const importInput = document.getElementById('importJsonInput');
      if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', async () => {
          const file = importInput.files && importInput.files[0];
          if (!file) return;
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            // Validação básica
            if (typeof parsed !== 'object' || parsed === null) throw new Error('JSON inválido.');
            if (!Array.isArray(parsed.items)) parsed.items = [];
            if (typeof parsed.stats !== 'object' || parsed.stats === null) parsed.stats = { xp: 0 };
            if (typeof parsed.missions !== 'object' || parsed.missions === null) parsed.missions = { daily: [], weekly: [] };
            if (!Array.isArray(parsed.missions.daily)) parsed.missions.daily = [];
            if (!Array.isArray(parsed.missions.weekly)) parsed.missions.weekly = [];
            if (!Array.isArray(parsed.presets)) parsed.presets = [];
            const proceed = window.confirm('Importar dados substituirá o estado atual. Deseja continuar?');
            if (!proceed) return;
            // Normalização simples dos itens
            parsed.items = parsed.items.map(it => ({
              id: it.id ?? Date.now(),
              title: String(it.title || 'Sem título'),
              category: it.category ?? null,
              duration: Number(it.duration) || 0,
              ts: it.ts || Date.now(),
              xp: Number(it.xp) || 0,
            }));
            // Normalização de presets, preservando visibilidade e proprietário
            parsed.presets = parsed.presets.map(p => ({
              id: p.id ?? Date.now(),
              title: String(p.title || 'Sem título'),
              category: p.category || '',
              duration: Number(p.duration) || 0,
              visibility: (p.visibility === 'personal' || p.visibility === 'general') ? p.visibility : 'general',
              ownerId: p.ownerId ? String(p.ownerId) : null,
            }));
            // Recalcular nível a partir do XP existente e preservar/usar prefs do arquivo (ou padrão)
            const prefs = parsed.prefs && typeof parsed.prefs === 'object' ? { theme: parsed.prefs.theme || 'dark', density: parsed.prefs.density || 'cozy' } : App.db.getState().prefs || { theme: 'dark', density: 'cozy' };
            const state = { items: parsed.items, stats: { xp: Number(parsed.stats.xp) || 0 }, missions: parsed.missions, prefs, presets: parsed.presets };
            App.db.recalcLevel(state);
            // reconstruir progresso de atributos com base nos itens importados
            try { engine.ensureAttrState(state); engine.rebuildFromItems(state); } catch {}
            App.db.setState(state);
            // Limpar seleção do input
            importInput.value = '';
            // Re-render
            this.renderList();
            this.renderStats();
            this.renderBasicStats();
            this.renderMissions();
            this.renderWeeklyMissions();
            this.renderHeatmap();
            this.applyPrefs(state.prefs);
            this.renderStreak();
            this.renderWeeklyStreak();
            this.renderWeeklyMetrics();
            this.renderAttributes();
            // Re-render presets UIs
            this.renderPresetsManager();
            this.renderActivityPresets();
          } catch (err) {
            console.error('Falha ao importar JSON:', err);
          }
        });
      }

      // Delegação para excluir atividade
      if (this.els.list) {
        this.els.list.addEventListener('click', (e) => {
          const delBtn = e.target.closest('[data-action="delete-activity"]');
          if (delBtn) {
            const id = Number(delBtn.getAttribute('data-id'));
            if (!Number.isFinite(id)) return;
            const removed = App.db.removeItem(id);
            if (removed) {
              const state = App.db.getState();
              const dec = Number(removed.xp) || 0;
              state.stats.xp = Math.max(0, (state.stats.xp || 0) - dec);
              App.db.recalcLevel(state);
              // reconstruir atributos após remoção
              try { engine.ensureAttrState(state); engine.rebuildFromItems(state); } catch {}
              App.db.setState(state);
              this.renderList();
              this.renderActivityFilters();
              this.renderMissions();
              this.renderWeeklyMissions();
              this.renderStats();
              this.renderBasicStats();
              this.renderWeeklyMetrics();
              this.renderStreak();
              this.renderWeeklyStreak();
              this.renderAttributes();
            }
            return;
          }

          // Entrar em modo de edição inline
          const editBtn = e.target.closest('[data-action="edit-activity"]');
          if (editBtn) {
            const id = Number(editBtn.getAttribute('data-id'));
            if (!Number.isFinite(id)) return;
            const state = App.db.getState();
            const it = (state.items || []).find(x => x.id === id);
            if (!it) return;
            const card = editBtn.closest('.card');
            if (!card) return;
            const cat = it.category || '';
            const dur = Number(it.duration) || 0;
            card.innerHTML = `
              <h3>Edição</h3>
              <div class="grid-3 mt-6">
                <label>
                  <span class="muted">Título</span>
                  <input type="text" data-field="title" value="${it.title.replace(/"/g, '&quot;')}" />
                </label>
                <label>
                  <span class="muted">Categoria</span>
                  <input type="text" data-field="category" value="${cat.replace(/"/g, '&quot;')}" />
                </label>
                <label>
                  <span class="muted">Duração (min)</span>
                  <input type="number" min="1" step="1" data-field="duration" value="${dur}" />
                </label>
              </div>
              <div class="actions mt-6">
                <button class="btn" data-action="save-activity" data-id="${id}">Salvar</button>
                <button class="btn btn-ghost" data-action="cancel-edit" data-id="${id}">Cancelar</button>
              </div>
            `;
            return;
          }

          // Salvar edição
          const saveBtn = e.target.closest('[data-action="save-activity"]');
          if (saveBtn) {
            const id = Number(saveBtn.getAttribute('data-id'));
            if (!Number.isFinite(id)) return;
            const card = saveBtn.closest('.card');
            if (!card) return;
            const q = sel => card.querySelector(sel);
            const title = (q('input[data-field="title"]')?.value || '').trim();
            const category = (q('input[data-field="category"]')?.value || '').trim() || null;
            const duration = Math.max(0, parseInt(q('input[data-field="duration"]')?.value || '0', 10) || 0);
            const state = App.db.getState();
            const current = (state.items || []).find(x => x.id === id);
            if (!current) return;
            const oldXP = Number(current.xp) || 0;
            // regra xp: 1 por minuto, mínimo 10
            const newXP = Math.max(10, duration);
            const updated = App.db.updateItem(id, { title: title || current.title, category, duration, xp: newXP });
            if (updated) {
              const delta = newXP - oldXP;
              state.stats.xp = Math.max(0, (state.stats.xp || 0) + delta);
              App.db.recalcLevel(state);
              // reconstruir atributos após edição para refletir mudanças
              try { engine.ensureAttrState(state); engine.rebuildFromItems(state); } catch {}
              App.db.setState(state);
              this.renderList();
              this.renderActivityFilters();
              this.renderStats();
              this.renderBasicStats();
              this.renderAttributes();
            }
            return;
          }

          // Cancelar edição
          const cancelBtn = e.target.closest('[data-action="cancel-edit"]');
          if (cancelBtn) {
            this.renderList();
            return;
          }
        });
      }

      // Preferências: tema, densidade e idioma são tratados via delegação acima

      // Atalhos de formulário de atividade
      document.addEventListener('keydown', (ev) => {
        const form = this.els.activityForm || document.getElementById('activityForm');
        if (!form) return;
        // Ctrl+Shift+A foca o campo título
        if (ev.ctrlKey && ev.shiftKey && (ev.key === 'A' || ev.key === 'a')) {
          ev.preventDefault();
          const titleInput = form.querySelector('input[name="title"], #activityTitle');
          if (titleInput) titleInput.focus();
        }
        // Ctrl+Enter envia o formulário quando o foco está dentro do form
        const isInsideForm = document.activeElement && form.contains(document.activeElement);
        if (isInsideForm && ev.ctrlKey && (ev.key === 'Enter')) {
          ev.preventDefault();
          form.requestSubmit ? form.requestSubmit() : form.submit();
        }
      });
    },
    renderActivityFilters() {
      const sel = document.getElementById('activitiesFilterCategory');
      if (!sel) return;
      const state = App.db.getState();
      const current = (state.prefs?.filters?.activities?.category) || 'all';
      // Use canonical categories from CATEGORY_MAP (normalized)
      const canonical = Object.keys(CATEGORY_MAP).sort();
      // Recria opções
      sel.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = 'all';
      optAll.textContent = 'Todas';
      sel.appendChild(optAll);
      for (const c of canonical) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c.charAt(0).toUpperCase() + c.slice(1);
        sel.appendChild(opt);
      }
      // Aplicar seleção atual (fallback para 'all')
      sel.value = (current === 'all' || canonical.includes(current)) ? current : 'all';

      // Intervalo: apenas ajusta o valor conforme prefs (opções fixas no HTML)
      const selInt = document.getElementById('activitiesFilterInterval');
      if (selInt) {
        const currentInt = (state.prefs?.filters?.activities?.interval) || 'all';
        selInt.value = (currentInt === 'today' || currentInt === 'week' || currentInt === 'all') ? currentInt : 'all';
      }
    },
    renderList() {
      const list = document.getElementById('itemsList');
      if (!list) return; // nothing to render on this page
      const state = App.db.getState();
      const items = state.items || [];
      const currentCat = (state.prefs?.filters?.activities?.category) || 'all';
      const currentInt = (state.prefs?.filters?.activities?.interval) || 'all';
      // Filtra por categoria
      let filtered = currentCat === 'all' ? items : items.filter(it => {
        const k = normalizeCategory(it.category || '');
        return k === currentCat;
      });
      // Filtra por intervalo
      if (currentInt === 'today') {
        const today = getToday();
        filtered = filtered.filter(it => {
          const d = new Date(it.ts || Date.now());
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}` === today;
        });
      } else if (currentInt === 'week') {
        const ws = getIsoWeekStart();
        filtered = filtered.filter(it => {
          const d = new Date(it.ts || Date.now());
          d.setHours(0,0,0,0);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const key = `${y}-${m}-${dd}`;
          return key >= ws; // mesma ordem lexicográfica por formato yyyy-mm-dd
        });
      }
      list.innerHTML = '';
      if (filtered.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'Sem itens ainda. Adicione o primeiro!';
        empty.className = 'muted';
        list.appendChild(empty);
        this.renderStreak();
        return;
      }
      for (const it of filtered.slice(0, 10)) {
        const card = document.createElement('div');
        card.className = 'card';
        const when = it.ts ? new Date(it.ts).toLocaleString() : '';
        const catNorm = normalizeCategory(it.category || '') || 'geral';
        const catLabel = catNorm ? (catNorm.charAt(0).toUpperCase() + catNorm.slice(1)) : 'Geral';
        const meta = [catLabel, it.duration ? `${it.duration} min` : null, it.xp ? `${it.xp} XP` : null].filter(Boolean).join(' · ');
        card.innerHTML = `
          <h3>${it.title}</h3>
          <p class="muted">${meta}${when ? ` · ${when}` : ''}</p>
          <div class="actions mt-6">
            <button class="btn" data-action="edit-activity" data-id="${it.id}" aria-label="Editar atividade: ${it.title}">Editar</button>
            <button class="btn btn-ghost" data-action="delete-activity" data-id="${it.id}" aria-label="Excluir atividade: ${it.title}">Excluir</button>
          </div>`;
        list.appendChild(card);
      }
      // atualizar visual dependente
      this.renderActivityFilters();
      this.renderStreak();
      this.renderHeatmap();
      this.renderAchievements();
      this.renderAttributes();
    },
    renderStats() {
      const state = App.db.getState();
      const xp = state.stats?.xp || 0;
      const { lvl, current, needed, pct } = levelProgressFromXP(xp);
      if (this.els.levelValue) this.els.levelValue.textContent = String(lvl);
      if (this.els.xpText) this.els.xpText.textContent = `${xp} XP · ${current}/${needed}`;
      if (this.els.xpProgress) this.els.xpProgress.style.width = `${Math.round(pct * 100)}%`;
    },
    renderBasicStats() {
      const listCat = this.els.statsByCategory;
      const listDay = this.els.statsByDay;
      const timeCat = this.els.timeByCategory;
      const timeDay = this.els.timeByDay;
      if (!listCat && !listDay && !timeCat && !timeDay) return;
      const state = App.db.getState();
      const items = state.items || [];

      // Por Categoria
      if (listCat) {
        const agg = new Map(); // cat -> {count, xp}
        for (const it of items) {
          const cat = (it.category || 'geral').toLowerCase();
          const xp = Number(it.xp) || 0;
          const prev = agg.get(cat) || { count: 0, xp: 0 };
          prev.count += 1;
          prev.xp += xp;
          agg.set(cat, prev);
        }
        const rows = Array.from(agg.entries()).sort((a, b) => b[1].xp - a[1].xp).slice(0, 6);
        listCat.innerHTML = '';
        if (rows.length === 0) {
          const li = document.createElement('li');
          li.className = 'muted';
          li.textContent = 'Sem dados.';
          listCat.appendChild(li);
        } else {
          for (const [cat, v] of rows) {
            const li = document.createElement('li');
            li.textContent = `${cat} · ${v.count} ativ. · ${v.xp} XP`;
            listCat.appendChild(li);
          }
        }
      }

      // Por Dia
      if (listDay) {
        const aggD = new Map(); // yyyy-mm-dd -> {count, xp}
        for (const it of items) {
          const date = it.ts ? (new Date(it.ts).toISOString().slice(0, 10)) : 'sem-data';
          const xp = Number(it.xp) || 0;
          const prev = aggD.get(date) || { count: 0, xp: 0 };
          prev.count += 1;
          prev.xp += xp;
          aggD.set(date, prev);
        }
        const rowsD = Array.from(aggD.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
        listDay.innerHTML = '';
        if (rowsD.length === 0) {
          const li = document.createElement('li');
          li.className = 'muted';
          li.textContent = 'Sem dados.';
          listDay.appendChild(li);
        } else {
          for (const [date, v] of rowsD) {
            const li = document.createElement('li');
            li.textContent = `${date} · ${v.count} ativ. · ${v.xp} XP`;
            listDay.appendChild(li);
          }
        }
      }

      // Tempo por Categoria (minutos)
      if (timeCat) {
        const aggT = new Map(); // cat -> totalMinutes
        for (const it of items) {
          const cat = (it.category || 'geral').toLowerCase();
          const min = Number(it.duration) || 0;
          aggT.set(cat, (aggT.get(cat) || 0) + min);
        }
        const rowsT = Array.from(aggT.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
        timeCat.innerHTML = '';
        if (rowsT.length === 0) {
          const li = document.createElement('li');
          li.className = 'muted';
          li.textContent = 'Sem dados.';
          timeCat.appendChild(li);
        } else {
          for (const [cat, total] of rowsT) {
            const li = document.createElement('li');
            li.textContent = `${cat} · ${total} min`;
            timeCat.appendChild(li);
          }
        }
      }

      // Tempo por Dia (minutos)
      if (timeDay) {
        const aggTD = new Map(); // yyyy-mm-dd -> totalMinutes
        for (const it of items) {
          const date = it.ts ? (new Date(it.ts).toISOString().slice(0, 10)) : 'sem-data';
          const min = Number(it.duration) || 0;
          aggTD.set(date, (aggTD.get(date) || 0) + min);
        }
        const rowsTD = Array.from(aggTD.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
        timeDay.innerHTML = '';
        if (rowsTD.length === 0) {
          const li = document.createElement('li');
          li.className = 'muted';
          li.textContent = 'Sem dados.';
          timeDay.appendChild(li);
        } else {
          for (const [date, total] of rowsTD) {
            const li = document.createElement('li');
            li.textContent = `${date} · ${total} min`;
            timeDay.appendChild(li);
          }
        }
      }
    },
    renderMissions() {
      const state = App.db.getState();
      const today = getToday();
      const pf = state.prefs?.filters?.missions || { status: 'all', type: 'all' };
      // Aplicar filtro de tipo: se não incluir 'daily', esvaziar
      if (pf.type && pf.type !== 'all' && pf.type !== 'daily') {
        if (this.els.missionsCounter) this.els.missionsCounter.textContent = `0/0 concluídas`;
        if (this.els.missionsList) { this.els.missionsList.innerHTML = '<p class="muted">Filtro de tipo ativo.</p>'; }
        return;
      }
      let missions = (state.missions?.daily || []).filter(m => m.date === today);
      if (pf.status === 'pending') missions = missions.filter(m => !m.done);
      else if (pf.status === 'done') missions = missions.filter(m => m.done);
      const total = missions.length;
      const done = missions.filter(m => m.done).length;
      if (this.els.missionsCounter) {
        this.els.missionsCounter.textContent = `${done}/${total} concluídas`;
      }
      if (!this.els.missionsList) return;
      const list = this.els.missionsList;
      list.innerHTML = '';
      if (total === 0) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = i18n.t('missions_none_today');
        list.appendChild(p);
        return;
      }
      for (const m of missions.slice(0, 5)) {
        const li = document.createElement('div');
        li.className = 'mt-6';
        const btnLabel = m.done ? i18n.t('completed') : i18n.t('complete');
        const disabled = m.done ? 'disabled aria-pressed="true"' : '';
        li.innerHTML = `<div class="card"><h4>${m.title}</h4><p class="muted">${m.category || 'geral'} · ${m.xp || 0} XP</p><div class="actions mt-6"><button class="btn" data-action="complete-mission" data-id="${m.id}" ${disabled}>${btnLabel}</button></div></div>`;
        list.appendChild(li);
      }
    }
    ,
    renderWeeklyMissions() {
      const counter = document.getElementById('weeklyMissionsCounter');
      const list = document.getElementById('weeklyMissionsList');
      if (!counter && !list) return;
      const state = App.db.getState();
      const ws = getIsoWeekStart();
      const pf = state.prefs?.filters?.missions || { status: 'all', type: 'all' };
      if (pf.type && pf.type !== 'all' && pf.type !== 'weekly') {
        if (counter) counter.textContent = `0/0 concluídas`;
        if (list) list.innerHTML = '<p class="muted">Filtro de tipo ativo.</p>';
        return;
      }
      let missions = (state.missions?.weekly || []).filter(m => m.weekStart === ws);
      if (pf.status === 'pending') missions = missions.filter(m => !m.done);
      else if (pf.status === 'done') missions = missions.filter(m => m.done);
      const total = missions.length;
      const done = missions.filter(m => m.done).length;
      if (counter) counter.textContent = `${done}/${total} concluídas`;
      if (!list) return;
      list.innerHTML = '';
      if (total === 0) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = i18n.t('missions_none_week');
        list.appendChild(p);
        return;
      }
      for (const m of missions.slice(0, 5)) {
        const li = document.createElement('div');
        li.className = 'mt-6';
        const btnLabel = m.done ? i18n.t('completed') : i18n.t('complete');
        const disabled = m.done ? 'disabled aria-pressed="true"' : '';
        li.innerHTML = `<div class="card"><h4>${m.title}</h4><p class="muted">${m.category || 'geral'} · ${m.xp || 0} XP</p><div class="actions mt-6"><button class="btn" data-action="complete-weekly-mission" data-id="${m.id}" ${disabled}>${btnLabel}</button></div></div>`;
        list.appendChild(li);
      }
    }
    ,
    renderAchievements() {
      const ul = this.els.achievementsList;
      if (!ul) return;
      const state = App.db.getState();
      const items = state.items || [];
      const count = items.length;
      // streak calc quick
      const days = new Set(items.map(it => (new Date(it.ts || Date.now())).toISOString().slice(0,10)));
      let streak = 0; const cursor = new Date(); cursor.setHours(0,0,0,0);
      while (true) { const key = cursor.toISOString().slice(0,10); if (days.has(key)) { streak++; cursor.setDate(cursor.getDate()-1);} else break; }
      const list = [];
      if (count >= 10) list.push('10 atividades!');
      if (count >= 50) list.push('50 atividades!');
      if (streak >= 3) list.push('Streak 3+ dias!');
      if (streak >= 7) list.push('Streak 7+ dias!');
      ul.innerHTML = '';
      if (list.length === 0) {
        const li = document.createElement('li'); li.className = 'muted'; li.textContent = i18n.t('achievements_none'); ul.appendChild(li); return;
      }
      for (const name of list.slice(0,5)) { const li = document.createElement('li'); li.textContent = name; ul.appendChild(li); }
    }
    ,
    renderAttributes() {
      const box = this.els.attributesBox;
      if (!box) return;
      const state = App.db.getState();
      try { engine.ensureAttrState(state); } catch {}
      const attrs = state.attributes || {};
      const entries = Object.keys(attrs);
      box.innerHTML = '';
      if (entries.length === 0) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'Sem atributos ainda.';
        box.appendChild(p);
        return;
      }
      for (const attr of entries) {
        const node = attrs[attr] || { tier: 0, subtier: 0, rp: 0 };
        const Tk = typeof subtierThreshold === 'function' ? subtierThreshold(attr) : 100;
        const rp = Math.max(0, Number(node.rp) || 0);
        const pct = Math.max(0, Math.min(100, Math.round((rp / (Tk || 1)) * 100)));
        const row = document.createElement('div');
        row.className = 'card mt-3';
        const title = document.createElement('h4');
        title.textContent = attr;
        const meta = document.createElement('p');
        meta.className = 'muted';
        meta.textContent = `Tier ${node.tier} · Subtier ${node.subtier} · ${rp.toFixed(1)} / ${Tk}`;
        const bar = document.createElement('div');
        bar.className = 'progress';
        const i = document.createElement('i');
        i.style.width = `${pct}%`;
        bar.appendChild(i);
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(bar);
        box.appendChild(row);
      }
    }
    ,
    renderHeatmap() {
      const container = document.getElementById('streakHeatmap');
      if (!container) return;
      const state = App.db.getState();
      const items = state.items || [];
      const days = new Set(items.map(it => (new Date(it.ts || Date.now())).toISOString().slice(0,10)));
      // mês atual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const totalDays = last.getDate();
      // estilos simples inline (evitar CSS extra) — usa tokens para respeitar tema
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      const borderCol = (cs.getPropertyValue('--border') || 'rgba(148,163,184,0.22)').trim();
      const inactiveBg = (cs.getPropertyValue('--bg-elev') || '#1e1e1e').trim();
      // Cor ativa: usar um acento consistente e acessível (violet por padrão)
      const activeBg = (cs.getPropertyValue('--purple') || cs.getPropertyValue('--accent') || '#7c3aed').trim();
      container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.style.display = 'grid';
      wrap.style.gridTemplateColumns = 'repeat(7, 1fr)';
      wrap.style.gap = '4px';
      // cabeçalho dias da semana
      const wd = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
      for (const ch of wd) {
        const h = document.createElement('div');
        h.textContent = ch;
        h.className = 'muted';
        h.style.fontSize = '12px';
        wrap.appendChild(h);
      }
      // calcular offset do primeiro dia
      const startWeekday = (first.getDay() + 6) % 7; // 0=segunda
      for (let i = 0; i < startWeekday; i++) {
        const empty = document.createElement('div');
        wrap.appendChild(empty);
      }
      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const key = date.toISOString().slice(0,10);
        const box = document.createElement('div');
        box.title = key;
        box.style.height = '18px';
        box.style.borderRadius = '3px';
        box.style.border = `1px solid ${borderCol}`;
        const active = days.has(key);
        box.style.background = active ? activeBg : inactiveBg;
        wrap.appendChild(box);
      }
      container.appendChild(wrap);
    }
  };

  // Sincroniza presets do servidor (geral e pessoal) com o estado local
  async function syncPresetsFromServer() {
    try {
      const state = App.db.getState();
      const haveById = new Map((state.presets || []).map(p => [Number(p.id), p]));

      // Buscar gerais
      let general = [];
      try {
        const r = await fetchWithTimeout('/api/activities', { method: 'GET' }, 10000);
        if (r.ok) general = await r.json();
      } catch (e) { console.warn('Falha ao buscar presets gerais', e); }

      // Buscar pessoais (se logado)
      let personal = [];
      try {
        const sess = App?.auth?.getSession ? App.auth.getSession() : null;
        const me = sess && sess.userId ? String(sess.userId) : null;
        if (me) {
          const r2 = await fetchWithTimeout(`/api/activities/${encodeURIComponent(me)}`, { method: 'GET' }, 10000);
          if (r2.ok) personal = await r2.json();
        }
      } catch (e) { console.warn('Falha ao buscar presets pessoais', e); }

      const incoming = [...(Array.isArray(general) ? general : []), ...(Array.isArray(personal) ? personal : [])];
      if (incoming.length === 0) return; // nada novo

      // Mesclar por id, substituindo se já existir
      for (const p of incoming) {
        const idNum = Number(p?.id);
        if (!Number.isFinite(idNum)) continue;
        haveById.set(idNum, {
          id: idNum,
          title: String(p.title || 'Sem título'),
          category: p.category || '',
          duration: Number(p.duration) || 0,
          visibility: (p.visibility === 'personal' || p.visibility === 'general') ? p.visibility : 'general',
          ownerId: p.ownerId ? String(p.ownerId) : null,
          metricsSpec: (p.metricsSpec && typeof p.metricsSpec === 'object') ? p.metricsSpec : null,
          scoring: (p.scoring && typeof p.scoring === 'object') ? p.scoring : null,
        });
      }

      const merged = Array.from(haveById.values())
        // ordena desc por id para aproximar ordem de criação
        .sort((a, b) => Number(b.id) - Number(a.id));
      state.presets = merged;
      App.db.setState(state);
    } catch (err) {
      console.warn('syncPresetsFromServer falhou', err);
    }
  }

  // O carregamento de componentes é responsabilidade de assets/scripts/components.js
  // Aqui apenas aguardamos o evento "components:loaded" antes de continuar.

  async function init() {
    // Aguardar injeção dos componentes pelo components.js
    await new Promise((resolve) => {
      // Se houver placeholders, aguarda o evento; senão segue direto
      const ph = document.querySelector('[data-component]');
      if (ph) {
        document.addEventListener('components:loaded', () => resolve(), { once: true });
      } else {
        resolve();
      }
    });
    closeSidebar(); // garantir fechado ao iniciar
    await db.applySeedIfEmpty();
    // Garantir e reconstruir atributos no estado a partir dos itens existentes
    try {
      const s = App.db.getState();
      engine.ensureAttrState(s);
      engine.rebuildFromItems(s);
      App.db.setState(s);
    } catch {}
    // Sincronizar presets do servidor antes de bind/render para já aparecerem na primeira renderização
    try { await syncPresetsFromServer(); } catch {}
    ui.bind();
    // aplicar preferências
    try { ui.applyPrefs(App.db.getState().prefs); } catch (_) {}
    // Render presets list if available on this page (activities.html)
    try { await ui.renderPresetsManager(); } catch (e) { try { console.debug('renderPresetsManager error', e); } catch {} }
    ui.renderList();
    ui.renderStats();
    ui.renderBasicStats();
    ui.renderWeeklyMetrics();
    ui.renderWeeklyStreak();
    ui.renderMissions();
    ui.renderWeeklyMissions();
    ui.renderHeatmap();
    ui.renderAchievements();
    ui.renderAttributes();
    // Register Service Worker (PWA)
    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js');
      }
    } catch (e) {
      console.warn('SW registration failed', e);
    }
  }

  // Expor um namespace mínimo para extensões futuras (preservando namespaces existentes como auth)
  window.App = Object.assign(window.App || {}, { db, ui, init });

  // Inicializar quando DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

