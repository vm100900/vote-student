(function () {
  // Shared page state
  window._appState = { issues: [], votes: null, voteSha: null, voterHash: null };

  // Build one suggestion card element (student view)
  function buildCard(issue, votes, voterHash, votingOpen) {
    const issueVotes = votes.issues[String(issue.number)] || { count: 0, voters: [] };
    const hasVoted = issueVotes.voters.includes(voterHash);
    const isPinned = issue.labels.some(l => l.name === 'pinned');
    const isChosen = issue.labels.some(l => l.name === 'chosen');

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
      // Expand on click if truncated
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
    footer.appendChild(chips);

    const voteWrap = document.createElement('div');
    voteWrap.style.display = 'flex';
    voteWrap.style.alignItems = 'center';
    voteWrap.style.gap = '8px';

    const countEl = document.createElement('span');
    countEl.className = 'vote-count';
    countEl.textContent = issueVotes.count;
    voteWrap.appendChild(countEl);

    if (!votingOpen) {
      const closed = document.createElement('md-outlined-button');
      closed.disabled = true;
      closed.textContent = 'Voting closed';
      voteWrap.appendChild(closed);
    } else if (hasVoted) {
      const votedBtn = document.createElement('md-filled-tonal-button');
      votedBtn.disabled = true;
      votedBtn.textContent = 'Voted ✓';
      voteWrap.appendChild(votedBtn);
    } else {
      const voteBtn = document.createElement('md-filled-tonal-button');
      voteBtn.dataset.action = 'vote';
      voteBtn.dataset.number = issue.number;
      voteBtn.innerHTML = '<md-icon slot="icon">thumb_up</md-icon>Vote';
      voteWrap.appendChild(voteBtn);
    }

    footer.appendChild(voteWrap);
    card.appendChild(footer);
    return card;
  }

  function renderSuggestions(issues, votesData, voterHash) {
    const pinned = issues.filter(i => i.labels.some(l => l.name === 'pinned'));
    const regular = issues.filter(i => !i.labels.some(l => l.name === 'pinned'));

    const pinnedSection = document.getElementById('pinned-section');
    const pinnedList = document.getElementById('pinned-list');
    const sugList = document.getElementById('suggestions-list');

    pinnedList.innerHTML = '';
    sugList.innerHTML = '';

    if (pinned.length) {
      pinnedSection.hidden = false;
      pinned.forEach(i => pinnedList.appendChild(buildCard(i, votesData, voterHash, votesData.votingOpen)));
    } else {
      pinnedSection.hidden = true;
    }

    if (regular.length === 0) {
      sugList.innerHTML = '<p class="loading-msg">No suggestions yet — be the first!</p>';
    } else {
      regular.forEach(i => sugList.appendChild(buildCard(i, votesData, voterHash, votesData.votingOpen)));
    }
  }

  async function init() {
    Voter.init();

    const [issues, { sha, content: votes }, voterHash] = await Promise.all([
      GH.fetchIssues(),
      GH.fetchVotesFile(),
      Voter.getHashedId(),
    ]);

    window._appState = { issues, votes, voteSha: sha, voterHash };
    renderSuggestions(issues, votes, voterHash);
  }

  // ── Submit dialog ──
  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => {
      document.getElementById('suggestions-list').innerHTML =
        `<p class="loading-msg">Could not load suggestions. Check your config.js setup.</p>`;
      console.error(err);
    });

    const fab = document.getElementById('add-fab');
    const dialog = document.getElementById('submit-dialog');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const titleField = document.getElementById('title-field');
    const descField = document.getElementById('desc-field');

    fab?.addEventListener('click', () => dialog.show());
    cancelBtn?.addEventListener('click', () => dialog.close());

    submitBtn?.addEventListener('click', async () => {
      const title = titleField.value.trim();
      if (!title) { titleField.focus(); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';

      try {
        await GH.createIssue(title, descField.value.trim(), ['suggestion']);
        dialog.close();
        titleField.value = '';
        descField.value = '';

        // Refresh issues + re-render
        const [issues, { sha, content: votes }] = await Promise.all([
          GH.fetchIssues(),
          GH.fetchVotesFile(),
        ]);
        window._appState = { ...window._appState, issues, votes, voteSha: sha };
        renderSuggestions(issues, votes, window._appState.voterHash);
      } catch (err) {
        console.error(err);
        alert('Could not submit suggestion. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  });

  // ── Vote handler (delegated to document) ──
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="vote"]');
    if (!btn) return;

    const number = String(btn.dataset.number);
    const { votes, voteSha, voterHash } = window._appState;

    // Prevent double-click
    btn.disabled = true;

    try {
      const { sha: freshSha, content: freshVotes } = await GH.fetchVotesFile();

      const entry = freshVotes.issues[number] || { count: 0, voters: [] };
      if (entry.voters.includes(voterHash)) {
        // Already voted (race condition guard)
        window._appState.votes = freshVotes;
        window._appState.voteSha = freshSha;
        renderSuggestions(window._appState.issues, freshVotes, voterHash);
        return;
      }

      entry.count += 1;
      entry.voters = [...entry.voters, voterHash];
      freshVotes.issues[number] = entry;

      await GH.updateVotesFile(freshVotes, freshSha);

      window._appState.votes = freshVotes;
      window._appState.voteSha = freshSha;
      renderSuggestions(window._appState.issues, freshVotes, voterHash);
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      alert('Could not save vote. Please try again.');
    }
  });

})();
