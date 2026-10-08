# Student Suggestion & Voting Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static GitHub Pages website where students anonymously submit and vote on suggestions, with a teacher admin panel for full moderation.

**Architecture:** Vanilla HTML/CSS/JS with no build step. GitHub Issues store suggestions; `data/votes.json` in the repo stores vote counts + hashed voter UUIDs, read/written via GitHub Contents API. Admin auth is a client-side SHA-256 password hash check.

**Tech Stack:** HTML5 · CSS3 · Vanilla JS (ES2022) · Material Web (`@material/web` via CDN) · GitHub Issues API · GitHub Contents API · GitHub Pages

## Global Constraints

- No build step — all files are plain HTML/CSS/JS, deployed as-is to GitHub Pages
- Material Web loaded via CDN importmap (`https://esm.run/@material/web/`)
- All GitHub API calls use `Authorization: Bearer <token>` with a fine-grained PAT
- Admin password stored only as its SHA-256 hex digest in `js/config.js` — never plaintext
- Starter password plaintext: `ClassVote2025!`
- Voter UUID stored in both cookie (`voter_id`, 1-year, `SameSite=Strict`) and `localStorage` key `voter_id`
- Only SHA-256 hashes of voter UUIDs are written to `data/votes.json` — no raw UUIDs
- `robots.txt` must contain `User-agent: *` and `Disallow: /` to block all crawlers
- All `md-*` component imports come from `@material/web/all.js`

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Student page markup + Material Web import |
| `admin.html` | Admin page markup + password dialog |
| `robots.txt` | Block all crawlers |
| `SETUP.md` | One-time setup instructions for the developer |
| `data/votes.json` | Vote counts + voter hashes (committed to repo) |
| `css/style.css` | M3 Expressive color tokens, layout, card styles, animations |
| `js/config.js` | `CONFIG` object: token, owner, repo, admin password hash |
| `js/github.js` | All GitHub API functions (exported on `window.GH`) |
| `js/voter.js` | UUID, cookie/localStorage management, SHA-256 (exported on `window.Voter`) |
| `js/app.js` | Student page: render, submit, vote |
| `js/admin.js` | Admin page: auth, render, moderation actions |

---

## Task 1: Scaffold, config, robots, and SETUP

**Files:**
- Create: `index.html`
- Create: `admin.html`
- Create: `robots.txt`
- Create: `SETUP.md`
- Create: `js/config.js`
- Create: `data/votes.json`
- Create: `css/style.css` (tokens only — full styles added in Task 4)

**Interfaces:**
- Produces: `window.CONFIG` with shape `{ token, owner, repo, adminHash }`

- [ ] **Step 1: Create `robots.txt`**

```
User-agent: *
Disallow: /
```

- [ ] **Step 2: Create `data/votes.json`**

```json
{"votingOpen":true,"issues":{}}
```

- [ ] **Step 3: Generate the SHA-256 hash for `ClassVote2025!`**

Open any browser tab and run in the console:
```javascript
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ClassVote2025!'));
console.log([...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join(''));
```
Copy the output — it's the `adminHash` value for `config.js`.

- [ ] **Step 4: Create `js/config.js`**

Replace `PASTE_HASH_HERE` with the hash from Step 3. Replace the token/owner/repo once you've created the GitHub repo and PAT (see `SETUP.md`).

```javascript
const CONFIG = {
  token:     'REPLACE_WITH_YOUR_PAT',
  owner:     'REPLACE_WITH_YOUR_GITHUB_USERNAME',
  repo:      'REPLACE_WITH_YOUR_REPO_NAME',
  adminHash: 'PASTE_HASH_HERE',
};
```

- [ ] **Step 5: Create `SETUP.md`**

```markdown
# Setup Instructions

## 1. Create the GitHub repo
Create a new **public** repo on GitHub (e.g. `class-suggestions`).

## 2. Create a fine-grained PAT
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Set expiration to your preference (1 year recommended)
4. Under "Repository access", select "Only select repositories" → choose your new repo
5. Under "Permissions", set:
   - Issues: Read and write
   - Contents: Read and write
6. Generate and copy the token

## 3. Configure the site
Edit `js/config.js` and fill in:
- `token`: your PAT from step 2
- `owner`: your GitHub username
- `repo`: your repo name

## 4. Create required GitHub labels
In your repo, go to Issues → Labels and create these two labels (exact names):
- `pinned`
- `chosen`

## 5. Enable GitHub Pages
Go to repo Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Folder: `/` (root) → Save.

## 6. Push the site files
Push all files in this repo to the `main` branch. GitHub Pages will serve the site at:
`https://<your-username>.github.io/<your-repo>/`

