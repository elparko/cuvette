## Adapter

- Name: <!-- the folder name in adapters/, the same as adapter.name -->
- Program and version: <!-- seqkit 2.8.2 -->
- Field: <!-- genomics -->
- Connection kind: <!-- cli, python, script, http, macro, mcp, files, screen -->

## Checklist

- [ ] `cuvette adapter check adapters/<name> --run-tests` prints "The adapter passes." I pasted the full output below.
- [ ] The adapter has known-answer tests. They use public data.
- [ ] Each expected number in a test comes from a published source. If a number comes from my own run, the test `description` says so.
- [ ] `status` is `draft`. `approved_by` and `approved_on` are empty.
- [ ] `adapter.yaml` contains no secret.
- [ ] I read every file in the folder. I wrote or copied each one, and I state the source of each copied file.

## License

- License of the adapter: <!-- an OSI-approved license, such as MIT or Apache-2.0 -->
- [ ] The adapter folder has a `LICENSE` file with the full text.

## Code

- Does the adapter contain code? <!-- yes or no -->
- If yes, list each code file: <!-- adapter.ts, server.ts, Python modules, scripts -->
- What the code does outside the adapter folder: <!-- files it writes, network addresses it calls, programs it starts. Write "nothing" if nothing. -->

Claude reads all code in the folder and posts a review. A maintainer reads all code before the merge.

## Sample data

| File | Source (link) | License | Size |
| --- | --- | --- | --- |
| `data/...` | | | |

## Checker output

```text
<!-- paste the output of: cuvette adapter check adapters/<name> --run-tests -->
```
