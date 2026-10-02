import test from "node:test";
import assert from "node:assert/strict";
import {
  DocumentAnalysisProviderError,
  OpenAiDocumentAnalysisProvider,
  documentResponseOutputText,
  isDocumentRawExtraction,
} from "../src/server/documents/openai-document-provider.ts";

const extraction = {
  documentType: "manager_certificate" as const,
  confidence: "high" as const,
  relevantExcerpts: [
    { text: "Hoitovastike 263,20 €/kk", confidence: "high" as const },
  ],
  completedRenovations: [],
  futureRenovations: [
    { text: "2028 Julkisivujen kuntotutkimus", confidence: "high" as const },
  ],
};

test("dokumenttipalvelu lähettää tiedoston base64-muodossa ilman palvelintallennusta", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const provider = new OpenAiDocumentAnalysisProvider({
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ output_text: JSON.stringify(extraction) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await provider.analyzeDocument({
    bytes: new Uint8Array([1, 2, 3]),
    mediaType: "application/pdf",
    fileName: "isannoitsijantodistus.pdf",
    declaredKind: "manager_certificate",
  });

  assert.equal(result.documentType, "manager_certificate");
  assert.equal(requestBody?.store, false);
  assert.equal(requestBody?.model, "test-model");
  assert.match(JSON.stringify(requestBody), /data:application\/pdf;base64,AQID/);
  assert.match(JSON.stringify(requestBody), /Älä käsittele taloyhtiön koko lainamäärää/);
  assert.match(JSON.stringify(requestBody), /json_schema/);
});

test("dokumenttipalvelu lukee myös Responses API:n sisäkkäisen tekstivastauksen", () => {
  assert.equal(
    documentResponseOutputText({
      output: [{ content: [{ type: "output_text", text: JSON.stringify(extraction) }] }],
    }),
    JSON.stringify(extraction),
  );
  assert.equal(isDocumentRawExtraction(extraction), true);
  assert.equal(
    isDocumentRawExtraction({ ...extraction, confidence: "certain" }),
    false,
  );
});

test("virheellinen rakenteinen vastaus hylätään hallitusti", async () => {
  const provider = new OpenAiDocumentAnalysisProvider({
    apiKey: "test-key",
    fetchImpl: async () =>
      new Response(JSON.stringify({ output_text: '{"documentType":"manager_certificate"}' }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  await assert.rejects(
    () =>
      provider.analyzeDocument({
        bytes: new Uint8Array([1]),
        mediaType: "application/pdf",
        fileName: "todistus.pdf",
      }),
    (error) =>
      error instanceof DocumentAnalysisProviderError &&
      error.code === "DOCUMENT_ANALYSIS_FAILED" &&
      /tietomallia/.test(error.message),
  );
});

test("dokumenttipalvelun aikakatkaisu palauttaa täsmällisen virheen", async () => {
  const provider = new OpenAiDocumentAnalysisProvider({
    apiKey: "test-key",
    fetchImpl: async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
  });

  await assert.rejects(
    () =>
      provider.analyzeDocument({
        bytes: new Uint8Array([1]),
        mediaType: "application/pdf",
        fileName: "todistus.pdf",
      }),
    (error) =>
      error instanceof DocumentAnalysisProviderError && error.code === "TIMEOUT",
  );
});