## Changing the admin password
1. Open any browser console and run:
   ```javascript
   const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourNewPassword'));
   console.log([...new Uint8Array(buf)].map(x => x.toString(16).padStart(2,'0')).join(''));
   ```
2. Copy the output hash
3. Edit `js/config.js`, replace `adminHash` with the new hash
4. Commit and push — GitHub Pages redeploys automatically
```

- [ ] **Step 6: Create `index.html` skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Suggestions</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@400;500;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script type="importmap">
    {"imports":{"@material/web/":"https://esm.run/@material/web/"}}
  </script>
  <script type="module">
    import 'https://esm.run/@material/web/all.js';
  </script>
</head>
<body>
  <header class="top-app-bar">
    <span class="app-title">Class Suggestions</span>
  </header>
  <div id="cookie-banner" class="cookie-banner" hidden>
    <p>This site uses a cookie to remember your vote so you can't vote twice. No personal data is collected.</p>
    <div class="cookie-actions">
      <md-filled-button id="cookie-accept">Accept</md-filled-button>
      <md-outlined-button id="cookie-decline">Decline</md-outlined-button>
    </div>
  </div>
  <main>
    <section id="pinned-section" hidden>
      <h2 class="section-label">Pinned</h2>
      <div id="pinned-list"></div>
    </section>
    <section>
      <div id="suggestions-list"><p class="loading-msg">Loading suggestions…</p></div>
    </section>
  </main>
  <md-fab id="add-fab" label="Add suggestion" extended>
    <md-icon slot="icon">add</md-icon>
  </md-fab>
  <md-dialog id="submit-dialog">
    <div slot="headline">New suggestion</div>
    <form slot="content" id="submit-form" method="dialog">
      <md-outlined-text-field id="title-field" label="Title" required maxlength="120" style="width:100%"></md-outlined-text-field>
      <md-outlined-text-field id="desc-field" label="Description (optional)" type="textarea" rows="3" maxlength="500" style="width:100%;margin-top:16px"></md-outlined-text-field>
    </form>
    <div slot="actions">
      <md-text-button id="cancel-btn">Cancel</md-text-button>
      <md-filled-button id="submit-btn">Submit</md-filled-button>
    </div>
  </md-dialog>
  <script src="js/config.js"></script>
  <script src="js/github.js"></script>
  <script src="js/voter.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create `admin.html` skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Class Suggestions</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@400;500;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script type="importmap">
    {"imports":{"@material/web/":"https://esm.run/@material/web/"}}
  </script>
  <script type="module">
    import 'https://esm.run/@material/web/all.js';
  </script>
</head>
<body>
  <header class="top-app-bar">
    <span class="app-title">Admin Panel</span>
    <div class="voting-toggle-wrap">
      <span class="toggle-label">Voting</span>
      <md-switch id="voting-toggle"></md-switch>
    </div>
  </header>
  <md-dialog id="auth-dialog" open>
    <div slot="headline">Teacher login</div>
    <form slot="content" id="auth-form" method="dialog">
      <md-outlined-text-field id="password-field" label="Password" type="password" style="width:100%"></md-outlined-text-field>
      <p id="auth-error" class="auth-error" hidden>Incorrect password</p>
    </form>
    <div slot="actions">
      <md-filled-button id="login-btn">Log in</md-filled-button>
    </div>
  </md-dialog>
  <main>
    <section id="pinned-section" hidden>
      <h2 class="section-label">Pinned</h2>
      <div id="pinned-list"></div>
    </section>
    <section>
      <div id="suggestions-list"><p class="loading-msg">Log in to view suggestions.</p></div>
    </section>
  </main>
  <script src="js/config.js"></script>
  <script src="js/github.js"></script>
  <script src="js/voter.js"></script>
  <script src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 8: Create `css/style.css` with M3 tokens only (full styles come in Task 4)**

```css
/* M3 Expressive color tokens */
:root {
  --md-sys-color-primary: #6750A4;
  --md-sys-color-on-primary: #FFFFFF;
  --md-sys-color-primary-container: #EADDFF;
  --md-sys-color-on-primary-container: #21005D;
  --md-sys-color-secondary: #625B71;
  --md-sys-color-on-secondary: #FFFFFF;
  --md-sys-color-secondary-container: #E8DEF8;
  --md-sys-color-tertiary: #7D5260;
  --md-sys-color-tertiary-container: #FFD8E4;
  --md-sys-color-surface: #FFFBFE;
  --md-sys-color-on-surface: #1C1B1F;
  --md-sys-color-surface-variant: #E7E0EC;
  --md-sys-color-on-surface-variant: #49454F;
  --md-sys-color-outline: #79747E;
  --md-sys-color-background: #F4EEFF;
  --md-sys-color-error: #B3261E;
  --md-sys-color-on-error: #FFFFFF;

  /* Shape — M3 Expressive uses extra-large rounding */
  --md-sys-shape-corner-small: 8px;
  --md-sys-shape-corner-medium: 16px;
  --md-sys-shape-corner-large: 24px;
  --md-sys-shape-corner-extra-large: 32px;
  --md-sys-shape-corner-full: 9999px;

  /* Spring transition */
  --spring: cubic-bezier(0.2, 0, 0, 1.4);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Roboto Flex', Roboto, sans-serif;
  background: var(--md-sys-color-background);
  color: var(--md-sys-color-on-surface);
  min-height: 100vh;
}
```

- [ ] **Step 9: Verify scaffold**

Start a local server: `python3 -m http.server 8080` from the project root.
Open `http://localhost:8080` — you should see the header, "Loading suggestions…" text, and an FAB.
Open `http://localhost:8080/admin.html` — you should see a password dialog blocking the page.
No console errors (Material Web load errors are fine on localhost without a module server — test in next task).

