# Pre-launch security- ja tietosuojatarkastus

Päivitetty 23.10.2026. Tämä on tekninen tarkastus, ei juridinen lausunto eikä väite GDPR-vaatimustenmukaisuudesta.

## Tiivistelmä

Julkinen analyysipolku ei pyydä nimeä tai sähköpostia, ei luo käyttäjätiliä eikä käytä liidisessiota tai tietokantaa. Analyysiluonnos säilyy saman selainistunnon `sessionStorage`-tallennuksessa. Vapaaehtoiset koulutuslinkit avaavat Kajabin ulkoisen sivun.

Koodissa korjatut korkean riskin havainnot:

- Next.js päivitettiin versiosta 16.3.8 versioon 16.4.2 kolmen tuotantoriippuvuutta koskevan haavoittuvuuden vuoksi. `npm audit --omit=dev` ei tämän jälkeen löytänyt haavoittuvuuksia.
- Julkiset analyysi-, kuva- ja valinnaiset asiakirjareitit tarkistavat same-origin-pyynnön ja käyttävät instanssikohtaista kutsurajoitusta.
- Kuvantulkinnan sisäisiä palvelinvirheitä ei palauteta käyttäjälle.
- Automaattinen ilmoituskuvien lähetys kuvantulkintaan vaatii API-avaimen lisäksi nimenomaisen `ENABLE_LISTING_IMAGE_ANALYSIS=true` -asetuksen.
- Sovellus lähettää CSP-, clickjacking-, MIME-sniffing-, referrer- ja permissions-otsakkeet.
- Tuotannon source mapit on kytketty nimenomaisesti pois ja HSTS-, COOP- sekä CORP-otsakkeet on lisätty.
- Vercel Web Analytics poistaa URL:n hakuparametrit ja käyttää vain rajattuja, henkilötiedottomia tuote-eventtejä.
- Vanha Postgres-liiditallennus, migraatio ja CSV-reitti on poistettu sovelluksesta.

## Client/server-raja

### Vain palvelimella

- Myynti-ilmoituksen URL-haku, selainautomaatio, uudelleenohjaukset ja SSRF-tarkistukset.
- Varsinainen ilmoitustekstin parseri ja tuotantovastauksesta poistettavat diagnostiikat.
- Paikallinen PDF-/TXT-tekstinpoiminta ja deterministinen dokumenttiparseri. Julkinen dokumenttireitti on oletuksena pois käytöstä.
- Valokuvien haku, kuvien turvallisuustarkistukset sekä kuvantulkintapalvelun avain.
- Web Analyticsin same-origin-välityspiste; sovellus rajaa lähetettävät eventit eikä lisää laskentadataa.

### Asiakkaan JavaScript-paketissa

- Interaktiivinen talouslaskenta, pankkilainan laskenta, vakuusvaje ja sijoituspisteiden painot.
- Markkina-arvioiden esitysmalli, hintasynkronointi ja raportin selainpohjainen tulostus.
- Tämä on tietoinen IP-altistus. Selainkoodia ei pidä pitää salaisena.

## API-rajat ja väärinkäytön esto

- `POST /api/listing-identify`: same-origin, 2 048 merkin URL-raja ja instanssikohtainen 10 pyyntöä / 15 min -raja.
- `POST /api/listing-import`: same-origin, 100 000 merkin syöteraja ja instanssikohtainen 20 pyyntöä / 15 min -raja.
- `POST /api/visual-condition`: same-origin, 10 pyyntöä / 15 min, tiedostotyyppi- ja kokorajat sekä käyttäjän hyväksymä käsittelyrajaus.
- `POST /api/document-analysis`: oletuksena 404 ennen request bodyn lukemista; käyttöön otettuna same-origin ja 10 pyyntöä / 15 min.
- Instanssikohtainen muistirajoitus ei ole hajautettu tuotantorajoitus. Ennen suurempaa liikennettä Vercel Firewallissa tai vastaavassa pitää ottaa käyttöön jaettu rate limit, erityisesti kustannuksia aiheuttaville kuva- ja selainreiteille.
- URL-haku sallii vain HTTPS Etuovi- ja Oikotie-ilmoitukset. DNS-tulos, jokainen uudelleenohjaus ja kuva-CDN tarkistetaan yksityisverkko- ja localhost-kohteiden estämiseksi.

## Selain- ja sisältöturva

