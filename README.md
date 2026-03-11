<h1 align="center">
  Sync Contribution Graph
</h1>

![GitHub Contributions Graph full squares that have various shades of green](img/cover-photo.png)

Syncs contribution activity from a source GitHub account (e.g. an EMU/work/private account) to a target repository by creating backdated empty commits that match the source account's contribution history.

## Overview

You need two repositories:

1. **This repo** (`sync-contribution-graph`) — contains the tool's source code. Clone it anywhere and run it from here.
2. **A target repo** — a separate, dedicated repository where the dummy commits will be pushed. This is the repo that will show up on your personal contribution graph. Create it on GitHub (e.g. `contributions`) and clone it locally.

The tool fetches contribution counts from the source account via the GitHub GraphQL API, generates backdated empty commits to match those counts, and force-pushes them to the target repo. It skips days that are already synced (idempotent — safe to re-run).

## Setup

### 1. Prepare the target repository

Create a new empty repository on GitHub (e.g. named `contributions`). Clone it locally:

```bash
git clone https://github.com/YOUR_USERNAME/contributions.git
cd contributions
```

### 2. Set up this tool

Clone this repository and install dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/sync-contribution-graph.git
cd sync-contribution-graph
npm install
```

### 3. Create a GitHub PAT for the source account

Go to **GitHub Settings → Developer Settings → Personal access tokens → Tokens (classic)** on the **source (EMU/work/private) account** and create a token with:

- `read:user` — required to read contribution data (includes private and org contributions)

If the source account belongs to an enterprise organization, you must also **authorize the token for each organization** via "Configure SSO" after creating it. Note: if you add new scopes to an existing token, GitHub will reset SSO authorization and you will need to re-authorize for all orgs again.

### 4. Create a GitHub PAT for your personal account (if needed)

If your git credentials are not already configured (e.g. via SSH or a credential manager), go to **GitHub Settings → Developer Settings → Personal access tokens → Tokens (classic)** on your **personal account** and create a token with:

- `public_repo` — sufficient if the target repo is public
- `repo` — required if the target repo is private

This token is used only to push commits to the target repo.

### 5. Run the tool from the target repo directory

```bash
cd /path/to/contributions
node /path/to/sync-contribution-graph/src/interface.js
```

> On Windows, run from Git Bash.

Or add an npm script / alias for convenience.

## Prompts

The tool will ask for the following:

| Prompt | Description |
| --- | --- |
| **Source GitHub username** | The EMU, work, or private account whose contributions you want to sync. |
| **GitHub PAT for the source account** | Classic PAT with `read:user` scope. Must be SSO-authorized if the account is in an enterprise org. |
| **GitHub PAT for your personal account** | Used to push commits to the target repo. Leave blank if your git credentials are already configured (e.g. via SSH or credential manager). |
| **Email for commits** | The email that will be used as the commit author. Use your GitHub noreply address (`ID+username@users.noreply.github.com`, found in GitHub Settings → Emails) to avoid exposing your real address. |
| **Start date** | The earliest date to sync from, in `YYYY-MM-DD` format. Contributions from this date through today will be fetched. Supports ranges spanning multiple years. |
| **Execute mode** | Choose to generate a bash script only, or generate and execute immediately. Execution will force-push to the target repo — this is difficult to undo. |
| **Confirm** | Final confirmation before proceeding. |

## How it works

1. Fetches contribution counts per day from the source account using the GitHub GraphQL API (authenticated as the source account via its PAT).
2. Checks which days are already synced in the target repo by scanning existing commits for the `"Rewriting History!"` message.
3. Generates a bash script with backdated `git commit --allow-empty` commands for any days that still need commits.
4. Either writes the script to a temp file for manual review, or executes it immediately and force-pushes to origin.

Re-running the tool is safe — it will only create commits for days not yet present.

## Undoing commits

If you want to remove the synced commits, you can either:

- Delete the target repository entirely (commits will disappear from your graph)
- Run `git reset --hard <commit>` in the target repo to roll back to a specific point, then force-push

## Security

Explore the [code](src/index.js) — it's small and has minimal dependencies.

The tool uses the GitHub GraphQL API authenticated as the source account. It reads contribution counts only — it does not access private code, issues, pull request content, or any repository data. No private company code is exposed.

Your PATs are never stored anywhere — they are used in memory only during the session, and embedded in the generated bash script's `git push` URL (stored in your system's temp directory).

## License

[MIT](LICENSE)
