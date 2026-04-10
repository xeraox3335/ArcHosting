# Arc Control Desktop (Electron)

This workspace now runs as a real desktop app using **Electron**.

## What was set up

- Electron project scaffold at workspace root
- `main.js` Electron entrypoint loading `assets/index.html`
- Dashboard/create UI lives under `assets/`
- `assets/create/create.html` contains the server creation flow

## Run

From `d:\ArcHosting`:

1. Install dependencies: `npm install`
2. Start app: `npm start`

## Project layout

- `main.js` — Electron main process
- `package.json` — scripts and dependencies
- `assets/index.html` — dashboard UI
- `assets/app.js` — dashboard logic
- `assets/styles.css` — shared styling
- `assets/create/create.html` — create-server UI
- `assets/create/create.js` — create-server logic
- `assets/create/create.css` — create flow styling
- `concept/` — concept documentation and references

## Notes

- Backend workflows are still mocked (as requested)
- App is now runnable as a desktop shell and ready for backend integration later
