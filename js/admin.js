(function () {
  window._adminAuthed = false;

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  async function attemptLogin() {
    const field = document.getElementById('password-field');
    const errorEl = document.getElementById('auth-error');
    const hash = await sha256(field.value);

    if (hash === CONFIG.adminHash) {
      sessionStorage.setItem('admin_authed', '1');
      window._adminAuthed = true;
      document.getElementById('auth-dialog').close();
      errorEl.hidden = true;
      if (typeof window._loadAdmin === 'function') window._loadAdmin();
    } else {
      errorEl.hidden = false;
      field.value = '';
      // Shake the dialog
      const dialogEl = document.getElementById('auth-dialog');
      dialogEl.classList.remove('shake');
      void dialogEl.offsetWidth; // reflow to restart animation
      dialogEl.classList.add('shake');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    Voter.init();

    // Auto-login if session still active
    if (sessionStorage.getItem('admin_authed') === '1') {
      window._adminAuthed = true;
      document.getElementById('auth-dialog').close();
      if (typeof window._loadAdmin === 'function') window._loadAdmin();
      return;
    }

    document.getElementById('login-btn')?.addEventListener('click', attemptLogin);
    document.getElementById('password-field')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') attemptLogin();
    });
  });
})();
