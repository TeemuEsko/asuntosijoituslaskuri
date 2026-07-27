import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const reportsDir = path.join(root, "reports");
await mkdir(path.join(reportsDir, "screenshots"), { recursive: true });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const node = process.execPath;
const checks = [];

function run({ section, name, command, args, expected, file, critical = true, passDetail }) {
  const started = Date.now();
  const useWindowsCommand = process.platform === "win32" && command === npm;
  const executable = useWindowsCommand ? (process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe") : command;
  const effectiveArgs = useWindowsCommand ? ["/d", "/s", "/c", [command, ...args].join(" ")] : args;
  const result = spawnSync(executable, effectiveArgs, { cwd: root, encoding: "utf8", windowsHide: true });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const passed = result.status === 0;
  checks.push({
    section,
    name,
    status: passed ? "PASS" : "FAIL",
    critical,
    expected,
    actual: passed ? passDetail : `Komento päättyi virhekoodiin ${result.status ?? "tuntematon"}.`,
    error: passed ? null : (output || result.error?.message || "Prosessia ei voitu käynnistää").slice(-4000),
    suggestion: passed ? null : "Avaa virheloki, korjaa tarkistuksen osoittama puute ja aja npm run audit:release uudelleen.",
    file,
    command: [command, ...args].join(" "),
    durationMs: Date.now() - started,
  });
}

function manual(section, name, expected, file, actual = "Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.") {
  checks.push({ section, name, status: "MANUAL REVIEW", critical: false, expected, actual, error: null, suggestion: "Merkitse tulos reports/manual-review-checklist.md-tiedostoon.", file, command: null, durationMs: 0 });
}

run({ section: "Yhteenveto", name: "Lint", command: npm, args: ["run", "lint"], expected: "ESLint ei raportoi virheitä.", file: "eslint.config.mjs", passDetail: "ESLint läpäisi." });
run({ section: "Yhteenveto", name: "TypeScript", command: npm, args: ["run", "typecheck"], expected: "TypeScript-käännöstarkistus läpäisee.", file: "tsconfig.json", passDetail: "TypeScript-tarkistus läpäisi." });
run({ section: "Release 0.1", name: "Foundation-yksikkötestit", command: npm, args: ["run", "test:unit"], expected: "Laskenta, validointi, lähdearvon säilytys, tontti ja juridiset tilat toimivat.", file: "tests/release-foundation.test.ts", passDetail: "Foundation-testit läpäisivät." });
run({ section: "Release 0.3", name: "Integraatiotestit", command: npm, args: ["run", "test:integration"], expected: "Parseri ja korjaushistorian sääntö toimivat yhdessä.", file: "tests/parser-normalization.test.ts", passDetail: "Integraatiotestit läpäisivät." });
run({ section: "Parseri", name: "Parserin fixture-testit", command: npm, args: ["run", "test:fixtures"], expected: "Etuovi-, Oikotie-, tekstisyöte-, virhe- ja ristiriitatilanteet läpäisevät.", file: "tests/fixtures/listing-fixtures.ts", passDetail: "Parserin fixture-aineisto läpäisi." });
run({ section: "Yhteenveto", name: "Kaikki yksikkö- ja integraatiotestit", command: npm, args: ["run", "test"], expected: "Projektin koko automaattinen testisarja läpäisee.", file: "tests/", passDetail: "Koko testisarja läpäisi." });
run({ section: "Release 0.2", name: "Production build", command: npm, args: ["run", "build"], expected: "Next.js-tuotantokäännös onnistuu.", file: "src/app/", passDetail: "Tuotantokäännös onnistui." });
run({ section: "Release 0.2", name: "Renderöidyn käyttöliittymän E2E-smoke", command: npm, args: ["run", "test:rendered"], expected: "Rakennettu aloitusnäkymä sisältää onboarding-polut eikä teknisiä arvoja.", file: "tests/rendered-ui.test.mjs", passDetail: "Rakennetun HTML:n käyttöliittymäsavu läpäisi." });
run({ section: "Responsiivisuus", name: "Responsiivisuuden komponenttitestit", command: npm, args: ["run", "test:responsive"], expected: "1280, 1366, 1440, 1536 ja 1920 px layout-sopimukset ovat voimassa.", file: "tests/responsive-layout.test.ts", passDetail: "Kaikki viewport-kohtaiset komponenttisopimukset läpäisivät." });
run({ section: "Release 0.3", name: "Selainautomaation integraatiotestit", command: npm, args: ["run", "test:browser"], expected: "Chromium avaa fixture-sivun, käsittelee suostumuksen, vierittää, avaa haitarit ja välttää toimintopainikkeet.", file: "tests/listing-browser.integration.test.ts", passDetail: "Playwrightin fixture-integraatiotestit läpäisivät." });
run({ section: "Responsiivisuus", name: "Viewport-kuvakaappaukset", command: npm, args: ["run", "test:screenshots"], expected: "Viisi viewport-kuvakaappausta syntyy ilman vaakaylivuotoa tai yläpalkin päällekkäisyyttä.", file: "reports/screenshots/", passDetail: "Kuvakaappaukset luotiin kaikista pyydetyistä viewport-ko'oista." });
run({ section: "Suomennos", name: "Renderöity kielentarkistus", command: npm, args: ["run", "test:localization"], expected: "Käyttöliittymä on suomeksi eikä renderöity teksti sisällä kiellettyjä teknisiä arvoja.", file: "tests/support/forbidden-visible-values.mjs", passDetail: "Suomennos- ja renderöidyn tekstin tarkistukset läpäisivät." });
run({ section: "Suomennos", name: "Enum-arvojen näyttötekstit", command: node, args: ["--test", "--experimental-strip-types", "tests/localization.test.ts"], expected: "Kaikilla tunnetuilla enum-arvoilla on suomenkielinen näyttöarvo.", file: "src/core/i18n/display-values.ts", passDetail: "Enum-arvojen suomennokset läpäisivät." });
run({ section: "Taloyhtiöremontit", name: "Suurten remonttien tarkistuslista", command: node, args: ["--experimental-strip-types", "scripts/audit-checks/major-repairs.mjs"], expected: "Pienten töiden historia nostaa varovaisen tarkistuksen ja olennaiset rakennusosat.", file: "src/core/rules/repair-history.ts", passDetail: "Korjaushistorian tarkistuslista ja varovainen muotoilu läpäisivät." });

manual("Release 0.3", "Oikeat Etuovi- ja Oikotie-linkit", "Anonymisoidut aidot linkit toimivat ja lähdekatkelmat ovat ymmärrettäviä.", "reports/manual-review-checklist.md");
for (const name of ["Visuaalinen selkeys", "Tekstien ymmärrettävyys", "Varoitusten sävy", "Tarkistusnäkymän kuormittavuus", "Tietojen löydettävyys", "Ammattilaisen arvio -osion luontevuus", "Mobiilinäkymä", "Selainyhteensopivuus"]) manual("Manuaalinen tarkistus", name, `${name} arvioidaan selaimessa ja kirjataan tarkistuslistaan.`, "reports/manual-review-checklist.md");

const counts = { PASS: 0, FAIL: 0, WARNING: 0, "MANUAL REVIEW": 0 };
for (const check of checks) counts[check.status] += 1;
const criticalFailure = checks.some((check) => check.status === "FAIL" && check.critical);
const sections = ["Release 0.1", "Release 0.2", "Release 0.3", "Parseri", "Taloyhtiöremontit", "Responsiivisuus", "Suomennos", "Manuaalinen tarkistus"];

const lines = ["# Release Audit", "", `Luotu: ${new Date().toISOString()}`, "", "## Yhteenveto", "", `- PASS: ${counts.PASS}`, `- FAIL: ${counts.FAIL}`, `- WARNING: ${counts.WARNING}`, `- MANUAL REVIEW: ${counts["MANUAL REVIEW"]}`, ""];
for (const section of sections) {
  lines.push(`## ${section}`, "");
  const items = checks.filter((check) => check.section === section || (section === "Release 0.1" && check.section === "Yhteenveto"));
  if (!items.length) lines.push("- Ei erillisiä tarkistuksia.", "");
  for (const check of items) {
    lines.push(
      `### ${check.name} — ${check.status}`,
      "",
      `- Odotettu tulos: ${check.expected}`,
      `- Toteutunut tulos: ${check.actual}`,
      `- Virhe: ${check.error ? check.error.replace(/\r?\n/g, " ") : "Ei virhettä"}`,
      `- Korjausehdotus: ${check.suggestion ?? "Ei korjattavaa"}`,
      `- Liittyvä tiedosto tai komponentti: ${check.file}`,
      "",
    );
  }
}
lines.push("### Kuvakaappaukset", "", "Kuvakaappaukset tallennetaan onnistuessaan kansioon [`reports/screenshots/`](screenshots/). Nykyisessä ympäristössä tarkistus on merkitty manuaaliseksi.", "", "Katso myös [`manual-review-checklist.md`](manual-review-checklist.md).", "");

const report = { name: "Release Audit Suite", generatedAt: new Date().toISOString(), summary: counts, criticalFailure, checks };
await Promise.all([
  writeFile(path.join(reportsDir, "release-audit.md"), `${lines.join("\n")}\n`, "utf8"),
  writeFile(path.join(reportsDir, "release-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
]);

console.log(`Release Audit Suite: PASS ${counts.PASS}, FAIL ${counts.FAIL}, WARNING ${counts.WARNING}, MANUAL REVIEW ${counts["MANUAL REVIEW"]}`);
console.log("Raportit: reports/release-audit.md ja reports/release-audit.json");
if (criticalFailure) process.exitCode = 1;
