(function () {
  window._appState = { issues: [], votes: null, voteSha: null, voterHash: null };

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
    footer.appendChild(chips);

    const voteWrap = document.createElement('div');
    voteWrap.className = 'vote-wrap';

    const countEl = document.createElement('span');
    countEl.className = 'vote-count';
    countEl.textContent = issueVotes.count;
    voteWrap.appendChild(countEl);

    if (!votingOpen) {
      const btn = document.createElement('button');
      btn.className = 'closed-btn';
      btn.disabled = true;
      btn.textContent = 'Voting closed';
      voteWrap.appendChild(btn);
    } else if (hasVoted) {
      const btn = document.createElement('button');
      btn.className = 'voted-btn';
      btn.disabled = true;
      btn.textContent = '✓ Voted';
      voteWrap.appendChild(btn);
    } else {
      const btn = document.createElement('button');
      btn.className = 'vote-btn';
      btn.dataset.action = 'vote';
      btn.dataset.number = issue.number;
      btn.innerHTML = '↑ Vote';
      voteWrap.appendChild(btn);
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

    pinnedSection.hidden = pinned.length === 0;
    pinned.forEach(i => pinnedList.appendChild(buildCard(i, votesData, voterHash, votesData.votingOpen)));

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

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => {
      document.getElementById('suggestions-list').innerHTML =
        '<p class="loading-msg">Could not load suggestions.</p>';
      console.error(err);
    });

    const dialog = document.getElementById('submit-dialog');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const titleField = document.getElementById('title-field');
    const descField = document.getElementById('desc-field');
    const titleCount = document.getElementById('title-count');
    const descCount = document.getElementById('desc-count');

    document.getElementById('add-btn')?.addEventListener('click', () => dialog.showModal());
    cancelBtn?.addEventListener('click', () => dialog.close());

    titleField?.addEventListener('input', () => { titleCount.textContent = titleField.value.length; });
    descField?.addEventListener('input', () => { descCount.textContent = descField.value.length; });

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
        titleCount.textContent = '0';
        descCount.textContent = '0';

        const [issues, { sha, content: votes }] = await Promise.all([
          GH.fetchIssues(),
          GH.fetchVotesFile(),
        ]);
        window._appState = { ...window._appState, issues, votes, voteSha: sha };
        renderSuggestions(issues, votes, window._appState.voterHash);
      } catch (err) {
        console.error(err);
        alert('Could not submit. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    });
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="vote"]');
    if (!btn) return;

    const number = String(btn.dataset.number);
    const { voterHash } = window._appState;
    btn.disabled = true;

    try {
      const { sha: freshSha, content: freshVotes } = await GH.fetchVotesFile();
      const entry = freshVotes.issues[number] || { count: 0, voters: [] };

      if (entry.voters.includes(voterHash)) {
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
