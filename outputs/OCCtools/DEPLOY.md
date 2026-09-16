# OCCtools test deployment

This repository contains application code, NOT the live menus, PDFs, credentials or flow keys.
The current local project is `C:\Users\lam\Documents\OCCtools`.

## Before installation

Run `Test-OCCtoolsHost.ps1` on the target server. Identify the IIS site for occ.ne.int, HTTPS binding, ARR proxy, Node 22+, NSSM and a server-owned Python environment with pypdf, pypdfium2 and Pillow. Local Codex runtime paths must NOT be used on the server. LocalService needs read/execute access to the chosen Python environment.

The whole portal must be restricted to authorized users at IIS/network level. Admin authentication only protects editing; data-reading and checklist actions are not individual-user authenticated. Do not expose this portal publicly. Confirm the access model and HTTPS before installation. Do not change authentication on a shared IIS site without its owner's approval.

## First installation (only after host review)

Confirmed by the owner: occ.ne.int is accessible only via company internal network/VPN and all users with that access may read the portal data. Use anonymous IIS access inherited from OCCHUB; do not enable Windows authentication or alter sibling sites. Admin editing retains its own login. Target host: DK-AP-PR-OCCH01, IIS site OCCHUB, HTTPS origin https://occ.ne.int. Reassess this approval if network exposure changes.

`Install-OCCtools.ps1 -SiteName '<confirmed site>' -Origin 'https://occ.ne.int' -PythonPath '<server python.exe>' -NssmPath '<server nssm.exe>' -ConfirmRestrictedAccess`

The installer refuses an existing destination, service or IIS application. Do not delete an existing install to work around this check. Back up and plan an update separately. The installer creates a new admin password; use a strong unique password, not the local test password.

## Private content transfer

Transfer these through an approved private channel, NOT GitHub, repository artifacts or chat:

- Local `data/content.json` to server `data/content.json`.
- Local `data/documents/` to server `data/documents/` (index, PDFs and backups).
- Local `dist/manuals/` to the corresponding server folder.
- Six `work/*flow-url.txt` files to server `data/` using the same filenames.

Do NOT replace the server's newly created `data/config.json` with the local test config. Stop only the OCCtools service for data import; back up any existing server data first. Keep the restricted data-folder ACLs. Configure `OCC_START_READ_READY=1` alongside `OCC_PYTHON` only after confirming the read-flow supports active adhoc runs of all ages. Do not overwrite other service environment settings.

## Acceptance and rollback

Check the HTTPS URL, unauthorized-access denial, menu/content counts, document previews/search, admin upload/replace and backups with isolated test PDFs. Read calendars/logs/checklists. Do not create or tick production checklist items without a named test authorized by the operator. Compare the deployment with the local version before sharing the test URL.

Retain the previous code and a private snapshot of data before each update. If verification fails, stop only OCCtools, restore the preceding code/data snapshot, then restart and verify. Never modify other applications such as Rootz as part of rollback. No remote deployment has been performed merely by pushing this repository.
