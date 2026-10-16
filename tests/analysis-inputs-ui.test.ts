import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (name: string) => readFile(new URL(`../src/components/property/${name}`, import.meta.url), "utf8");

test("hintaryhmä näyttää pääkentät vierekkäin ja pitää remonttivaran kertaluonteisena", async () => {
  const purchase = await source("purchase-card.tsx");
  assert.match(purchase, /data-price-row/);
  assert.match(purchase, /grid-cols-1/);
  assert.match(purchase, /sm:grid-cols-3/);
  assert.ok(purchase.indexOf("Velaton hinta") < purchase.indexOf("Myyntihinta"));
  assert.ok(purchase.indexOf("Myyntihinta") < purchase.indexOf("Yhtiölainaosuus"));
  assert.ok(purchase.indexOf("Yhtiölainaosuus") < purchase.indexOf("Remonttivara"));
  assert.match(purchase, /Oikaistu hankintahinta/);
  assert.doesNotMatch(purchase, /Rahoitusvastike/);
});

test("rahoitusvastike kuuluu vuokrauksen ja tuottojen osioon ja yhtiölaina yhteenvetoon", async () => {
  const assumptions = await source("assumptions-card.tsx");
  const overview = await source("financial-overview-card.tsx");
  assert.match(assumptions, /C\. Vuokraus ja tuotot/);
  assert.match(assumptions, /label="Rahoitusvastike"/);
  assert.match(overview, /Yhtiölainaosuus/);
  assert.match(overview, /Päätelty hinnoista/);
});

test("lähtötieto-osiot etenevät A-hankinnasta B-rahoitukseen ja C-vuokraukseen", async () => {
  const [purchase, assumptions, workspace] = await Promise.all([
    source("purchase-card.tsx"),
    source("assumptions-card.tsx"),
    source("property-workspace.tsx"),
  ]);

  assert.match(purchase, /A\. Hinta ja hankinta/);
  assert.ok(workspace.indexOf("<PurchaseCard") < workspace.indexOf("<AssumptionsCard"));
  assert.ok(assumptions.indexOf("B. Pankkirahoitus") < assumptions.indexOf("C. Vuokraus ja tuotot"));
  assert.ok(assumptions.indexOf('data-input-group="bank-financing"') < assumptions.indexOf('data-input-group="monthly-income-and-costs"'));
});

test("kuukausittaista remonttivaraa ei renderöidä eikä lasketa", async () => {
  const files = await Promise.all([
    source("assumptions-card.tsx"),
    source("financial-overview-card.tsx"),
    readFile(new URL("../src/core/calculations/investment-analysis.ts", import.meta.url), "utf8"),
  ]);
  for (const file of files) assert.doesNotMatch(file, /maintenanceReserveMonthly|Kuukausittainen remonttivara/);
});

test("keskeisillä lähtötiedoilla on käyttäjälle näkyvät selitteet", async () => {
  const combined = `${await source("purchase-card.tsx")}\n${await source("assumptions-card.tsx")}`;
  for (const text of [
    "Kohteen hinta sisältäen mahdollisen huoneistokohtaisen yhtiölainaosuuden.",
    "Myyjälle maksettava kauppahinta ilman huoneistokohtaista yhtiölainaosuutta.",
    "Taloyhtiön kuukausittainen hoitovastike. Ei sisällä rahoitusvastiketta.",
    "Viitekorko ja pankin marginaali yhteensä.",
    "Pankkilainan vakuudeksi arvioitu osuus.",
    "omistuksen rekisteröinti ja muut kertaluonteiset ostokulut",
  ]) assert.match(combined, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(combined, /Esimerkiksi pankin lainan järjestely- tai nostopalkkio/);
});

test("viisi lyhennystapaa ja niiden suomenkieliset selitteet ovat käyttöliittymässä", async () => {
  const assumptions = await source("assumptions-card.tsx");
  for (const value of ["annuity", "fixed_payment", "equal_principal", "interest_only", "bullet"]) assert.match(assumptions, new RegExp(`value: "${value}"`));
  for (const label of ["Annuiteetti", "Kiinteä tasaerä", "Tasalyhennys", "Vain korko", "Kertalyhennys / bullet"]) assert.match(assumptions, new RegExp(label.replace("/", "\\/")));
});

test("oma pääoma on rahoitusosion ensimmäinen koko leveä kenttä ja laina heti sen alla", async () => {
  const assumptions = await source("assumptions-card.tsx");
  const financing = assumptions.slice(assumptions.indexOf('data-input-group="bank-financing"'), assumptions.indexOf('data-input-group="monthly-income-and-costs"'));
  assert.ok(financing.indexOf("Sijoitettu oma pääoma") < financing.indexOf("Pankkilainan määrä"));
  assert.ok(financing.indexOf("Pankkilainan määrä") < financing.indexOf("Pankkilainan kokonaiskorko"));
  assert.match(financing, /sm:col-span-2/);
  assert.match(financing, /grid-cols-1[\s\S]*sm:grid-cols-2/);
  assert.match(financing, /Lasketaan automaattisesti hankinnan rahoitustarpeesta vähentämällä sijoitettu oma pääoma/);
  assert.doesNotMatch(financing, /min-\[1600px\]:grid-cols-3/);
});

test("markkinakortit erottavat oletuksen, automaattisen arvion ja käyttäjän valinnan", async () => {
  const selector = await source("rental-demand-selector.tsx");
  for (const text of ["Oletus", "Automaattinen arvio", "Käyttäjän valinta", "Palauta oletus", "Tarkemmat perusteet", "luotettavuus"]) assert.match(selector, new RegExp(text, "i"));
  assert.match(selector, /aria-pressed/);
  assert.match(selector, /grid-cols-1/);
  assert.doesNotMatch(selector, /70–120 päivää|120–180 päivää|yli 180 päivää/);
  assert.doesNotMatch(selector, />automatic<|>user<|>unknown</);
});
