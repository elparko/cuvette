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

export function safeServer(url: string): boolean {
  try {
    const u = new URL(baseUrl(url));
    return u.protocol === "https:" || (u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname));
  } catch {
    return false;
  }
}

function entityId(id: unknown): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ElabftwError(`The eLabFTW id ${String(id)} is not a positive whole number.`, 0);
  return n;
}

export function elabftw(cfg: ElabftwConfig, fetchImpl: typeof fetch = fetch) {
  const root = `${baseUrl(cfg.url)}/api/v2`;

  async function call(method: string, path: string, body?: unknown | FormData): Promise<Response> {
    if (!safeServer(cfg.url)) throw new ElabftwError(`The eLabFTW address ${cfg.url} must start with https://. Plain http is allowed only for localhost. Cuvette did not send the key.`, 0);
    const headers: Record<string, string> = { Authorization: cfg.key };
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetchImpl(root + path, { method, headers, body: payload }).catch(() => {
      throw new ElabftwError(`Cuvette cannot reach the eLabFTW server ${baseUrl(cfg.url)}. Check the network and the address. Type /eln status to see the address.`, 0);
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ElabftwError(`eLabFTW answered ${res.status} to ${method} ${path}${text ? `: ${text.slice(0, 200)}` : ""}`, res.status);
    }
    return res;
  }

  const json = async (res: Response): Promise<unknown> =>
    res.json().catch(() => {
      throw new ElabftwError(`The server ${baseUrl(cfg.url)} did not answer like eLabFTW. Check the address. Type /eln status to see it.`, res.status);
    });

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
      await call("PATCH", `/experiments/${entityId(id)}`, { bodyappend: html });
    },

    async addTags(id: number, tags: string[]): Promise<void> {
      await call("POST", `/experiments/${entityId(id)}/tags`, { tags });
    },

    async upload(id: number, name: string, data: Buffer, mime: string, comment = ""): Promise<number> {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(data)], { type: mime }), name);
      if (comment) form.append("comment", comment);
      return idFrom(await call("POST", `/experiments/${entityId(id)}/uploads`, form));
    },

    async readEntity(type: "experiments" | "items", id: number): Promise<ElabEntity> {
      id = entityId(id);
      const j = (await json(await call("GET", `/${type}/${id}`))) as Record<string, unknown>;
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
      const list = (await json(await call("GET", `/experiments/${entityId(id)}/items_links`))) as ElabLink[];
      return Array.isArray(list) ? list.filter((l) => Number.isInteger(Number(l?.entityid)) && Number(l.entityid) > 0) : [];
    },

    async listRevisions(id: number): Promise<{ id: number; created_at: string }[]> {
      return (await json(await call("GET", `/experiments/${entityId(id)}/revisions`))) as { id: number; created_at: string }[];
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
