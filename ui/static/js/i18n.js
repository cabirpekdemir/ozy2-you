/* OZY2 — i18n Engine. Key-based, no DOM hacks. */
const I18N = {
  _t: {},
  _lang: 'en',

  async load(lang) {
    try {
      const r = await fetch(`/api/i18n/${lang}`);
      const d = await r.json();
      if (d.ok) { this._t = d.t; this._lang = lang; }
    } catch {
      // fallback: keys already in HTML as text
    }
    this._apply();
    localStorage.setItem('ozy2_lang', lang);
  },

  t(key, fallback = '') {
    return this._t[key] || fallback || key;
  },

  _apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = this._t[key];
      if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this._t[key];
      if (val) el.placeholder = val;
    });
  }
};

window.t = (key, fallback) => I18N.t(key, fallback);
