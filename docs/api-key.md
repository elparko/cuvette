# Get a Claude API key

An API (application programming interface) key is a long password.
It lets Cuvette send your requests to Claude.
Anthropic bills the API separately from a Claude.ai subscription.
A Claude.ai Pro or Max plan does not give an API key.

## Steps

1. Open https://platform.claude.com in a browser. This is the Claude Console. Make an account, or sign in.
2. Add credit. Open https://platform.claude.com/settings/billing, add a payment method, and buy credit. A small amount, such as 10 US dollars, is enough to start.
3. Open https://platform.claude.com/settings/keys. This is Settings, then API keys.
4. Select Create Key. Type a name, such as Cuvette. Select Add.
5. Copy the key. The Console shows the key one time. If you lose it, create a new key.
6. Paste the key into Cuvette. Cuvette checks the key and saves it in a file that only your user can read.

## What a key looks like

A Claude key starts with `sk-ant-`.
A key that starts with `sk-proj-` or only `sk-` is for OpenAI. It does not work in Cuvette.

## Keep the key secret

Do not post the key, email it, or put it in a file that you share.
If someone sees the key, delete it on the keys page and create a new one.

## Set a spend limit

1. Open https://platform.claude.com/settings/limits.
2. Set a monthly spend limit.

The Console stops requests when the spend reaches the limit.
Cuvette also has its own monthly budget setting. Type `/config` in Cuvette to change it.

## Where to paste the key

- First start in the terminal: type `?` at the key prompt to see the steps.
- First start in the app: select "How do I get a key?" under the Claude choice.
- Any time in the terminal: run `cuvette key`.
- Any time in a session: type `/key`.

## Commands

| Command | What it does |
| --- | --- |
| `cuvette key` | Asks for a key, checks it, and saves it. |
| `cuvette key help` | Shows these steps. |
| `cuvette key open` | Opens the keys page in the browser. |
| `cuvette key status` | Shows the saved key in masked form. |
| `cuvette key remove` | Deletes the saved key. |

In a session, `/key`, `/key help`, `/key open`, `/key status` and `/key remove` do the same.

## If the check fails

| Message | What to do |
| --- | --- |
| The key has quote marks around it | Paste the key without the quote marks. |
| The key has a space or a line break in it | Copy the whole key again and paste it in one piece. |
| This looks like an OpenAI key | Create a Claude key at the keys page. |
| HTTP 401 | The key is wrong or deleted. Copy it again, or create a new key. |
| HTTP 403, or "credit balance is too low" | Add credit on the billing page. Then try again. |
| Cannot reach the Claude API | Check the internet connection. Then try again. |

## No key and no payment

Choose the local model at first start.
Ollama is free and runs on your computer.
Small models make more mistakes than Claude.
