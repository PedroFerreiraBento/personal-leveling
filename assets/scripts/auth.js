(function(){
  const ns = (window.App = window.App || {});
  const auth = (ns.auth = ns.auth || {});

  const STORAGE_SESSION = 'app:session';
  const STORAGE_APP = 'app:personal-leveling';
  // Users are handled EXCLUSIVAMENTE via API (Netlify Functions em /api/users)

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  async function getUsersCombined() { return await apiGetUsers(); }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  function readAppState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_APP)) || null;
    } catch { return null; }
  }
  function writeAppState(next) {
    try { localStorage.setItem(STORAGE_APP, JSON.stringify(next)); } catch {}
  }
  function uuid() {
    return 'u-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function toUtf8Bytes(str) {
    return new TextEncoder().encode(str);
  }
  async function sha256Hex(bytes) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      const buf = await crypto.subtle.digest('SHA-256', bytes);
      const arr = Array.from(new Uint8Array(buf));
      return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback (weak): not ideal; warn and return simple hex of bytes
    console.warn('[auth] SubtleCrypto.digest unavailable; using weak fallback');
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // (OPFS/local backups removidos neste modo)
  // --- API helpers (Netlify Functions) ---
  async function apiGetUsers() {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (!res.ok) throw new Error('Falha ao obter usuários');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[auth] apiGetUsers error', e);
      return [];
    }
  }
  async function apiCreateUser(user) {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      let detail = ''; try { detail = (await res.json()).error || ''; } catch {}
      throw new Error(detail || ('Erro ao criar usuário (' + res.status + ')'));
    }
    return await res.json();
  }
  auth.getUsers = async function() { return await apiGetUsers(); };
  // Não há saveUsers de array no modo API; operações são por registro
  auth.getSession = function() { return read(STORAGE_SESSION, null); };
  auth.setSession = function(sess) { write(STORAGE_SESSION, sess); };
  auth.clearSession = function() { localStorage.removeItem(STORAGE_SESSION); };

  auth.hash = async function(salt, password) {
    return sha256Hex(toUtf8Bytes(String(salt || '') + String(password || '')));
  };

  auth.signup = async function({ username, email, password }) {
    const em = String(email || '').trim().toLowerCase();
    if (!em || !password) throw new Error('Email e senha são obrigatórios');
    const existing = await getUsersCombined();
    if (existing.some(u => String(u.email).toLowerCase() === em)) throw new Error('Email já cadastrado');
    const salt = uuid();
    const passHash = await auth.hash(salt, password);
    const user = { id: uuid(), username: String(username || em), email: em, salt, passHash, createdAt: Date.now() };
    const created = await apiCreateUser(user);
    auth.setSession({ userId: created.id, issuedAt: Date.now() });
    return created;
  };

  auth.login = async function({ email, password }) {
    const users = await getUsersCombined();
    const em = String(email || '').trim().toLowerCase();
    const user = users.find(u => u.email === em);
    if (!user) throw new Error('Usuário não encontrado');
    const passHash = await auth.hash(user.salt, password);
    if (passHash !== user.passHash) throw new Error('Credenciais inválidas');
    auth.setSession({ userId: user.id, issuedAt: Date.now() });
    return user;
  };

  auth.logout = function() {
    auth.clearSession();
  };

  // --- Debug/maintenance helpers ---
  auth.listUsers = async function() {
    return await getUsersCombined();
  };
  // resetUsers removido (não aplicável em modo API)

  auth.requireAuth = function() {
    if (location.pathname.endsWith('/index.html') || location.pathname === '/' ) return; // login page
    const sess = auth.getSession();
    if (!sess || !sess.userId) {
      location.href = '/index.html';
    }
  };

  // --- Minimal i18n for auth page ---
  const AUTH_I18N = {
    pt: {
      subtitle: 'Faça login ou crie sua conta local para continuar.',
      tab_login: 'Entrar',
      tab_signup: 'Cadastrar',
      name_label: 'Nome',
      email_label: 'Email',
      password_label: 'Senha',
      login_submit: 'Entrar',
      signup_submit: 'Criar conta',
      signup_note: 'Conta local armazenada no seu navegador. Não use senhas sensíveis.',
      footer_note: 'Este login é local e não possui backend. Consulte o README para limitações.',
      ph_email: 'voce@exemplo.com',
      ph_password: 'Mínimo 6 caracteres',
      toggle_label: (isEn) => isEn ? 'EN' : 'PT',
    },
    en: {
      subtitle: 'Sign in or create a local account to continue.',
      tab_login: 'Sign In',
      tab_signup: 'Sign Up',
      name_label: 'Name',
      email_label: 'Email',
      password_label: 'Password',
      login_submit: 'Sign In',
      signup_submit: 'Create account',
      signup_note: 'Local account stored in your browser. Do not use sensitive passwords.',
      footer_note: 'This login is local and has no backend. See README for limitations.',
      ph_email: 'you@example.com',
      ph_password: 'Minimum 6 characters',
      toggle_label: (isEn) => isEn ? 'EN' : 'PT',
    }
  };

  auth.getLanguage = function() {
    const st = readAppState();
    return (st && st.prefs && (st.prefs.language === 'en' || st.prefs.language === 'pt')) ? st.prefs.language : 'pt';
  };
  auth.setLanguage = function(lang) {
    const st = readAppState() || { items: [], missions: { daily: [], weekly: [] }, stats: { level: 1, xp: 0 }, prefs: { theme: 'dark', density: 'cozy', language: 'pt', filters: { activities: { category: 'all', interval: 'all' }, missions: { status: 'all', type: 'all' } } } };
    st.prefs = st.prefs || {};
    st.prefs.language = (lang === 'en') ? 'en' : 'pt';
    writeAppState(st);
  };
  auth.applyAuthI18n = function() {
    try {
      const lang = auth.getLanguage();
      const dict = AUTH_I18N[lang] || AUTH_I18N.pt;
      const q = (sel) => document.querySelector(sel);
      // Subtitle below header
      const sub = q('.auth-lead');
      if (sub) sub.textContent = dict.subtitle;
      // Tabs
      const tabLogin = q('#tabLogin');
      const tabSignup = q('#tabSignup');
      if (tabLogin) tabLogin.textContent = dict.tab_login;
      if (tabSignup) tabSignup.textContent = dict.tab_signup;
      // Labels
      const l1 = q('#loginForm label:nth-of-type(1) span');
      const l2 = q('#loginForm label:nth-of-type(2) span');
      if (l1) l1.textContent = dict.email_label;
      if (l2) l2.textContent = dict.password_label;
      const s1 = q('#signupForm label:nth-of-type(1) span');
      const s2 = q('#signupForm label:nth-of-type(2) span');
      const s3 = q('#signupForm label:nth-of-type(3) span');
      if (s1) s1.textContent = dict.name_label;
      if (s2) s2.textContent = dict.email_label;
      if (s3) s3.textContent = dict.password_label;
      // Buttons
      const loginBtn = q('#loginForm button[type="submit"]');
      const signupBtn = q('#signupForm button[type="submit"]');
      if (loginBtn) loginBtn.textContent = dict.login_submit;
      if (signupBtn) signupBtn.textContent = dict.signup_submit;
      // Placeholders
      const loginEmail = q('#loginEmail');
      if (loginEmail) loginEmail.placeholder = dict.ph_email;
      const signupEmail = q('#signupEmail');
      if (signupEmail) signupEmail.placeholder = dict.ph_email;
      const signupPassword = q('#signupPassword');
      if (signupPassword) signupPassword.placeholder = dict.ph_password;
      // Notes
      const signupNote = q('#signupForm .muted.small');
      if (signupNote) signupNote.textContent = dict.signup_note;
      const footerNote = q('footer .muted.small');
      if (footerNote) footerNote.textContent = dict.footer_note;
      // Toggle label (auth page only)
      const toggle = q('#authLanguageToggle');
      if (toggle) toggle.textContent = typeof dict.toggle_label === 'function' ? dict.toggle_label(lang === 'en') : (lang === 'en' ? 'EN' : 'PT');
    } catch {}
  };
  // Wire toggle
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('#authLanguageToggle');
    if (!btn) return;
    ev.preventDefault();
    const next = auth.getLanguage() === 'en' ? 'pt' : 'en';
    auth.setLanguage(next);
    auth.applyAuthI18n();
  });
  // Auto-apply on auth page
  if (document.getElementById('auth')) {
    try { auth.applyAuthI18n(); } catch {}
  }

  // --- Theme (light/dark) ---
  auth.getTheme = function() {
    const st = readAppState();
    const t = st && st.prefs && st.prefs.theme;
    return (t === 'light' || t === 'dark') ? t : 'dark';
  };
  auth.setTheme = function(theme) {
    const st = readAppState() || { items: [], missions: { daily: [], weekly: [] }, stats: { level: 1, xp: 0 }, prefs: { theme: 'dark', density: 'cozy', language: 'pt', filters: { activities: { category: 'all', interval: 'all' }, missions: { status: 'all', type: 'all' } } } };
    st.prefs = st.prefs || {};
    st.prefs.theme = (theme === 'light') ? 'light' : 'dark';
    writeAppState(st);
    auth.applyTheme();
  };
  auth.applyTheme = function() {
    try {
      const theme = auth.getTheme();
      const root = document.documentElement; // :root
      root.setAttribute('data-theme', theme);
      const btn = document.getElementById('themeToggle');
      if (btn) {
        // padroniza: apenas ajusta o ícone material se existir
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
        btn.setAttribute('aria-pressed', String(theme === 'light'));
        btn.title = `Tema: ${theme === 'light' ? 'Claro' : 'Escuro'}`;
      }
    } catch {}
  };
  // Auto-apply theme on auth page
  if (document.getElementById('auth')) {
    try { auth.applyTheme(); } catch {}
  }
  // Wire theme toggle
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('#themeToggle');
    if (!btn) return;
    ev.preventDefault();
    const next = auth.getTheme() === 'dark' ? 'light' : 'dark';
    auth.setTheme(next);
  });

  // Wire logout button if present
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('#logoutBtn');
    if (!btn) return;
    ev.preventDefault();
    auth.logout();
    location.href = '/index.html';
  });

  // --- Sidebar overlay controls for auth page ---
  if (document.getElementById('auth')) {
    const isSidebarOpen = () => document.body.classList.contains('sidebar-open');
    const openSidebar = () => document.body.classList.add('sidebar-open');
    const closeSidebar = () => document.body.classList.remove('sidebar-open');
    const toggleSidebar = () => document.body.classList.toggle('sidebar-open');

    // Toggle by button
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#sidebarToggle');
      if (!btn) return;
      e.preventDefault();
      toggleSidebar();
    });
    // Backdrop close
    document.addEventListener('click', (e) => {
      const bd = e.target.closest('.sidebar-backdrop');
      if (!bd) return;
      e.preventDefault();
      closeSidebar();
    });
    // ESC close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isSidebarOpen()) closeSidebar();
    });
    // Resize safety (close on large screens)
    let _rz;
    window.addEventListener('resize', () => {
      clearTimeout(_rz);
      _rz = setTimeout(() => { if (window.innerWidth >= 900) closeSidebar(); }, 150);
    });
    // Proxy buttons inside sidebar using data-click
    document.addEventListener('click', (e) => {
      const proxy = e.target.closest('[data-click]');
      if (!proxy) return;
      const sel = proxy.getAttribute('data-click');
      if (!sel) return;
      const target = document.querySelector(sel);
      if (target) {
        e.preventDefault();
        target.click();
        if (isSidebarOpen()) closeSidebar();
      }
    });

    // Auto-compact header actions when they overflow
    const header = document.querySelector('.site-header');
    const actions = header ? header.querySelector('.header-actions') : null;
    function updateCompact() {
      if (!header || !actions) return;
      // Use scrollWidth to detect overflow in the actions container
      const needsCompact = actions.scrollWidth > actions.clientWidth + 2; // tolerance
      header.classList.toggle('header-compact', needsCompact);
    }
    // Observe size changes
    if (actions && window.ResizeObserver) {
      const ro = new ResizeObserver(() => updateCompact());
      ro.observe(actions);
      // Also observe body (layout changes)
      ro.observe(document.body);
      // Initial pass
      setTimeout(updateCompact, 0);
      window.addEventListener('resize', updateCompact);
    } else {
      // Fallback: simple resize listener
      window.addEventListener('resize', updateCompact);
      setTimeout(updateCompact, 0);
    }
  }
})();
