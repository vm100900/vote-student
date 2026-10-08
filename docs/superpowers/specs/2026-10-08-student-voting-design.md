# Student Suggestion & Voting Website — Design Spec

**Date:** 2026-10-08  
**Project:** vote_student  
**Stack:** Vanilla HTML/CSS/JS · Material 3 Expressive · GitHub Issues API · GitHub Pages

---

## 1. Overview

A static website hosted on GitHub Pages where students can anonymously submit suggestions and vote on them. A teacher has an admin panel (password-protected) with full moderation controls. Google and all other crawlers are blocked via `robots.txt`.

---

## 2. File Structure

```
vote_student/
├── index.html              # Student-facing page
├── admin.html              # Teacher admin panel
├── robots.txt              # Blocks all crawlers
├── SETUP.md                # Setup instructions (token, Pages config)
├── css/
│   └── style.css           # M3 Expressive tokens + layout
├── js/
│   ├── config.js           # GitHub token, repo details, admin password hash
│   ├── github.js           # All GitHub API calls
│   ├── voter.js            # UUID generation, cookie+localStorage management
│   ├── app.js              # Student page logic
│   └── admin.js            # Admin panel logic
└── data/
    └── votes.json          # Vote counts + hashed voter UUIDs per issue
```

---

## 3. Data Architecture

### Suggestions — GitHub Issues
- Each suggestion = one GitHub Issue (title + optional body)
- Labels used for status:
  - `pinned` — shown at top of list
  - `chosen` — marked with green chip
  - Default open issue = normal suggestion
  - Closed issue = deleted/hidden (filtered out on fetch)

### Votes — `data/votes.json`
Stored in the repo, read/written via GitHub Contents API.

```json
{
  "votingOpen": true,
  "issues": {
    "42": {
      "count": 7,
      "voters": ["a3f1b2c3...", "d4e5f6a7..."]
    }
  }
}
```

- `votingOpen` — global toggle controlled by admin
- `voters` — array of SHA-256 hashes of voter UUIDs (no raw UUIDs stored)
- Vote write flow: fetch file → decode base64 → parse JSON → add voter hash + increment count → re-encode → commit back via PUT
- **Race condition:** simultaneous votes can cause a lost update (last write wins). Acceptable for a classroom tool where votes are infrequent.

---

## 4. Voter Identity & Duplicate Prevention

**Primary mechanism:** `crypto.randomUUID()` stored in both a cookie and `localStorage`.

### Cookie consent flow
1. On first visit, show an M3 banner: *"This site uses a cookie to remember your vote so you can't vote twice. No personal data is collected."*
2. **Accept:** UUID saved to both `localStorage` (`voter_id`) and a cookie (`voter_id`, 1-year expiry, `SameSite=Strict`)
3. **Decline:** UUID saved to `localStorage` only; a note explains that clearing browser data resets their vote

### Vote check flow (on page load)
1. Read cookie → if present, use it and sync to `localStorage`
2. Else read `localStorage` → if present, use it and sync to cookie (if consented)
3. Else generate new UUID, store per consent choice above
4. Hash UUID with SHA-256
5. Fetch `votes.json` — for each issue, mark as voted if hash is in `voters` array

### Chromebook note
Standard browser fingerprinting (userAgent, screen size, timezone) is ineffective in school Chromebook environments because all devices share identical profiles. The UUID-per-Chrome-profile approach is reliable because each student's Google account gives them an isolated browser profile with separate storage. A student who deliberately clears browser data can re-vote — this is an accepted limitation.

---

## 5. UI — Student Page (`index.html`)

### Layout
- **Top app bar** — site/class name, M3 Expressive color scheme
- **Pinned section** — tonal container cards for pinned suggestions (shown first)
- **Suggestions list** — elevated cards, newest-first by default
- **FAB** (bottom-right) — "Add a suggestion" → opens M3 bottom sheet dialog

### Suggestion card
- Title (bold)
- Description snippet (truncated, expandable)
- Vote count + animated tonal vote button (thumbs up icon)
- "Chosen" badge — green filled chip, shown if `chosen` label present
- Vote button states:
  - **Default:** tonal filled, clickable
  - **Voted:** filled "Voted ✓" chip, disabled
  - **Voting closed:** outlined, disabled, "Voting closed" label

### Submit dialog (bottom sheet)
- Title field (required, max 120 chars)
- Description field (optional, max 500 chars)
- Submit button — creates a GitHub Issue via API

---

## 6. UI — Admin Page (`admin.html`)

### Authentication
- Full-screen M3 dialog on load, no content visible behind it
- Teacher enters password → browser SHA-256 hashes it → compared against stored hash in `config.js`
- On match: dialog dismissed, admin session stored in `sessionStorage` (clears on tab close)
- On mismatch: shake animation, error text, no lockout (classroom tool)

### Admin controls
- **Global toggle** in top bar: "Voting open / closed" (M3 switch) — writes `votingOpen` to `votes.json`
- Per-card icon buttons:
  - 📌 Pin / Unpin — adds/removes `pinned` label on the Issue
  - ✓ Mark as Chosen / Unchosen — adds/removes `chosen` label
  - 🗑 Delete — closes the GitHub Issue (hidden from students)
- **Change password** button — opens a dialog, teacher types new password, SHA-256 hash is displayed with the exact `config.js` line to copy-paste; the teacher then edits `js/config.js` via GitHub's web editor (no git install required) and saves

---

## 7. Security

| Concern | Approach |
|---|---|
| Crawler access | `robots.txt`: `User-agent: * / Disallow: /` |
| Admin auth | SHA-256 hash of password stored in `config.js`; plaintext never leaves device |
| Admin session | `sessionStorage` — clears when tab is closed |
| GitHub PAT exposure | Fine-grained PAT scoped to this repo only (Issues + Contents read/write); worst case is spam suggestions |
| Voter privacy | Only SHA-256 hashes of UUIDs stored in `votes.json`; no personal data |

### Starter admin password
**Plaintext:** `ClassVote2025!`  
SHA-256 hash stored in `config.js` — share only the plaintext with the teacher.

---

## 8. GitHub Setup (documented in `SETUP.md`)

1. Create a new public GitHub repo
2. Create a fine-grained PAT:
   - Scope: this repo only
   - Permissions: Issues (read/write), Contents (read/write)
3. Paste token + repo details into `js/config.js`
4. Enable GitHub Pages (Settings → Pages → Deploy from branch `main`, root `/`)
5. Create `data/votes.json` with initial content: `{"votingOpen":true,"issues":{}}`

---

## 9. Out of Scope

- User accounts / authentication for students
- Email notifications
- Comment threads on suggestions
- Multiple classrooms / multi-tenant support
- Rate limiting beyond UUID-per-profile
