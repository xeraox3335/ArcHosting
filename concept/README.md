# Arc Control concept (simplified)

This concept was simplified to match the exact flow:

1. On launch, a **GitHub login popup** is shown
2. **See repositories where you are a contributor**
3. **See who currently hosts the server**
4. If you are not host, click **Start Server** (this does **auto-pull**)
5. While you are host, the **full host interface** is visible
6. Clicking **Stop Server** uploads state and does **auto-push** before releasing host

## Files

- `index.html` — minimal UI structure
- `styles.css` — clean, compact styling
- `app.js` — simple state machine for login, hosting, auto-pull on start, upload + auto-push on stop

## Important note

This is still a front-end concept prototype.

- GitHub login and repo list are mocked
- Sync/upload actions are simulated in the activity log

The structure is ready to connect to real APIs later.

## Create page

`create.html` now provides a full concept flow to:

- use a real file manager (folder tree, new file/folder, delete)
- choose starter presets
- upload additional files into the selected folder
- add GitHub collaborators
- press **Create** to simulate repository creation and auto setup

Created repositories are stored in local storage and automatically appear in `index.html` after login.
