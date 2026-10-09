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
      field.focus();
      const dialogEl = document.getElementById('auth-dialog');
      dialogEl.classList.remove('shake');
      void dialogEl.offsetWidth;
      dialogEl.classList.add('shake');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    Voter.init();
    const authDialog = document.getElementById('auth-dialog');

    if (sessionStorage.getItem('admin_authed') === '1') {
      window._adminAuthed = true;
      if (typeof window._loadAdmin === 'function') window._loadAdmin();
    } else {
      authDialog.showModal();
      document.getElementById('login-btn')?.addEventListener('click', attemptLogin);
      document.getElementById('password-field')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') attemptLogin();
      });
    }
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
      chip.textContent = '✓ Chosen';
      chips.appendChild(chip);
    }
    const voteCount = document.createElement('span');
    voteCount.className = 'vote-count';
    voteCount.textContent = `${issueVotes.count} vote${issueVotes.count !== 1 ? 's' : ''}`;
    chips.appendChild(voteCount);
    footer.appendChild(chips);

    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const pinBtn = document.createElement('button');
    pinBtn.className = 'admin-btn' + (isPinned ? ' active' : '');
    pinBtn.title = isPinned ? 'Unpin' : 'Pin';
    pinBtn.textContent = isPinned ? '📌 Pinned' : 'Pin';
    pinBtn.addEventListener('click', async () => {
      pinBtn.disabled = true;
      try {
        if (isPinned) await GH.removeLabel(issue.number, 'pinned');
        else await GH.addLabel(issue.number, 'pinned');
        await window._loadAdmin();
      } catch (e) { console.error(e); pinBtn.disabled = false; }
    });
    actions.appendChild(pinBtn);

    const chosenBtn = document.createElement('button');
    chosenBtn.className = 'admin-btn' + (isChosen ? ' active' : '');
    chosenBtn.title = isChosen ? 'Unmark as chosen' : 'Mark as chosen';
    chosenBtn.textContent = isChosen ? '✓ Chosen' : 'Choose';
    chosenBtn.addEventListener('click', async () => {
      chosenBtn.disabled = true;
      try {
        if (isChosen) await GH.removeLabel(issue.number, 'chosen');
        else await GH.addLabel(issue.number, 'chosen');
        await window._loadAdmin();
      } catch (e) { console.error(e); chosenBtn.disabled = false; }
    });
    actions.appendChild(chosenBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'admin-btn danger';
    deleteBtn.title = 'Delete suggestion';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Delete: "${issue.title}"?`)) return;
      deleteBtn.disabled = true;
      try {
        await GH.closeIssue(issue.number);
        await window._loadAdmin();
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

    pinnedSection.hidden = pinned.length === 0;
    pinned.forEach(i => pinnedList.appendChild(buildAdminCard(i, votes)));

    if (regular.length === 0) {
      sugList.innerHTML = '<p class="loading-msg">No suggestions yet.</p>';
    } else {
      regular.forEach(i => sugList.appendChild(buildAdminCard(i, votes)));
    }

    const toggle = document.getElementById('voting-toggle');
    if (toggle) toggle.checked = votes.votingOpen;
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
        '<p class="loading-msg">Could not load.</p>';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('voting-toggle')?.addEventListener('change', async (e) => {
      if (!window._adminAuthed) return;
      const toggle = e.target;
      toggle.disabled = true;
      try {
        const { sha, content: votes } = await GH.fetchVotesFile();
        votes.votingOpen = toggle.checked;
        await GH.updateVotesFile(votes, sha);
        window._adminVotesData = votes;
        window._adminVoteSha = sha;
      } catch (err) {
        console.error(err);
        toggle.checked = !toggle.checked;
      } finally {
        toggle.disabled = false;
      }
    });
  });
})();