- [ ] **Step 10: Commit**

```bash
git add index.html admin.html robots.txt SETUP.md js/config.js data/votes.json css/style.css
git commit -m "feat: project scaffold with M3 tokens and config"
```

---

## Task 2: GitHub API module (`js/github.js`)

**Files:**
- Create: `js/github.js`

**Interfaces:**
- Consumes: `window.CONFIG.token`, `window.CONFIG.owner`, `window.CONFIG.repo`
- Produces: `window.GH` with methods:
  - `GH.fetchIssues()` → `Promise<Issue[]>`
  - `GH.createIssue(title: string, body: string)` → `Promise<Issue>`
  - `GH.closeIssue(number: number)` → `Promise<void>`
  - `GH.addLabel(number: number, label: string)` → `Promise<void>`
  - `GH.removeLabel(number: number, label: string)` → `Promise<void>`
  - `GH.fetchVotesFile()` → `Promise<{ sha: string, content: VotesData }>`
  - `GH.updateVotesFile(content: VotesData, sha: string)` → `Promise<void>`
  - where `VotesData = { votingOpen: boolean, issues: { [number]: { count: number, voters: string[] } } }`

- [ ] **Step 1: Create `js/github.js`**

```javascript
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
```

- [ ] **Step 2: Verify in browser console**

After filling in real values in `config.js`, open `http://localhost:8080` and run in the console:
```javascript
GH.fetchIssues().then(console.log).catch(console.error)
```
Expected: array (empty `[]` if no issues yet, or a 401 error if token is wrong).

```javascript
GH.fetchVotesFile().then(console.log).catch(console.error)
```
Expected: `{ sha: "abc...", content: { votingOpen: true, issues: {} } }`

- [ ] **Step 3: Commit**

```bash
git add js/github.js
git commit -m "feat: GitHub API module"
```

---

## Task 3: Voter identity module (`js/voter.js`)

**Files:**
- Create: `js/voter.js`

**Interfaces:**
- Produces: `window.Voter` with methods:
  - `Voter.init()` → `void` — call on page load; shows consent banner if needed
  - `Voter.getHashedId()` → `Promise<string>` — SHA-256 hex of the voter UUID
  - `Voter.hasConsented()` → `boolean`

- [ ] **Step 1: Create `js/voter.js`**

```javascript
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
```

- [ ] **Step 2: Verify in browser console**

Open `http://localhost:8080`, then in the console:
```javascript
// Should return a 64-char hex string
Voter.getHashedId().then(console.log)

// Should be false on first visit
console.log(Voter.hasConsented())
```
Click "Accept" on the banner — `Voter.hasConsented()` should now return `true` and `document.cookie` should contain `voter_id`.

