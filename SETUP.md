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