Tuotantobuild ei julkaise browser source mappeja. Sovellus ei käytä anti-debug- tai DevTools-estokikkoja. CSP sallii Next.js:n staattisen renderöinnin vuoksi inline-skriptit ja -tyylit; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` ja `form-action 'self'` pienentävät riskiä, mutta inline-poikkeus jää jatkokehityksen kohteeksi. Tiukempi nonce-CSP muuttaisi sivut dynaamisiksi ja vaatii erillisen suorituskyky- ja välimuistipäätöksen.

## Henkilötiedot ja palveluntarjoajat

- Julkinen laskuri ei kerää nimeä, sähköpostia tai markkinointisuostumusta.
- Vercel voi käsitellä IP- ja teknisiä lokitietoja hostingin yhteydessä. Vercelin nykyinen DPA koskee sen ehtojen mukaan Pro- ja Enterprise-asiakkaita, käsittely voi tapahtua Yhdysvalloissa ja siirtomekanismina käytetään muun muassa SCC-lausekkeita. Omistajan pitää varmistaa oman Vercel-tilauksensa sopimusasema ja asetukset: <https://vercel.com/legal/dpa>.
- Neon/PostgreSQL ei kuulu sovellukseen. Jos Vercelin ulkopuoliseen Neon-resurssiin on jäänyt vanhaa liididataa, se on edelleen henkilötietoa ja vaatii erillisen säilytys- tai poistopäätöksen. Resurssia ei ole poistettu tässä työssä.
- Kajabi käsittelee vapaaehtoisella ulkoisella sivulla annettuja yhteystietoja. Kajabin DPA tulee sen ehtojen mukaan osaksi palvelusopimusta, Kajabi toimii asiakasdatan käsittelijänä ja käsittelyä voi tapahtua Yhdysvalloissa. Omistajan pitää tarkistaa Kajabi-lomakkeen suostumusteksti, double opt-in, peruutuspolku ja alikäsittelijät: <https://www.kajabi.com/policies/dpa> ja <https://help.kajabi.com/en/articles/17175126-comply-with-privacy-regulations-using-kajabi>.
- OpenAI-kuvantulkinta on valinnainen. Automaattinen ilmoituskuvien käsittely on oletuksena pois päältä. Jos se otetaan käyttöön, omistajan pitää hyväksyä oikeusperuste, palveluntarjoajakuvaus, siirtomekanismi ja käyttäjäinformointi ennen deploymentia.

## Julkaisun juridiset ja organisatoriset estot

Seuraavia ei voi ratkaista koodista eikä niitä saa täyttää esimerkkitiedoilla:

1. `PRIVACY_CONTROLLER_NAME`: todellinen rekisterinpitäjä.
2. `PRIVACY_CONTACT`: rekisteröidyn pyyntöjen oikea yhteydenottokanava.
3. `PRIVACY_RETENTION_PERIOD`: hyväksytyt säilytys- ja poistokäytännöt, myös Vercel-lokeille ja analytiikalle.
4. `PRIVACY_INTERNATIONAL_TRANSFERS`: tosiasialliset siirrot ja suojatoimet käytössä olevilla sopimuksilla.
5. `PRIVACY_LEGAL_BASES`: hyväksytyt käsittelyn oikeusperusteet.
6. `PRIVACY_SERVICE_PROVIDERS`: toteutusta vastaava palveluntarjoaja- ja käsittelijäkuvaus.
7. Vercel-, Kajabi- ja mahdollisen OpenAI-sopimuksen sekä alikäsittelijöiden omistajakohtainen tarkistus.
8. Mahdollisen Vercelin ulkopuolisen Neon-datan säilytys- tai poistopäätös ja rekisteröidyn pyyntöjen varmennusmenettely.

Tietosuojasivu näyttää näiden puuttumisen suoraan eikä väitä palvelua julkaisuvalmiiksi.

## Avoimet tekniset riskit

- Instanssikohtainen rate limit nollautuu kylmäkäynnistyksessä eikä jaa tilaa Vercel-instanssien välillä.
- Talous- ja pisteytyslogiikka on osittain julkisessa client bundlessa.
- CSP sisältää `unsafe-inline`-poikkeuksen.
- Kehitysriippuvuuksissa on `braces`-paketin kautta yhdeksän high-luokan audit-havaintoa. Ne eivät kuulu tuotantoriippuvuuksiin; automaattinen korjaus alentaisi `shadcn`-paketin rikkovasti versioon 1.0.0, joten sitä ei tehty tässä rajatussa korjauksessa.
