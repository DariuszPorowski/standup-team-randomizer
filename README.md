# Standup team randomizer

A static, backend-free standup order tool with a GitHub Primer-inspired UI.
The complete team configuration lives in the URL, so a copied link recreates
the same members and attendance state in any browser.

## Features

- Add, edit, and remove members in the UI.
- Store a display name and optional GitHub username for each member.
- Show GitHub avatars when available, with initials as the fallback.
- Mark absent members without deleting them from the shared team.
- Generate and copy a Fisher-Yates randomized speaking order.
- Link each speaker to their open assigned repository issues or GitHub Project items.
- Share the selected GitHub repository or project with the team configuration.
- Update the shareable URL after every member or attendance change.
- Follow the system light or dark theme, with explicit overrides.

## Development

Requirements:

- Node.js 22.13 or newer
- npm 10 or newer

```shell
npm install
npm run dev
```

The preview server prints the first available URL starting at
`http://127.0.0.1:4173`.

Run the executable checks and production build with:

```shell
npm test
npm run build
```

The project has no package dependencies. The build uses Node's TypeScript
transformer and writes browser-ready ES modules to `dist/`.

## URL state

The compact URL schema uses one JSON tuple per repeated `m` parameter:

```text
?m=["Ada Lovelace","octocat"]&m=["Grace Hopper","",0]
```

Each tuple stores the display name and optional GitHub username. The presence
flag is omitted when the member is present and stored as `0` when absent. The
app uses `history.replaceState`, so edits immediately update both the address
bar and the read-only copy field without reloading the page. Team data is not
stored on a server or in local storage; only the theme preference is local.

An optional `gh` parameter stores the path of a GitHub repository or Project,
without the `https://github.com/` origin. In the speaking order, repository
links show open issues assigned to that member. Project links show open issues
and pull requests assigned to that member. Long-form and legacy parameters are
not supported.

## Deployment

The [GitHub Pages workflow](.github/workflows/deploy-pages.yml) tests the app,
builds it, and publishes `dist/` whenever `main` changes. In the repository's
**Settings > Pages** screen, set **Build and deployment > Source** to
**GitHub Actions** once, then push to `main` or run the workflow manually.

For other static file hosts, publish the contents of `dist/`. All asset
references are relative, so the artifact works at a domain root or a
repository subpath without additional configuration.
