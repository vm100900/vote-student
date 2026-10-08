(function () {
  const BASE = 'https://api.github.com';

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (res.status === 204) return null;
    const text = await res.text();
    if (!res.ok) throw new Error(`GitHub ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }

  function repoPath(suffix) {
    return `/repos/${CONFIG.owner}/${CONFIG.repo}${suffix}`;
  }

  async function fetchIssues() {
    return apiFetch(repoPath('/issues?state=open&per_page=100&labels='));
  }

  async function createIssue(title, body) {
    return apiFetch(repoPath('/issues'), {
      method: 'POST',
      body: JSON.stringify({ title, body: body || '' }),
    });
  }

  async function closeIssue(number) {
    await apiFetch(repoPath(`/issues/${number}`), {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  async function addLabel(number, label) {
    await apiFetch(repoPath(`/issues/${number}/labels`), {
      method: 'POST',
      body: JSON.stringify({ labels: [label] }),
    });
  }

  async function removeLabel(number, label) {
    await apiFetch(repoPath(`/issues/${number}/labels/${encodeURIComponent(label)}`), {
      method: 'DELETE',
    });
  }

  async function fetchVotesFile() {
    const data = await apiFetch(repoPath('/contents/data/votes.json'));
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return { sha: data.sha, content };
  }

  async function updateVotesFile(content, sha) {
    await apiFetch(repoPath('/contents/data/votes.json'), {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Update votes',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content)))),
        sha,
      }),
    });
  }

  window.GH = {
    fetchIssues,
    createIssue,
    closeIssue,
    addLabel,
    removeLabel,
    fetchVotesFile,
    updateVotesFile,
  };
})();
