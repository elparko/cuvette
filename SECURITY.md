# Security policy

## Report a vulnerability

Do not report a vulnerability in a public issue, a discussion or a pull request.

1. Go to the repository page on GitHub: https://github.com/elparko/cuvette.
2. Open the "Security" tab.
3. Click "Report a vulnerability".
4. Describe the problem, the affected version or commit, and the steps that show it.
5. Send the report.

GitHub keeps the report private between you and the owner. If you cannot use GitHub, write to
peresteai@gmail.com.

The owner answers each report. When a fix is ready, the owner publishes a security advisory.
The advisory names you, unless you ask the owner not to name you.

## Supported versions

Only the latest commit on `main` gets security fixes.

## Adapter code

Every adapter runs programs on the computer of the user, with the permissions of the user. Some
adapters also contain their own code: `adapter.ts`, `server.ts`, a Python module, or a script.
Cuvette runs that code on the computer of the user.

Rules:

1. The owner must review all code in an adapter before the adapter enters `catalog/`.
2. A community adapter is an adapter that a user installs in `~/.cuvette/adapters/` or in
   `<project>/.cuvette/adapters/`. Nobody reviews it. The user must read all of its code before
   use.
3. An adapter must not put a secret in `adapter.yaml`. It must read a secret from an environment
   variable with `{env:NAME}`.

A vulnerability in a catalog adapter is a vulnerability in Cuvette. Report it with the procedure
above. A problem in a community adapter belongs to the author of that adapter.
