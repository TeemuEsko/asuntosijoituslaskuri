import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/document-analysis/route.ts";

test("dokumenttireitti validoi FormDatan, kutsuu provideria ja palauttaa normalisoidun canonical-tuloksen", { concurrency: false }, async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  let providerBody: Record<string, unknown> | undefined;
  process.env.OPENAI_API_KEY = "route-test-key";
  globalThis.fetch = async (_input, init) => {
    providerBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      output_text: JSON.stringify({
        documentType: "manager_certificate",
        confidence: "high",
        relevantExcerpts: [
          { text: "Hoitovastike 263,20 €/kk", confidence: "high" },
        ],
        completedRenovations: [],
        futureRenovations: [],
      }),
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([37, 80, 68, 70])], "isannoitsijantodistus.pdf", { type: "application/pdf" }));
    form.set("declaredKind", "manager_certificate");
    const response = await POST(new Request("http://localhost/api/document-analysis", { method: "POST", body: form }));
    const result = await response.json() as {
      documentType: string;
      documentKind: string | null;
      values: { maintenanceFeeMonthly?: number };
      provenance: { maintenanceFeeMonthly?: { sourceLabel?: string; source?: { kind?: string } } };
    };

    assert.equal(response.status, 200);
    assert.equal(result.documentType, "manager_certificate");
    assert.equal(result.documentKind, "manager_certificate");
    assert.equal(result.values.maintenanceFeeMonthly, 263.2);
    assert.equal(result.provenance.maintenanceFeeMonthly?.source?.kind, "document");
    assert.equal(result.provenance.maintenanceFeeMonthly?.sourceLabel, "Isännöitsijäntodistus");
    assert.equal(providerBody?.store, false);
    assert.match(JSON.stringify(providerBody), /isannoitsijantodistus\.pdf/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
  }
});

test("dokumenttireitti hylkää puuttuvan tiedoston ennen providerikutsua", async () => {
  const response = await POST(new Request("http://localhost/api/document-analysis", {
    method: "POST",
    body: new FormData(),
  }));
  const result = await response.json() as { code?: string };

  assert.equal(response.status, 400);
  assert.equal(result.code, "DOCUMENT_REQUIRED");
});
