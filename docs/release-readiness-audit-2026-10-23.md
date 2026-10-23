# Julkaisuvalmiustarkastus 23.10.2026

## Päätös

**KOODI ON TESTATTU, MUTTA JULKINEN AVAUS ON ESTETTY.** Laskuri toimii ilman tietokantaa, tuotantoriippuvuuksissa ei ole tunnettuja npm-haavoittuvuuksia ja automaattiset sovellus-, parseri-, PDF- sekä responsiivisuustestit läpäisevät. Julkinen domain osoittaa edelleen vanhalle palvelimelle, TLS-varmenne ei kelpaa, tietosuojan omistajatiedot puuttuvat ja GitHub-repositorio on julkinen.

## Toteutetut julkaisuvalmistelut

- Poistettu käyttämätön PostgreSQL-riippuvuus, migraatio, liidimalli, CSV-reitti ja ylläpitoskriptit.
- Lisätty Vercel Web Analytics sekä `calculator_used`, `report_downloaded`, `analysis_order_clicked` ja `kajabi_redirect_clicked`.
- Rajattu eventtien metadata CTA:n tyyppiin/sijaintiin ja poistettu seuranta-URL:sta hakuparametrit sekä ankkurit.
- Päivitetty tietosuojasivu kuvaamaan istuntotallennus, tilapäinen palvelinkäsittely, selain-PDF, analytiikka, Kajabi ja valinnainen OpenAI-kuvatulkinta.
- Lisätty konfiguroitavat oikeusperuste- ja palveluntarjoajatiedot.
- Vaihdettu canonical-, robots- ja sitemap-osoitteeksi apex `https://asuntosijoituslaskuri.fi`.
- Kytketty tuotannon browser source mapit nimenomaisesti pois ja lisätty HSTS-, COOP- sekä CORP-otsakkeet.
- Lisätty tietovirta-, domain-, ympäristömuuttuja- ja palautusohje `docs/LAUNCH_OPERATIONS.md`.

## Varmennetut tulokset

- Node-testit: 453/453.
- Renderöidyn UI:n smoke-testi: 1/1.
- Playwright-selainintegraatiot: 4/4 osana koko sarjaa.
- Mobiilipolku: 375×667, 390×844 ja 430×932 läpäisivät URL → analyysi → muokkaus → raportti -polun ilman vaakaylivuotoa.
- Desktop-kuvakaappaukset: 1280, 1366, 1440, 1536 ja 1920 px läpäisivät.
- TypeScript, ESLint ja Next.js 16.4.2 production build läpäisivät.
- `npm audit --omit=dev`: 0 haavoittuvuutta.
- Kajabin koulutus-URL palautti HTTP 200. Asiantuntija-arvion URL ohjasi checkoutiin, mutta automaattinen pyyntö sai HTTP 403; toiminta vaatii vielä oikealla selaimella tehtävän tarkistuksen.

Kehitysriippuvuuksissa on 9 high-luokan `braces`-ketjun audit-havaintoa. Npm:n tarjoama automaattinen korjaus alentaisi `shadcn`-paketin rikkovasti versioon 1.0.0, joten `--force`-korjausta ei tehty. Haavoittuva ketju ei kuulu tuotantoriippuvuuksiin.

## Julkaisun estot ja omistajan toimet

1. GitHub REST API palauttaa repositoryn julkisena. Jos Opportunity Score ja muu lähdekoodi halutaan suojata, vaihda repository private-tilaan ja varmista sen jälkeen Vercelin GitHub-oikeudet. Branch protectionia ei voitu tarkistaa ilman GitHub-hallintaoikeutta.
2. Apex ja `www` ratkeavat osoitteeseen `84.34.166.69`. HTTP palauttaa 200 ilman redirectiä ja HTTPS-varmenteen nimi on virheellinen. Lisää molemmat domainit Verceliin, käytä vain projektin näyttämiä DNS-arvoja, tee apexista primary ja ohjaa `www` apexiin.
3. Paikallista `.vercel/project.json`-linkitystä ei ole. Vercel-projektia, plania, tuotantodeploymentia tai Web Analyticsin dashboard-aktivointia ei voitu tarkistaa tästä ympäristöstä.
4. Täytä ja juridisesti hyväksy kuusi `PRIVACY_*`-asetusta. Tarkista Vercel-, Kajabi- ja mahdollisen OpenAI-käsittelyn DPA:t, alueet, alikäsittelijät, säilytys, poistot ja kansainväliset siirrot.
5. Tarkista mahdollisen ulkoisen Neon-resurssin sisältö. Poista Vercelin vanhat `DATABASE_URL`- ja `LEAD_EXPORT_ADMIN_TOKEN`-asetukset sekä Neon vasta erillisellä hyväksynnällä ja vasta, kun mahdollisen vanhan datan säilytys-/poistopäätös on tehty.
6. Ota Vercel Web Analytics käyttöön dashboardista ja varmista, että tilaus tukee custom eventtejä. Tee deployment ja vahvista eventit production Analytics -näkymästä ilman henkilötietoja.
7. Ota ennen suurempaa liikennettä käyttöön Vercel Firewallin tai muun jaetun rate limitin. Nykyinen sovellusraja on instanssikohtainen ja nollautuu kylmäkäynnistyksessä.
8. Tarkista asiantuntija-arvion Kajabi-checkout oikealla selaimella.

DNS-, domain-, GitHub-näkyvyys-, Vercel- tai Neon-resursseja ei muutettu tämän tarkastuksen aikana.
