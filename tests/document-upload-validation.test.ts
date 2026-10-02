import test from "node:test";
import assert from "node:assert/strict";
import { validateDocumentUpload } from "../src/server/documents/file-validation.ts";

test("dokumenttilataus hyväksyy turvallisen PDF-tiedoston", () => {
  const result = validateDocumentUpload({
    fileName: "isannoitsijantodistus.PDF",
    mediaType: "application/pdf",
    size: 2048,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.extension, ".pdf");
    assert.equal(result.value.mediaType, "application/pdf");
  }
});

test("TXT-tiedoston geneerinen mediatyyppi normalisoidaan", () => {
  const result = validateDocumentUpload({
    fileName: "todistus.txt",
    mediaType: "application/octet-stream",
    size: 2048,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.value.mediaType,
      "text/plain",
    );
  }
});

test("ristiriitainen pääte ja mediatyyppi hylätään", () => {
  const result = validateDocumentUpload({
    fileName: "todistus.pdf",
    mediaType: "image/png",
    size: 2048,
  });

  assert.deepEqual(result, {
    ok: false,
    code: "UNSUPPORTED_DOCUMENT_FORMAT",
    message: "Tiedostomuotoa ei tueta. Käytä PDF- tai TXT-tiedostoa.",
  });
});

test("DOCX hylätään, koska paikallinen MVP tukee vain PDF- ja TXT-tiedostoja", () => {
  const result = validateDocumentUpload({
    fileName: "todistus.docx",
    mediaType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 2048,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "UNSUPPORTED_DOCUMENT_FORMAT");
});

test("yli 15 megatavun dokumentti hylätään ennen analyysiä", () => {
  const result = validateDocumentUpload({
    fileName: "todistus.pdf",
    mediaType: "application/pdf",
    size: 15 * 1024 * 1024 + 1,
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "DOCUMENT_TOO_LARGE");
});
