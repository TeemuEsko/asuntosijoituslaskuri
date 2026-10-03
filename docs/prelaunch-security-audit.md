# Pre-launch client/server- ja API-turvallisuusauditointi

Auditointi on tehty julkaisua edeltävälle buildille 3.10.2026. Tämä dokumentti kuvaa nykytilan, ei lupaa täydellistä IP-suojausta.

## Luokittelu

### A. Vain palvelimella

- Myynti-ilmoituksen URL-haku, selaimen käyttö, SSRF-suojaukset ja sivustoadapterit (`src/core/listing-acquisition`, API-reitti).
- Varsinainen ilmoitustekstin parseri suoritetaan API-reitillä. Julkinen vastaus ei sisällä tuotannossa parserin diagnostiikkaa.
- Dokumentin paikallinen PDF-/TXT-tekstinpoiminta ja deterministinen dokumenttiparseri (`src/server/documents`).
- Valokuvien haku ja OpenAI-kuvantulkintapalvelun avain sekä provider (`src/server/listing-images`, `src/server/visual-condition`).

### B. Asiakkaan JavaScript-paketissa

- Interaktiivinen talouslaskenta, pankkilainan laskenta ja vakuusvaje.
- Sijoituspisteiden adapteri, painot, luokittelurajat sekä osa vahvuus- ja riskisäännöistä.
- Markkina-arvioiden muodostus ja valintojen perustelut.
- Vakuusarvon kaava ja hintojen synkronointi.
- Käyttäjälle näytettävät esityssäännöt, numeeristen kenttien käsittely ja raportin selainpohjainen esitys.

### C. Jaettu

- Canonical-kenttätyypit, provenance- ja merge-rakenteet sekä normalisoinnin apufunktiot.
- Vuokra-, markkina- ja analyysitulosten tyypit.
- Käyttäjälle palautettavat vahvuudet, riskit, selitteet ja lähdetiedot.

## Jäljellä oleva IP-altistus

Suurin jäljellä oleva altistus on selaimessa tehtävä interaktiivinen pisteytys: painot, raja-arvot sekä riskien ja suositusten muodostus voidaan päätellä tuotantopaketista. Näiden siirto palvelimelle vaatii laskennan API-sopimuksen, throttlauksen, virhetilojen ja jokaisen kenttämuutoksen optimistisen käyttöliittymän suunnittelun. Sitä ei tehty tässä buildissa regression-riskin vuoksi. Tavalliset talouskaavat jätettiin tietoisesti selaimeen.

## API-havainnot

- `POST /api/listing-import` on julkinen. Se rajaa tekstisyötteen 100 000 merkkiin, validoi syötteen tyypin ja käyttää URL-haussa domain-, protokolla-, uudelleenohjaus- ja SSRF-suojauksia. Tuotantovastauksesta poistetaan diagnostiikka ja vuokra-arvion sisäinen resoluutioloki.
- `POST /api/visual-condition` on julkinen, jos palvelimelle on määritetty kuvantulkinta-avain. Tiedoston tyyppi ja koko validoidaan, mutta endpointilla ei ole käyttäjäkohtaista access controlia.
- `POST /api/document-analysis` säilyy koodissa, mutta palauttaa oletuksena 404-vastauksen ennen request bodyn lukemista. Se avautuu vain `ENABLE_DOCUMENT_ANALYSIS=true` -asetuksella. Avattuna endpointilla ei ole käyttäjäkohtaista access controlia.
- Reitit hyväksyvät vain toteutetun `POST`-metodin; muille metodeille Next.js palauttaa reittitasolla hylkäyksen.
- Rate limiting puuttuu. Julkaisuympäristöön tarvitaan myöhemmin opt-in/live access gate ja kustannuksia aiheuttaville reiteille rajoitus.

## Source maps ja vältetyt näennäissuojaukset

`productionBrowserSourceMaps` ei ole käytössä, eikä tarkistetussa tuotantobuildissa ollut `.map`-tiedostoja `.next/static`-hakemistossa. Buildiin ei lisätty oikean painikkeen estoa, DevTools-tunnistusta, näppäinestoja, valinnan estoa, anti-debug-koodia tai omaa obfuskointia.
