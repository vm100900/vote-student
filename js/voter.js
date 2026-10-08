(function () {
  const COOKIE_NAME = 'voter_id';
  const STORAGE_KEY = 'voter_id';
  const CONSENT_KEY = 'cookie_consent';

  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
  }

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function getOrCreateId() {
    const fromCookie = getCookie(COOKIE_NAME);
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    const consented = localStorage.getItem(CONSENT_KEY) === 'true';

    if (fromCookie) {
      localStorage.setItem(STORAGE_KEY, fromCookie);
      return fromCookie;
    }
    if (fromStorage) {
      if (consented) setCookie(COOKIE_NAME, fromStorage, 365);
      return fromStorage;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    if (consented) setCookie(COOKIE_NAME, id, 365);
    return id;
  }

  function applyConsent(accepted) {
    localStorage.setItem(CONSENT_KEY, String(accepted));
    if (accepted) {
      const id = localStorage.getItem(STORAGE_KEY) || (() => {
        const newId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, newId);
        return newId;
      })();
      setCookie(COOKIE_NAME, id, 365);
    }
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.hidden = true;
  }

  function init() {
    // Always ensure an ID exists in localStorage
    getOrCreateId();

    // Show consent banner only if user hasn't decided yet
    if (localStorage.getItem(CONSENT_KEY) === null) {
      const banner = document.getElementById('cookie-banner');
      if (banner) {
        banner.hidden = false;
        document.getElementById('cookie-accept')
          ?.addEventListener('click', () => applyConsent(true), { once: true });
        document.getElementById('cookie-decline')
          ?.addEventListener('click', () => applyConsent(false), { once: true });
      }
    }
  }

  async function getHashedId() {
    const id = getOrCreateId();
    return sha256(id);
  }

  function hasConsented() {
    return localStorage.getItem(CONSENT_KEY) !== null;
  }

  window.Voter = { init, getHashedId, hasConsented };
})();
