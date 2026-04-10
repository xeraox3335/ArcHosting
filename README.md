# Arc Control Desktop (Electron)

This workspace now runs as a real desktop app using **Electron**.

## What was set up

- Electron project scaffold at workspace root
- `main.js` Electron entrypoint loading root `index.html`
- Dashboard/create UI moved to root-level files
- `create.html` flow kept as part of the desktop app

## Run

From `d:\SharedHost`:

1. Install dependencies: `npm install`
2. Start app: `npm start`

## Project layout

- `main.js` — Electron main process
- `package.json` — scripts and dependencies
- `index.html` — dashboard UI
- `create.html` — server creation UI
- `app.js` / `create.js` — front-end logic
- `styles.css` / `create.css` — styling

## Notes

- Backend workflows are still mocked (as requested)
- App is now runnable as a desktop shell and ready for backend integration later
