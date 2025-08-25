(function(){
  // Prevent double execution if this script is evaluated twice or DOMContentLoaded fires after manual call
  if (window.__components_load_started) return;
  window.__components_load_started = true;

  async function loadComponents() {
    const host = document;
    const placeholders = host.querySelectorAll('[data-component]');
    const mapper = {
      // Auth-specific fragments
      'auth-header': 'assets/components/auth/header.html',
      'auth-lead': 'assets/components/auth/lead.html',
      'auth-tabs': 'assets/components/auth/tabs.html',
      'auth-login-form': 'assets/components/auth/login-form.html',
      'auth-signup-form': 'assets/components/auth/signup-form.html',

      // Layout
      header: 'assets/components/layout/header.html',
      footer: 'assets/components/layout/footer.html',

      // Other shared components
      background: 'assets/components/background.html',
      sidebar: 'assets/components/layout/sidebar.html'
    };
    for (const slot of placeholders) {
      const name = slot.getAttribute('data-component');
      const url = mapper[name];
      if (!url) continue;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        // If the placeholder was already replaced/removed by another routine, skip
        if (!slot.isConnected || !slot.parentNode) continue;
        slot.outerHTML = html;
      } catch (err) {
        console.warn(`[components] Failed to load '${name}' from ${url}:`, err);
      }
    }
    // Signal that components finished mounting
    try {
      window.__components_loaded = true;
      document.dispatchEvent(new CustomEvent('components:loaded'));
    } catch {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadComponents);
  } else {
    loadComponents();
  }
})();
