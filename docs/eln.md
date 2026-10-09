# eLabFTW and the .eln export

This page tells you what the harness sends to an electronic lab notebook (ELN), how to set it up, and what we tested.

## What is sent

The `.eln` export and the push use the same content for one session:

- The question.
- The final answer with its settings line.
- The decision table. It shows who set each value.
- The protocol (Markdown) with the manual route for each step.
- The audit trail (HTML).
- The review findings.
- The figures and tables that the steps made. They come from the session blobs.
- The session log `log.jsonl`. The metadata lists its SHA-256.

The harness does not send your input data files. Output files that a step made are part of the content.

## Export a .eln file

The export works with any ELN that reads the ELN Consortium format. It sends nothing.

- Terminal: `cuvette export <session> --format eln`
- In the app: `/export eln`
- MCP: `cuvette_export` with `format: "eln"`

The file is `<session id>.eln` in the session folder, for example `cuvette/<date>-<title>/<session id>.eln`. A session from an older version has it in `exports/`. It is a ZIP file with one top folder.
The folder holds `ro-crate-metadata.json` and an `analysis/` folder with the files.
Each step has its own folder `analysis/steps/NN-tool/` with `step.md` and its figures and tables.

The metadata follows the ELN Consortium specification, which pins RO-Crate 1.2.
The context is `https://w3id.org/ro/crate/1.2/context`.
The file has these entities:

- The metadata descriptor, with `about`, `conformsTo`, `dateCreated` and `sdPublisher`.
- The root `Dataset` with `hasPart`.
- One `Organization`, one `Person`, and one `PropertyValue` for each decision.
- One `Dataset` for the experiment and one for each step.
- One `File` for each file, with `encodingFormat`, `contentSize`, `author` and `dateCreated`. The log file also has `sha256`.

The specification has no `version` property. The harness does not add one.

## Set up eLabFTW

1. In eLabFTW, open your user panel and make an API key with write access.
2. Run `cuvette eln setup`. In the app, type `/eln setup`.
3. Type the address and the key. The screen hides the key.

The harness saves both in `~/.cuvette/credentials.json` (`elabftw_url`, `elabftw_api_key`). Only your user can read that file (mode 600).
The harness never prints the key. It shows the key masked.
The address must start with `https://`. Plain `http://` works only for localhost.

Other commands: `cuvette eln status`, `cuvette eln remove` (in the app: `/eln status`, `/eln remove`).

## Push a session

Run `cuvette eln push <session>`. In the app, type `/eln push`.

Before the harness sends anything, it shows a permission card. The card lists:

- The server address.
- If the push creates an experiment or updates one.
- The title and tags.
- Each file to send, with its size.
- A short form of the content hash.
- The data that the harness does not send.

Press `y` to send. Press `n` to stop. The card has no "always allow" key for this action. The terminal command asks `Send it? [y/N]`. Any other answer stops it.

After you approve, the harness:

1. Creates the experiment with the title and the HTML body, then adds the tags.
2. Uploads `<session>.eln`, `trail.html`, `protocol.md` and `log.jsonl`.
3. Writes an `eln_push` entry in the session log. It holds the experiment id, the URL, the content hash and the version.

A second push of the same session updates the same experiment.
The harness adds a new section `Version N` to the body. eLabFTW keeps a revision of each change.
The harness uploads a file again only if its content changed. A changed file gets the name suffix `-vN`.

If you linked the session to an experiment first (see below), the first push adds a section to that experiment.
The card says so.

## Link an experiment

Run `cuvette eln link <session> <id>`. In the app, type `/eln link <id>`.

The harness reads the experiment and the items that it links to. It shows the title, the tags, the start of the text and the linked items.
Then it compares each custom field (`metadata.extra_fields`) with the decisions.
A field matches if its name equals a decision key or label. The match ignores case and punctuation.
The harness checks the experiment first, then the linked items. The harness skips a value that does not fit the decision (wrong type, out of range, not a listed choice). It skips decisions that a lab profile fixes.

The harness does not apply any value by itself.

- In the app, the setup card opens with the proposed values marked. The harness saves nothing until you confirm the card.
- In the terminal, the command asks `Apply these values to the setup? [y/N]`.

The harness stores the link in the log as an `eln_link` entry.

## MCP

The tool `cuvette_eln_push` exists. It needs the approval of the scientist.
An MCP client cannot approve, so the call refuses. Run `cuvette eln push <session>` in a terminal instead.

## eLabFTW API v2 endpoints used

The base path is `<address>/api/v2`. Each request has the header `Authorization: <api key>`.
Source for all rows: the eLabFTW OpenAPI file, https://github.com/elabftw/elabftw/blob/master/apidoc/v2/openapi.yaml (rendered at https://doc.elabftw.net/api/v2/).

| Use | Request | Body | OpenAPI operation |
| --- | --- | --- | --- |
| Create an experiment | `POST /experiments` | JSON `title`, `body`, `content_type` (1 is HTML). The id is the last part of the `Location` header. | `post-experiment` |
| Add a version section | `PATCH /experiments/{id}` | JSON `bodyappend` | `entity_editable` schema |
| Add tags | `POST /experiments/{id}/tags` | JSON `tags` (list of strings) | `post-tag` |
| Upload a file | `POST /experiments/{id}/uploads` | multipart `file`, `comment` | `post-upload` |
| Read an experiment | `GET /experiments/{id}` | none. Uses `title`, `body`, `metadata`, `tags`, `items_links`. | `get-experiment` |
| Read the linked items | `GET /experiments/{id}/items_links` | none | `read-entity-items-links` |
| Read one item | `GET /items/{id}` | none | `get-item` |
| List revisions | `GET /experiments/{id}/revisions` | none | `read-entity-revisions` |
| Import a .eln file | `POST /import` | multipart `file`, `entity_type`. The `Location` header ends with the number of imported entries. | `post-import` |

The `PATCH` body field `bodyappend` and the `POST /import` call are in the OpenAPI file.
The client has `importEln` for the import call. No command uses it yet.

The API returns `metadata` as a JSON string in some versions and as an object in others. The client accepts both.

## What was tested

All tests use a mock server on 127.0.0.1 (`tests/fixtures/elabftw-mock.ts`).
No test calls demo.elabftw.net or any real ELN. No data left this computer.

The mock rejects a missing or wrong `Authorization` header with HTTP 401.
The tests cover:

- Create, tags, append with revisions, upload, read, linked items and import (`tests/elabftw.test.ts`).
- The ZIP writer, checked with the system `unzip -t` (`tests/zip.test.ts`).
- The `.eln` structure and the required metadata entities (`tests/eln-export.test.ts`).
- The approval gate, a second push that updates the same experiment, link proposals that stay unapplied, and the terminal commands (`tests/eln-sync.test.ts`).
- The saved key mode and the address checks (`tests/credentials.test.ts`).
- The MCP tool refusal (`tests/mcp-server.test.ts`).

## Not tested

These need a real eLabFTW server:

- The exact response of your eLabFTW version. The mock follows the OpenAPI file, not a running server.
- That the `Location` header has the form that the client reads.
- That `bodyappend` works on your version.
- That eLabFTW imports the `.eln` file that the harness writes. We checked only the layout against the specification.
- Team rules, upload size limits and permission errors.
