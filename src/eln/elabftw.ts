export interface ElabftwConfig {
  url: string;
  key: string;
}

export class ElabftwError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface ElabLink {
  entityid: number;
  title: string;
  category_title?: string;
}

export interface ElabEntity {
  id: number;
  title: string;
  body: string;
  metadata: { extra_fields?: Record<string, { type?: string; value?: unknown }> };
  tags: string;
  items_links: ElabLink[];
}

export function baseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function parseMetadata(raw: unknown): ElabEntity["metadata"] {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) ?? {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" ? (raw as ElabEntity["metadata"]) : {};
}

export function elabftw(cfg: ElabftwConfig, fetchImpl: typeof fetch = fetch) {
  const root = `${baseUrl(cfg.url)}/api/v2`;

  async function call(method: string, path: string, body?: unknown | FormData): Promise<Response> {
    const headers: Record<string, string> = { Authorization: cfg.key };
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetchImpl(root + path, { method, headers, body: payload });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ElabftwError(`eLabFTW answered ${res.status} to ${method} ${path}${text ? `: ${text.slice(0, 200)}` : ""}`, res.status);
    }
    return res;
  }

  const idFrom = (res: Response): number => {
    const m = /\/(\d+)\/?$/.exec(res.headers.get("location") ?? "");
    if (!m) throw new ElabftwError("eLabFTW did not return an id in the Location header", res.status);
    return Number(m[1]);
  };

  return {
    experimentUrl: (id: number) => `${baseUrl(cfg.url)}/experiments.php?mode=view&id=${id}`,

    async createExperiment(a: { title: string; body: string }): Promise<number> {
      return idFrom(await call("POST", "/experiments", { title: a.title, body: a.body, content_type: 1 }));
    },

    async appendBody(id: number, html: string): Promise<void> {
      await call("PATCH", `/experiments/${id}`, { bodyappend: html });
    },

    async addTags(id: number, tags: string[]): Promise<void> {
      await call("POST", `/experiments/${id}/tags`, { tags });
    },

    async upload(id: number, name: string, data: Buffer, mime: string, comment = ""): Promise<number> {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(data)], { type: mime }), name);
      if (comment) form.append("comment", comment);
      return idFrom(await call("POST", `/experiments/${id}/uploads`, form));
    },

    async readEntity(type: "experiments" | "items", id: number): Promise<ElabEntity> {
      const j = (await (await call("GET", `/${type}/${id}`)).json()) as Record<string, unknown>;
      return {
        id: Number(j.id ?? id),
        title: String(j.title ?? ""),
        body: String(j.body ?? ""),
        metadata: parseMetadata(j.metadata),
        tags: String(j.tags ?? ""),
        items_links: Array.isArray(j.items_links) ? (j.items_links as ElabLink[]) : [],
      };
    },

    async listItemLinks(id: number): Promise<ElabLink[]> {
      return (await (await call("GET", `/experiments/${id}/items_links`)).json()) as ElabLink[];
    },

    async listRevisions(id: number): Promise<{ id: number; created_at: string }[]> {
      return (await (await call("GET", `/experiments/${id}/revisions`)).json()) as { id: number; created_at: string }[];
    },

    async importEln(name: string, data: Buffer, entityType: "experiments" | "items" = "experiments"): Promise<number> {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(data)], { type: "application/vnd.eln+zip" }), name);
      form.append("entity_type", entityType);
      return idFrom(await call("POST", "/import", form));
    },
  };
}

export type Elabftw = ReturnType<typeof elabftw>;
