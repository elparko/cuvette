import { afterEach, beforeEach, expect, test } from "vitest";
import { ElabftwError, elabftw } from "../src/eln/elabftw.ts";
import { startMock, type Mock } from "./fixtures/elabftw-mock.ts";

let mock: Mock;
beforeEach(async () => {
  mock = await startMock();
});
afterEach(() => mock.close());

const client = () => elabftw({ url: mock.url + "/", key: mock.key });

test("every request carries the Authorization header", async () => {
  const c = client();
  const id = await c.createExperiment({ title: "T", body: "<p>b</p>" });
  await c.readEntity("experiments", id);
  expect(mock.requests.length).toBe(2);
  expect(mock.requests.every((r) => r.auth === mock.key)).toBe(true);
});

test("a wrong or missing key gets a 401 error", async () => {
  await expect(elabftw({ url: mock.url, key: "wrong" }).createExperiment({ title: "T", body: "" })).rejects.toMatchObject({ status: 401 });
  const res = await fetch(`${mock.url}/api/v2/experiments`, { method: "POST", body: "{}" });
  expect(res.status).toBe(401);
  expect(mock.experiments.size).toBe(0);
});

test("create sends title and HTML body and reads the id from Location", async () => {
  const id = await client().createExperiment({ title: "Run 1", body: "<h1>One</h1>" });
  expect(mock.experiments.get(id)).toMatchObject({ title: "Run 1", body: "<h1>One</h1>" });
});

test("tags go to the tags endpoint", async () => {
  const c = client();
  const id = await c.createExperiment({ title: "T", body: "" });
  await c.addTags(id, ["cuvette", "imagej"]);
  expect(mock.experiments.get(id)!.tags).toEqual(["cuvette", "imagej"]);
});

test("append adds a section and eLabFTW keeps a revision for each change", async () => {
  const c = client();
  const id = await c.createExperiment({ title: "T", body: "<p>v1</p>" });
  await c.appendBody(id, "<p>v2</p>");
  await c.appendBody(id, "<p>v3</p>");
  expect(mock.experiments.get(id)!.body).toBe("<p>v1</p><p>v2</p><p>v3</p>");
  expect(await c.listRevisions(id)).toHaveLength(3);
});

test("upload sends a multipart file with a comment", async () => {
  const c = client();
  const id = await c.createExperiment({ title: "T", body: "" });
  await c.upload(id, "trail.html", Buffer.from("<html></html>"), "text/html", "note");
  expect(mock.experiments.get(id)!.uploads).toEqual([{ name: "trail.html", size: 13, comment: "note" }]);
});

test("read returns title, body, parsed metadata and linked items", async () => {
  const c = client();
  const id = await c.createExperiment({ title: "T", body: "<p>x</p>" });
  mock.experiments.get(id)!.metadata = { extra_fields: { sigma: { type: "number", value: "2" } } };
  mock.items.set(7, { id: 7, title: "Buffer A", body: "", metadata: { extra_fields: { pH: { type: "number", value: "7.4" } } } });
  mock.experiments.get(id)!.items = [7];
  const e = await c.readEntity("experiments", id);
  expect(e).toMatchObject({ title: "T", body: "<p>x</p>", items_links: [{ entityid: 7, title: "Buffer A" }] });
  expect(e.metadata.extra_fields!.sigma!.value).toBe("2");
  expect((await c.readEntity("items", 7)).metadata.extra_fields!.pH!.value).toBe("7.4");
  expect(await c.listItemLinks(id)).toHaveLength(1);
});

test("a missing experiment is a 404 error", async () => {
  await expect(client().readEntity("experiments", 99)).rejects.toBeInstanceOf(ElabftwError);
});

test("import sends the file and the entity type", async () => {
  const n = await client().importEln("a.eln", Buffer.from("PK"), "experiments");
  expect(n).toBe(1);
  expect(mock.imports).toEqual([{ name: "a.eln", size: 2, entityType: "experiments" }]);
});

test("a plain http address that is not localhost gets no request and no key", async () => {
  let calls = 0;
  const spy = (async () => {
    calls++;
    return new Response("{}");
  }) as unknown as typeof fetch;
  await expect(elabftw({ url: "http://elab.example.org", key: "secret" }, spy).createExperiment({ title: "T", body: "" })).rejects.toThrow(/https/);
  expect(calls).toBe(0);
});

test("an id that is not a positive whole number is refused before the request", async () => {
  const c = client();
  await expect(c.readEntity("experiments", Number("x"))).rejects.toThrow(/positive whole number/);
  await expect(c.readEntity("items", "1/../../users" as unknown as number)).rejects.toThrow(/positive whole number/);
  expect(mock.requests.length).toBe(0);
});

test("a network failure names the cause code, and a certificate failure adds the reason", async () => {
  const fail = (cause: object) => elabftw({ url: "https://lab.example.org", key: "1-abc" }, (async () => { throw Object.assign(new TypeError("fetch failed"), { cause }); }) as unknown as typeof fetch);
  await expect(fail({ code: "ECONNREFUSED" }).readEntity("experiments", 1)).rejects.toThrow("The server is not reachable (ECONNREFUSED).");
  await expect(fail({ errors: [{ code: "ENOTFOUND" }] }).readEntity("experiments", 1)).rejects.toThrow("(ENOTFOUND)");
  await expect(fail({ code: "DEPTH_ZERO_SELF_SIGNED_CERT", message: "self-signed certificate" }).readEntity("experiments", 1)).rejects.toThrow("(DEPTH_ZERO_SELF_SIGNED_CERT). self-signed certificate.");
  await expect(fail({}).readEntity("experiments", 1)).rejects.toThrow("The server is not reachable. Check the network");
});
