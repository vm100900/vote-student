# Setup Instructions

## Security Model

**The GitHub PAT in `js/config.js` is visible to anyone who loads the site.** Students can view it via browser DevTools or `curl`. This is an accepted trade-off for a no-backend static site. Understand these implications:

- The token can create/close issues and edit `data/votes.json` in this one repo — that is all. It has no access to any other repo.
- **Never add other repos to this token's scope.** Keep it scoped to the single suggestions repo only.
- **Use a short expiry** (one semester recommended, not 1 year). Rotate the token at the end of each school year or immediately if abuse occurs.
- The admin password is UI gating only — it hides the admin panel buttons, but anyone with the PAT can call the GitHub API directly. Use a long, unique passphrase (not `ClassVote2025!`).
- Issues that are "deleted" via the admin panel are only closed on GitHub, not permanently erased. They are visible in the repo's Issues tab (closed filter). This is fine for anonymous suggestions.

## 1. Create the GitHub repo
Create a new **public** repo on GitHub (e.g. `class-suggestions`).

## 2. Create a fine-grained PAT
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Under "Repository access", select "Only select repositories" → choose your new repo
4. Under "Permissions", set:
   - Issues: Read and write
   - Contents: Read and write
5. Set expiry to **one semester** (not 1 year). Generate and copy the token.

## 3. Configure the site
Edit `js/config.js` and fill in:
- `token`: your PAT from step 2
- `owner`: your GitHub username
- `repo`: your repo name

## 4. Create required GitHub labels
In your repo, go to Issues → Labels and create these labels (exact names):
- `pinned`
- `chosen`
- `suggestion`

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