- [ ] **Step 3: Commit**

```bash
git add js/voter.js
git commit -m "feat: voter UUID module with cookie consent"
```

---

## Task 4: Student page — layout, styles, and suggestion rendering

**Files:**
- Modify: `css/style.css` (add full layout + card styles)
- Create: `js/app.js` (render logic only — submit/vote actions in Task 5)

**Interfaces:**
- Consumes: `window.GH.fetchIssues()`, `window.GH.fetchVotesFile()`, `window.Voter.init()`, `window.Voter.getHashedId()`
- Produces: `window._appState` with shape `{ issues: Issue[], votes: VotesData, voteSha: string, voterHash: string }`

- [ ] **Step 1: Add full layout + card styles to `css/style.css`**

Append to the existing file:
```css
/* ── Layout ── */
.top-app-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 64px;
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  border-radius: 0 0 var(--md-sys-shape-corner-large) var(--md-sys-shape-corner-large);
  box-shadow: 0 2px 12px rgba(103,80,164,0.25);
}

.app-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

main {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px 16px 120px;
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
  margin: 16px 0 8px;
}

/* ── Cookie banner ── */
.cookie-banner {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.875rem;
  position: sticky;
  top: 64px;
  z-index: 9;
}

.cookie-banner p { flex: 1; min-width: 200px; }
.cookie-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Suggestion card ── */
.suggestion-card {
  background: var(--md-sys-color-surface);
  border-radius: var(--md-sys-shape-corner-extra-large);
  padding: 20px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(103,80,164,0.08);
  transition: box-shadow 200ms var(--spring), transform 200ms var(--spring);
  position: relative;
}

.suggestion-card:hover {
  box-shadow: 0 4px 16px rgba(103,80,164,0.18);
  transform: translateY(-2px);
}

.suggestion-card.pinned {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  border: 2px solid var(--md-sys-color-primary);
}

.card-title {
  font-size: 1.0625rem;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.3;
}

.card-body {
  font-size: 0.875rem;
  color: var(--md-sys-color-on-surface-variant);
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-body.expanded { -webkit-line-clamp: unset; }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.card-chips { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

.chosen-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #14AE5C;
  color: #fff;
  border-radius: var(--md-sys-shape-corner-full);
  padding: 4px 12px;
  font-size: 0.8125rem;
  font-weight: 600;
}

/* ── Admin card extras ── */
.admin-actions { display: flex; gap: 4px; }

/* ── Vote button ── */
.vote-count {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--md-sys-color-primary);
  min-width: 24px;
  text-align: right;
}

/* ── FAB positioning ── */
md-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 8;
}

/* ── Admin voting toggle ── */
.voting-toggle-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--md-sys-color-on-primary);
}
.toggle-label { font-size: 0.875rem; }

/* ── Auth error ── */
.auth-error {
  color: var(--md-sys-color-error);
  font-size: 0.875rem;
  margin-top: 8px;
}

/* ── Loading / empty ── */
.loading-msg {
  text-align: center;
  color: var(--md-sys-color-on-surface-variant);
  padding: 40px 0;
}

/* ── Shake animation for wrong password ── */
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
.shake { animation: shake 0.4s ease; }
```

- [ ] **Step 2: Create `js/app.js` — render logic**

```javascript
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

  document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => {
      document.getElementById('suggestions-list').innerHTML =
        `<p class="loading-msg">Could not load suggestions. Check your config.js setup.</p>`;
      console.error(err);
    });
  });

})();
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8080` with a valid `config.js`.
- Page loads with "No suggestions yet" or a list of issues if any exist
- Pinned issues (with `pinned` label) appear in the pinned section
- Chosen issues show the green "✓ Chosen" chip
- Cards have rounded corners, hover lift effect
- FAB is visible bottom-right
- Cookie banner appears on first visit

- [ ] **Step 4: Commit**

```bash
git add css/style.css js/app.js
git commit -m "feat: student page render with M3 Expressive card layout"
```

---

## Task 5: Student page — submit suggestion and vote actions

**Files:**
- Modify: `js/app.js` (append submit + vote handlers)

**Interfaces:**
- Consumes: `window._appState`, `renderSuggestions` (same IIFE scope), `window.GH`, `window.Voter`

