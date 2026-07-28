# Release Audit

Luotu: 2026-07-28T04:30:15.152Z

## Yhteenveto

- PASS: 14
- FAIL: 0
- WARNING: 0
- MANUAL REVIEW: 9

## Release 0.1

### Lint — PASS

- Odotettu tulos: ESLint ei raportoi virheitä.
- Toteutunut tulos: ESLint läpäisi.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: eslint.config.mjs

### TypeScript — PASS

- Odotettu tulos: TypeScript-käännöstarkistus läpäisee.
- Toteutunut tulos: TypeScript-tarkistus läpäisi.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tsconfig.json

### Foundation-yksikkötestit — PASS

- Odotettu tulos: Laskenta, validointi, lähdearvon säilytys, tontti ja juridiset tilat toimivat.
- Toteutunut tulos: Foundation-testit läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/release-foundation.test.ts

### Kaikki yksikkö- ja integraatiotestit — PASS

- Odotettu tulos: Projektin koko automaattinen testisarja läpäisee.
- Toteutunut tulos: Koko testisarja läpäisi.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/

## Release 0.2

### Production build — PASS

- Odotettu tulos: Next.js-tuotantokäännös onnistuu.
- Toteutunut tulos: Tuotantokäännös onnistui.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: src/app/

### Renderöidyn käyttöliittymän E2E-smoke — PASS

- Odotettu tulos: Rakennettu aloitusnäkymä sisältää onboarding-polut eikä teknisiä arvoja.
- Toteutunut tulos: Rakennetun HTML:n käyttöliittymäsavu läpäisi.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/rendered-ui.test.mjs

## Release 0.3

### Integraatiotestit — PASS

- Odotettu tulos: Parseri ja korjaushistorian sääntö toimivat yhdessä.
- Toteutunut tulos: Integraatiotestit läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/parser-normalization.test.ts

### Selainautomaation integraatiotestit — PASS

- Odotettu tulos: Chromium avaa fixture-sivun, käsittelee suostumuksen, vierittää, avaa haitarit ja välttää toimintopainikkeet.
- Toteutunut tulos: Playwrightin fixture-integraatiotestit läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/listing-browser.integration.test.ts

### Oikeat Etuovi- ja Oikotie-linkit — MANUAL REVIEW

- Odotettu tulos: Anonymisoidut aidot linkit toimivat ja lähdekatkelmat ovat ymmärrettäviä.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

## Parseri

### Parserin fixture-testit — PASS

- Odotettu tulos: Etuovi-, Oikotie-, tekstisyöte-, virhe- ja ristiriitatilanteet läpäisevät.
- Toteutunut tulos: Parserin fixture-aineisto läpäisi.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/fixtures/listing-fixtures.ts

## Taloyhtiöremontit

### Suurten remonttien tarkistuslista — PASS

- Odotettu tulos: Pienten töiden historia nostaa varovaisen tarkistuksen ja olennaiset rakennusosat.
- Toteutunut tulos: Korjaushistorian tarkistuslista ja varovainen muotoilu läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: src/core/rules/repair-history.ts

## Responsiivisuus

### Responsiivisuuden komponenttitestit — PASS

- Odotettu tulos: 1280, 1366, 1440, 1536 ja 1920 px layout-sopimukset ovat voimassa.
- Toteutunut tulos: Kaikki viewport-kohtaiset komponenttisopimukset läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/responsive-layout.test.ts

### Viewport-kuvakaappaukset — PASS

- Odotettu tulos: Viisi viewport-kuvakaappausta syntyy ilman vaakaylivuotoa tai yläpalkin päällekkäisyyttä.
- Toteutunut tulos: Kuvakaappaukset luotiin kaikista pyydetyistä viewport-ko'oista.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: reports/screenshots/

## Suomennos

### Renderöity kielentarkistus — PASS

- Odotettu tulos: Käyttöliittymä on suomeksi eikä renderöity teksti sisällä kiellettyjä teknisiä arvoja.
- Toteutunut tulos: Suomennos- ja renderöidyn tekstin tarkistukset läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: tests/support/forbidden-visible-values.mjs

### Enum-arvojen näyttötekstit — PASS

- Odotettu tulos: Kaikilla tunnetuilla enum-arvoilla on suomenkielinen näyttöarvo.
- Toteutunut tulos: Enum-arvojen suomennokset läpäisivät.
- Virhe: Ei virhettä
- Korjausehdotus: Ei korjattavaa
- Liittyvä tiedosto tai komponentti: src/core/i18n/display-values.ts

## Manuaalinen tarkistus

### Visuaalinen selkeys — MANUAL REVIEW

- Odotettu tulos: Visuaalinen selkeys arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Tekstien ymmärrettävyys — MANUAL REVIEW

- Odotettu tulos: Tekstien ymmärrettävyys arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Varoitusten sävy — MANUAL REVIEW

- Odotettu tulos: Varoitusten sävy arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Tarkistusnäkymän kuormittavuus — MANUAL REVIEW

- Odotettu tulos: Tarkistusnäkymän kuormittavuus arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Tietojen löydettävyys — MANUAL REVIEW

- Odotettu tulos: Tietojen löydettävyys arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Ammattilaisen arvio -osion luontevuus — MANUAL REVIEW

- Odotettu tulos: Ammattilaisen arvio -osion luontevuus arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Mobiilinäkymä — MANUAL REVIEW

- Odotettu tulos: Mobiilinäkymä arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Selainyhteensopivuus — MANUAL REVIEW

- Odotettu tulos: Selainyhteensopivuus arvioidaan selaimessa ja kirjataan tarkistuslistaan.
- Toteutunut tulos: Vaatii ihmisen tekemän visuaalisen tai ulkoiseen palveluun kohdistuvan tarkistuksen.
- Virhe: Ei virhettä
- Korjausehdotus: Merkitse tulos reports/manual-review-checklist.md-tiedostoon.
- Liittyvä tiedosto tai komponentti: reports/manual-review-checklist.md

### Kuvakaappaukset

Kuvakaappaukset tallennetaan onnistuessaan kansioon [`reports/screenshots/`](screenshots/). Nykyisessä ympäristössä tarkistus on merkitty manuaaliseksi.

Katso myös [`manual-review-checklist.md`](manual-review-checklist.md).

