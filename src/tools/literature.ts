import { scanText } from "../core/phi.ts";
import type { Tool, ToolOutput } from "../core/types.ts";

export const LITERATURE_API = "https://api.sciencemadereadable.com/api/data";

interface Work {
  id: string;
  doi?: string | null;
  title?: string;
  abstract?: string | null;
  year?: number;
  type?: string;
  venue?: string | null;
  citations?: number;
  is_oa?: number;
  url?: string | null;
}

function short(w: Work) {
  const abstract = w.abstract ? (w.abstract.length > 500 ? `${w.abstract.slice(0, 497).replace(/\s+\S*$/, "")}...` : w.abstract) : undefined;
  return { id: w.id, doi: w.doi ?? undefined, year: w.year, type: w.type, title: w.title, venue: w.venue ?? undefined, citations: w.citations, open_access: w.is_oa === 1, url: w.url ?? `https://openalex.org/${w.id}`, abstract };
}

export function literatureTool(opts: { fetch?: typeof fetch; base?: string } = {}): Tool {
  return {
    name: "search_literature",
    title: "Search the literature",
    description:
      "Search about 200 million published studies (OpenAlex titles and abstracts) for background on the scientist's question. Use it before clarify, to learn the usual methods, measures and controls for this kind of experiment. Write the query as a plain question or a short description. Do not put patient data, sample names or unpublished results in the query. The results are background only: never take a number for the answer from an abstract.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The question or topic, for example: HIF-1 alpha protein level in cardiomyocytes after hypoxia." },
        k: { type: "integer", description: "The number of studies to return, 1 to 20. Default 8." },
        year_from: { type: "integer" },
        year_to: { type: "integer" },
        type: { type: "string", enum: ["article", "review"], description: "Use review to find an overview of the field." },
      },
      required: ["query"],
    },
    source: "harness",
    readOnly: true,
    permission: "ask",
    async execute(a, ctx): Promise<ToolOutput> {
      const query = String(a.query ?? "").trim();
      if (query.length < 2) return { ok: false, error: "Give a query of two characters or more." };
      const hits = scanText(query, "query");
      if (hits.length) return { ok: false, error: `The query can contain patient identifiers (${[...new Set(hits.map((h) => h.kind))].join(", ")}). Remove them and search again.` };
      const params = new URLSearchParams({ q: query.slice(0, 2000), k: String(Math.min(20, Math.max(1, Number(a.k) || 8))), mode: "auto" });
      for (const key of ["year_from", "year_to", "type"]) if (a[key] !== undefined && a[key] !== "") params.set(key, String(a[key]));
      let res: Response;
      try {
        res = await (opts.fetch ?? fetch)(`${opts.base ?? LITERATURE_API}/search?${params}`, { signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(20_000)]) });
      } catch (e) {
        return { ok: false, error: `The literature search did not answer (${(e as Error).message}). Continue without background.` };
      }
      if (res.status === 429) return { ok: false, error: `Too many searches. Wait ${res.headers.get("retry-after") ?? "60"} s before the next search, or continue without background.` };
      if (!res.ok) return { ok: false, error: `The literature search failed with HTTP ${res.status}. Continue without background.` };
      const works = (((await res.json()) as { results?: Work[] }).results ?? []).map(short);
      ctx.log("note", { phase: "Background", query, studies: works.map((w) => ({ id: w.id, doi: w.doi, year: w.year, title: w.title })) });
      if (!works.length) return { ok: true, summary: "No studies found.", text: "No studies found. Try other words, or continue without background.", data: { query, studies: [] } };
      const text = works.map((w, i) => `${i + 1}. ${w.title} (${w.year ?? "no year"}${w.venue ? `, ${w.venue}` : ""}; ${w.citations ?? 0} citations)\n   ${w.doi ? `https://doi.org/${w.doi}` : w.url}${w.abstract ? `\n   ${w.abstract}` : ""}`).join("\n");
      return { ok: true, summary: `${works.length} studies found for "${query}".`, text, data: { query, studies: works } };
    },
  };
}
