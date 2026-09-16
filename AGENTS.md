# OCCtools

Active project: C:/Users/lam/Documents/OCCtools. Read README.md and outputs/OCCtools/STATUS.md.
Use concise Danish. No administrator PowerShell is needed for local testing.
App: outputs/OCCtools; static files: dist; server: server.mjs. Launch via root start-OCCtools.cmd.
Never print or commit work/*flow-url.txt, data/config.json, operational data or credentials.
Admin requires a password; username is configured in data/config.json. Never enable passwordless access. Do not put passwords in documentation or version history.
Do not create, tick, close or delete real SharePoint records for testing without specific authorization. Use isolated data and mocks.
Adhoc creation copies ALL template items for the type. Preview alone filters day/date/season.
Use apply_patch; preserve user edits; bump static cache versions and verify syntax and browser behavior.