- [ ] **Step 1: Append submit + vote logic to `js/app.js`**

Add this block at the end of the IIFE in `js/app.js`, just before the final `})();`:

```javascript
  // ── Submit dialog ──
  document.addEventListener('DOMContentLoaded', () => {
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
        const issue = await GH.createIssue(title, descField.value.trim());
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
```

- [ ] **Step 2: Verify in browser**

- Click the FAB → submit dialog opens
- Enter a title and click Submit → a new GitHub Issue is created, card appears in list
- Click Vote on a card → count increments, button changes to "Voted ✓"
- Reload the page → the "Voted ✓" state persists (voter hash matches)
- Open the page in a different browser profile → vote button is clickable again

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: submit suggestion and vote actions"
```

---

## Task 6: Admin page — authentication

**Files:**
- Create: `js/admin.js` (auth only — render/actions in Task 7)

**Interfaces:**
- Consumes: `window.CONFIG.adminHash`, `window.Voter.init()`
- Produces: `window._adminAuthed` boolean; calls `window._loadAdmin()` on success

- [ ] **Step 1: Create `js/admin.js`**

```javascript
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
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8080/admin.html`.
- Password dialog is visible on load; page content is not accessible behind it
- Enter wrong password → error message appears, dialog shakes
- Enter `ClassVote2025!` → dialog closes (nothing loads yet since `_loadAdmin` isn't defined — that's expected until Task 7)
- Reload page → dialog reappears (sessionStorage persists within tab; on reload it should auto-login since sessionStorage survives reload but not tab close)

- [ ] **Step 3: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin password auth with SHA-256 and session persistence"
```

---

## Task 7: Admin page — render suggestions and moderation controls

**Files:**
- Modify: `js/admin.js` (append render + action handlers)

**Interfaces:**
- Consumes: `window.GH`, `window._adminAuthed`
- Produces: full admin UI with per-card controls and global voting toggle

- [ ] **Step 1: Append render + moderation logic to `js/admin.js`**

Add this block inside the IIFE in `js/admin.js`, just before the final `})();`:

```javascript
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
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8080/admin.html` and log in with `ClassVote2025!`.
- All suggestions render with pin, chosen, and delete icon buttons
- Click Pin → card moves to pinned section; click again → moves back
- Click Chosen → green chip appears; click again → chip disappears
- Click Delete → confirmation prompt; on confirm, issue closes and card disappears
- Toggle "Voting" switch → reload `http://localhost:8080` and verify vote buttons are disabled/enabled accordingly

- [ ] **Step 3: Commit**

```bash
git add js/admin.js
git commit -m "feat: admin panel with full moderation controls and voting toggle"
```

---

## Task 8: Final wiring, GitHub Pages config, and push

**Files:**
- Verify: all files are committed and `config.js` has real values
- Verify: GitHub repo has `pinned` and `chosen` labels
- Verify: GitHub Pages is enabled

- [ ] **Step 1: Double-check `config.js` has real values**

```javascript
const CONFIG = {
  token:     'github_pat_...',   // real PAT from SETUP.md step 2
  owner:     'your-username',
  repo:      'your-repo-name',
  adminHash: 'actual-sha256-hash-of-ClassVote2025!',
};
```

- [ ] **Step 2: Verify `robots.txt`**

```
User-agent: *
Disallow: /
```

- [ ] **Step 3: Verify `data/votes.json` is committed**

```bash
cat data/votes.json
# Expected: {"votingOpen":true,"issues":{}}
```

- [ ] **Step 4: Final smoke test on localhost**

- Student page: submit a suggestion, vote on it, reload — vote persists
- Admin page: log in, pin/choose/delete a suggestion, toggle voting
- Cookie banner: clear localStorage, reload — banner reappears
- `robots.txt`: visit `http://localhost:8080/robots.txt` — see the disallow rule

- [ ] **Step 5: Push to GitHub and verify Pages deployment**

```bash
git push origin main
```

Wait ~60 seconds, then open `https://<your-username>.github.io/<your-repo>/` and verify the site loads.
Open `https://<your-username>.github.io/<your-repo>/admin.html` and verify the password dialog appears.

- [ ] **Step 6: Final commit if any last-minute fixes**

```bash
git add -A
git commit -m "chore: final wiring and deploy verification"
git push origin main
```
