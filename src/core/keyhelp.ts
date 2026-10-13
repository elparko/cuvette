export const CONSOLE_URL = "https://platform.claude.com";
export const KEYS_URL = `${CONSOLE_URL}/settings/keys`;
export const BILLING_URL = `${CONSOLE_URL}/settings/billing`;
export const LIMITS_URL = `${CONSOLE_URL}/settings/limits`;

export const KEY_GUIDE = {
  title: "How do I get a Claude API key?",
  intro: "An API (application programming interface) key is a long password. It lets Cuvette send your requests to Claude. Anthropic bills the API separately from a Claude.ai subscription. A Claude.ai Pro or Max plan does not give an API key.",
  steps: [
    `Open ${CONSOLE_URL} in a browser. This is the Claude Console. Make an account, or sign in.`,
    `Add credit. Open ${BILLING_URL}, add a payment method, and buy credit. A small amount, such as 10 US dollars, is enough to start.`,
    `Open ${KEYS_URL}. This is Settings, then API keys.`,
    "Select Create Key. Type a name, such as Cuvette. Select Add.",
    "Copy the key. The Console shows the key one time. If you lose it, create a new key.",
    "Paste the key into Cuvette. Cuvette checks the key and saves it in a file that only your user can read.",
  ],
  notes: [
    "A Claude key starts with sk-ant-. A key that starts with sk-proj- or only sk- is for OpenAI. It does not work here.",
    "The key is a secret. Do not post it, email it, or put it in a file that you share. If someone sees it, delete it at the keys page and create a new one.",
    `Set a spend limit. Open ${LIMITS_URL} and set a monthly limit. The Console stops requests when the spend reaches the limit.`,
    "No key and no payment: choose the local model. Ollama is free and runs on your computer. Small models make more mistakes than Claude.",
  ],
};

export function keyGuideText(): string {
  const steps = KEY_GUIDE.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
  const notes = KEY_GUIDE.notes.map((s) => `  - ${s}`).join("\n");
  return `${KEY_GUIDE.title}\n\n${KEY_GUIDE.intro}\n\n${steps}\n\n${notes}`;
}

export function keyFormatProblem(raw: string): string | undefined {
  const k = raw.trim();
  if (!k) return `The key is empty. Copy the key from ${KEYS_URL}, then paste it.`;
  if (/^["'`“”‘’]|["'`“”‘’]$/.test(k)) return "The key has quote marks around it. Paste the key without the quote marks.";
  if (/\s/.test(k)) return "The key has a space or a line break in it. Copy the whole key again and paste it in one piece.";
  if (/^sk-/.test(k) && !k.startsWith("sk-ant-")) {
    return `This looks like an OpenAI key. Cuvette needs a Claude key that starts with sk-ant-. Create one at ${KEYS_URL}. Type "cuvette key help" for the steps.`;
  }
  if (!k.startsWith("sk-ant-")) return `A Claude API key starts with sk-ant-. Copy the key again from ${KEYS_URL}. Type "cuvette key help" for the steps.`;
  return undefined;
}

export function keyApiProblem(status: number | undefined, message = ""): string {
  if (/credit balance|insufficient|purchase credits|billing/i.test(message)) {
    return `The Claude account has no credit left. Add credit at ${BILLING_URL}, then try again. A Claude.ai Pro or Max plan does not pay for the API.`;
  }
  if (status === 401) return `The Claude API rejected this key (HTTP 401). The key is wrong, or someone deleted it. Copy the key again, or create a new key at ${KEYS_URL}.`;
  if (status === 402 || status === 403) {
    return `The Claude API refused this key (HTTP ${status}). The account probably has no credit. Add credit at ${BILLING_URL}, then try again. If credit is there, create a new key at ${KEYS_URL}.`;
  }
  if (status === 429) return `The Claude API says too many requests, or the monthly spend limit is reached. Wait a minute. If it continues, check the limit at ${LIMITS_URL}.`;
  if (status === undefined) return "Cannot reach the Claude API. Check the internet connection, then try again.";
  return `The Claude API returned an error (HTTP ${status}). Try again in a minute.`;
}
