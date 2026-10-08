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

  function buildAdminCard(issue, votes) {
    const isPinned = issue.labels.some(l => l.name === 'pinned');
    const isChosen = issue.labels.some(l => l.name === 'chosen');
    const issueVotes = votes.issues[String(issue.number)] || { count: 0 };

    const card = document.createElement('div');
    card.className = 'suggestion-card' + (isPinned ? ' pinned' : '');
    card.dataset.number = issue.number;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = issue.title;
    card.appendChild(title);

    if (issue.body) {
      const body = document.createElement('div');
      body.className = 'card-body';
      body.textContent = issue.body;
      body.addEventListener('click', () => body.classList.toggle('expanded'));
      card.appendChild(body);
    }

    const footer = document.createElement('div');
    footer.className = 'card-footer';

    const chips = document.createElement('div');
    chips.className = 'card-chips';
    if (isChosen) {
      const chip = document.createElement('span');
      chip.className = 'chosen-chip';
      chip.innerHTML = '&#10003; Chosen';
      chips.appendChild(chip);
    }
    const voteCount = document.createElement('span');
    voteCount.className = 'vote-count';
    voteCount.textContent = `${issueVotes.count} vote${issueVotes.count !== 1 ? 's' : ''}`;
    chips.appendChild(voteCount);
    footer.appendChild(chips);

    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    // Pin / Unpin
    const pinBtn = document.createElement('md-icon-button');
    pinBtn.title = isPinned ? 'Unpin' : 'Pin';
    pinBtn.innerHTML = `<md-icon>${isPinned ? 'push_pin' : 'push_pin'}</md-icon>`;
    pinBtn.style.color = isPinned ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)';
    pinBtn.addEventListener('click', async () => {
      pinBtn.disabled = true;
      try {
        if (isPinned) await GH.removeLabel(issue.number, 'pinned');
        else await GH.addLabel(issue.number, 'pinned');
        await _loadAdmin();
      } catch (e) { console.error(e); pinBtn.disabled = false; }
    });
    actions.appendChild(pinBtn);

    // Chosen / Unchosen
    const chosenBtn = document.createElement('md-icon-button');
    chosenBtn.title = isChosen ? 'Unmark as chosen' : 'Mark as chosen';
    chosenBtn.innerHTML = `<md-icon>check_circle</md-icon>`;
    chosenBtn.style.color = isChosen ? '#14AE5C' : 'var(--md-sys-color-on-surface-variant)';
    chosenBtn.addEventListener('click', async () => {
      chosenBtn.disabled = true;
      try {
        if (isChosen) await GH.removeLabel(issue.number, 'chosen');
        else await GH.addLabel(issue.number, 'chosen');
        await _loadAdmin();
      } catch (e) { console.error(e); chosenBtn.disabled = false; }
    });
    actions.appendChild(chosenBtn);

    // Delete (close issue)
    const deleteBtn = document.createElement('md-icon-button');
    deleteBtn.title = 'Delete suggestion';
    deleteBtn.innerHTML = '<md-icon>delete</md-icon>';
    deleteBtn.style.color = 'var(--md-sys-color-error)';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete suggestion: "${issue.title}"?`)) return;
      deleteBtn.disabled = true;
      try {
        await GH.closeIssue(issue.number);
        await _loadAdmin();
      } catch (e) { console.error(e); deleteBtn.disabled = false; }
    });
    actions.appendChild(deleteBtn);

    footer.appendChild(actions);
    card.appendChild(footer);
    return card;
  }

  function renderAdmin(issues, votes) {
    const pinned = issues.filter(i => i.labels.some(l => l.name === 'pinned'));
    const regular = issues.filter(i => !i.labels.some(l => l.name === 'pinned'));

    const pinnedSection = document.getElementById('pinned-section');
    const pinnedList = document.getElementById('pinned-list');
    const sugList = document.getElementById('suggestions-list');

    pinnedList.innerHTML = '';
    sugList.innerHTML = '';

    if (pinned.length) {
      pinnedSection.hidden = false;
      pinned.forEach(i => pinnedList.appendChild(buildAdminCard(i, votes)));
    } else {
      pinnedSection.hidden = true;
    }

    if (regular.length === 0) {
      sugList.innerHTML = '<p class="loading-msg">No suggestions yet.</p>';
    } else {
      regular.forEach(i => sugList.appendChild(buildAdminCard(i, votes)));
    }

    // Voting toggle state
    const toggle = document.getElementById('voting-toggle');
    if (toggle) toggle.selected = votes.votingOpen;
  }

  window._loadAdmin = async function () {
    document.getElementById('suggestions-list').innerHTML = '<p class="loading-msg">Loading…</p>';
    try {
      const [issues, { sha, content: votes }] = await Promise.all([
        GH.fetchIssues(),
        GH.fetchVotesFile(),
      ]);
      window._adminVoteSha = sha;
      window._adminVotesData = votes;
      renderAdmin(issues, votes);
    } catch (err) {
      console.error(err);
      document.getElementById('suggestions-list').innerHTML =
        '<p class="loading-msg">Could not load. Check config.js.</p>';
    }
  };

  // Voting toggle handler (attached after DOM ready)
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('voting-toggle')?.addEventListener('change', async (e) => {
      if (!window._adminAuthed) return;
      const toggle = e.target;
      toggle.disabled = true;
      try {
        const { sha, content: votes } = await GH.fetchVotesFile();
        votes.votingOpen = toggle.selected;
        await GH.updateVotesFile(votes, sha);
        window._adminVotesData = votes;
        window._adminVoteSha = sha;
      } catch (err) {
        console.error(err);
        toggle.selected = !toggle.selected; // revert
      } finally {
        toggle.disabled = false;
      }
    });
  });
})();
