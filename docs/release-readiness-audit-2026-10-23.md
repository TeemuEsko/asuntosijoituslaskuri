# Julkaisuvalmiustarkastus 23.10.2026

## Päätös

**JULKAISU ESTETTY.** Sovelluskoodi, laskenta, parseri, käyttöliittymä ja PDF läpäisevät tarkistukset, mutta julkinen domain ei osoita Verceliin, HTTPS-varmenne ei kelpaa ja tietosuojan pakolliset omistajapäätökset puuttuvat. Main-haaraan ei pidä puskea tätä auditointiversiota ennen näiden kohtien ratkaisemista ja uutta smoke-testiä.

## A. Tehdyt korjaukset

- Päivitetty Next.js ja `eslint-config-next` 16.4.2-versioon kriittisten tuotantohaavoittuvuuksien poistamiseksi.
- Vaihdettu production build Next 16:n dokumentoituun `--webpack`-polkuun, koska Turbopack 16.4.2 kaatui tämän Windows-ympäristön PostCSS-aliprosessissa.
- Lisätty same-origin-tarkistus ja instanssikohtainen rate limit analyysi-, kuva- ja valinnaiselle dokumenttireitille.
- Estetty kuvantulkinnan sisäisten virhetekstien palautus asiakkaalle.
- Muutettu automaattinen ilmoituskuvien analyysi erikseen käyttöön otettavaksi ominaisuudeksi.
- Lisätty CSP ja muut perusturvaotsakkeet.
- Lisätty `www`-canonical, selkeä metadata, `robots.txt` ja sitemap.
- Lisätty näkyvä tietosuojalinkki sekä täsmällinen kuvaus selainistunnon luonnostallennuksesta.
- Korjattu README:n vanhentunut väite pakollisesta liidisessiosta.
- Lisätty julkaisuturvan regressiotestit ja laskennan ääriarvotestit.
- Poistettu PDF:n tarkistuslistan välimerkkieroista syntyvät kaksoiskappaleet.

## B. Testitulokset

- Koko Node-testisarja: 449/449 läpäisi.
- Live Etuovi 55962690: HTTP 200, 24 löydöstä, hoitovastike 359,60 €/kk.
- Live Etuovi 80534744: HTTP 200, 28 löydöstä, hoitovastike 321,30 €/kk.
- Oikotie: fixture-, turvallisuus- ja parseritestit läpäisivät; tässä auditissa ei ollut käyttäjän toimittamaa vakaata live-URL:ia.
- Mobiili 375×667, 390×844 ja 430×932: URL → analyysi → muokkaus → raportti läpäisi ilman runtime-virhettä tai vaakaylivuotoa.
- Desktop-kuvakaappaustesti 1280, 1366, 1440, 1536 ja 1920 px: läpäisi.
- Production build: Next.js 16.4.2 Webpack build läpäisi.
- Lint, TypeScript, renderöity UI ja lokalisaatio: läpäisivät.
- Tuotantoriippuvuuksien audit: 0 haavoittuvuutta.

## C. PDF-tarkastus

Chromiumilla luotu A4-raportti oli neljä sivua. Kaikki sivut renderöitiin PNG-kuviksi ja tarkastettiin. Ei tyhjiä sivuja, päällekkäisiä elementtejä, katkenneita kortteja tai vaakaoverflow'ta. Järjestys on A Hinta ja hankinta → B Pankkirahoitus → C Vuokraus ja tuotot. Talousluvut vastaavat käyttöliittymän canonical-arvoja. Viimeisellä sivulla oleva koulutus-CTA on tarkoituksellinen kolmas Kajabi-sijoittelu.

## D. Avoimet riskit ja manuaaliset toimet

1. DNS: sekä apex että `www` ratkeavat osoitteeseen `84.34.166.69`, joka vastaa nginxillä vanhaa 1 758 tavun sivua.
2. HTTPS: kummankaan domainin TLS-yhteyttä ei voitu vahvistaa; selain ei saa kelvollista sertifikaattiketjua.
3. Redirect: apex ei ohjaa `www`-osoitteeseen, vaan molemmat palauttavat HTTP 200 samalta nginx-palvelimelta.
4. Vercel: commit `1fb8e1e` on GitHub-statuksen mukaan julkaistu onnistuneesti Verceliin, mutta custom domain ei palvele sitä.
5. Tietosuoja: rekisterinpitäjä, yhteydenotto, säilytys ja kansainvälisten siirtojen kuvaus puuttuvat.
6. Palvelinsopimukset: omistajan pitää varmistaa käytössä olevien Vercel-, Kajabi-, mahdollisen Neon/Databricks- ja OpenAI-tilien DPA:t, alueet ja alikäsittelijät.
7. Rate limit: nykyinen muistiraja ei ole hajautettu. Lisää Vercel Firewall -rajoitus ennen markkinointiliikennettä tai kuvantulkinnan käyttöönottoa.
8. Kehitystyökalut: dev-riippuvuuksissa on yhdeksän high-audit-havaintoa `braces`-ketjussa; tuotantoriippuvuudet ovat puhtaat.

## E. Täsmällinen julkaisun avauslista

1. Lisää Vercel-projektiin `www.asuntosijoituslaskuri.fi` ensisijaiseksi domainiksi.
2. Aseta `www` DNS Vercelin näyttämään CNAME-kohteeseen. Älä arvaa arvoa; kopioi se Vercelin Domains-näkymästä.
3. Lisää apex-domain Verceliin ja määritä se ohjaamaan `www`-domainiin. Käytä Vercelin näyttämää apex-tietuetta.
4. Odota, että Vercel näyttää molemmat domainit validina ja SSL-sertifikaatin myönnettynä.
5. Täytä neljä `PRIVACY_*`-ympäristömuuttujaa todellisilla hyväksytyillä tiedoilla.
6. Aseta `NEXT_PUBLIC_KAJABI_TRAINING_URL` haluttuun tuotantolomakkeeseen ja tarkista lomakkeen suostumus- sekä tietosuojateksti.
7. Jätä `ENABLE_LISTING_IMAGE_ANALYSIS=false`, kunnes OpenAI-käsittely on hyväksytty. Jos ominaisuus otetaan käyttöön, aseta lisäksi `OPENAI_API_KEY` palvelinsalaisuutena.
8. Tee uusi production deployment aina, kun build-time `NEXT_PUBLIC_*`-muuttuja tai koodi muuttuu.
9. Tarkista selaimella `https://www...`, apex-redirect, `/tietosuoja`, `/robots.txt`, `/sitemap.xml`, yksi Etuovi-polku ja PDF.
10. Aja tämän jälkeen koko tarkistusketju uudelleen ja pushaa main vain, jos estot ovat poistuneet.

## F. Git-tila

Auditointimuutoksia ei pusheta main-haaraan niin kauan kuin yllä olevat launch blockerit ovat tiedossa. Tämä noudattaa tehtävän ehtoa, jonka mukaan release-blocked-versiota ei julkaista.
