# Julkaisun käyttö-, tietosuoja- ja palautusohje

## Nykyinen tietovirta

| Toiminto | Selaimeen | Vercelin palvelimelle | Pysyvä tallennus |
| --- | --- | --- | --- |
| Manuaalinen laskenta | Analyysiluonnos välilehden `sessionStorage`-muistissa | Ei talouslaskennan sisältöä | Ei |
| Ilmoituksen tuonti | Löydökset ja analyysiluonnos | Ilmoitus-URL tai liitetty ilmoitusteksti käsitellään tilapäisesti | Ei sovelluksen tietokantaan |
| Asiakirjan tulkinta | Poimitut löydökset | Tiedosto käsitellään tilapäisesti, jos toiminto on käytössä | Ei sovelluksen tietokantaan |
| Kuvien kuntoarvio | Tulkinnan tulos | Kuvat välitetään OpenAI:lle vain, jos toiminto on erikseen käytössä | Ei sovelluksen tietokantaan |
| PDF-raportti | Muodostetaan selaimen tulostustoiminnolla | Ei raporttitiedostoa | Ei |
| Kajabi-CTA | Vapaaehtoinen siirtyminen ulkoiselle sivulle | Laskuri ei lähetä yhteystietoja Kajabiin | Kajabin omien ehtojen mukaan |
| Vercel Web Analytics | Sivunäyttö ja rajattu eventti | URL ilman hakuparametreja sekä eventin nimi; ominaisuuksina vain CTA:n tyyppi/sijainti | Vercelin Analytics-asetusten mukaan |

Osoite, ilmoitus-URL, kuvat ja asiakirjat voivat sisältää henkilötietoa. Myös tilapäinen API-käsittely ja palveluntarjoajan tekniset lokit on huomioitava käsittelynä. Sovelluskoodi ei tarkoituksella kirjoita näitä arvoja omiin lokeihin. Vercelin, OpenAI:n ja Kajabin todelliset loki-, alue-, säilytys- ja alikäsittelijäasetukset on tarkistettava tileiltä sekä käsittelysopimuksista.

## Neon/PostgreSQL

Julkinen sovellus ei tarvitse tietokantaa. PostgreSQL-riippuvuus, liidimigraatio, ylläpito-CSV ja niitä käyttäneet palvelinmoduulit on poistettu. `DATABASE_URL` ja `LEAD_EXPORT_ADMIN_TOKEN` eivät ole enää sovelluksen asetuksia.

Omistajan manuaaliset toimet:

1. Tarkista ennen poistamista, onko Neonissa vanhaa säilytettävää liididataa tai käyttääkö jokin toinen projekti samaa resurssia.
2. Jos dataa on, ratkaise oikeusperuste ja säilytys-/poistovelvoite sekä tee tarvittaessa salattu vienti.
3. Poista Vercel-projektista `DATABASE_URL` ja `LEAD_EXPORT_ADMIN_TOKEN` vasta tarkistuksen jälkeen.
4. Irrota tai poista Neon-integraatio vasta erillisellä hyväksynnällä. Tätä ei ole tehty koodimuutoksessa.

Neonille ei rakenneta uutta varmistusta, koska sovellus ei käytä sitä. Mahdollinen vanha data käsitellään erillisenä omistajapäätöksenä.

## Vercel-asetukset

Pakolliset ennen julkaisua:

- `PRIVACY_CONTROLLER_NAME`
- `PRIVACY_CONTACT`
- `PRIVACY_RETENTION_PERIOD`
- `PRIVACY_INTERNATIONAL_TRANSFERS`
- `PRIVACY_LEGAL_BASES`
- `PRIVACY_SERVICE_PROVIDERS`

Valinnaiset:

- `NEXT_PUBLIC_KAJABI_TRAINING_URL`
- `NEXT_PUBLIC_PROFESSIONAL_EVALUATION_URL`
- `OPENAI_API_KEY`, `VISUAL_CONDITION_MODEL` ja `ENABLE_LISTING_IMAGE_ANALYSIS=true` vain hyväksytylle kuvatulkinnalle
- `LISTING_IMAGE_HOSTS_ETUOVI` ja `LISTING_IMAGE_HOSTS_OIKOTIE` vain tarkistetuille CDN-isännille

Ota Vercel-projektin Analytics-näkymässä Web Analytics käyttöön ja tee uusi production deployment. Sivunäytöt ja kävijät näkyvät Vercel Analyticsissa. Custom eventien saatavuus riippuu Vercelin tilauksesta; varmista projektin plan ennen kuin eventtejä käytetään julkaisumittarina.

## Domain

Tavoite on `https://asuntosijoituslaskuri.fi`, ja `www` ohjataan siihen.

1. Lisää Vercelin projektin Domains-näkymään apex ja `www`.
2. Kopioi täsmälleen projektin näyttämät DNS-tietueet nykyiselle DNS-palveluntarjoajalle. Älä käytä yleisohjeesta arvattuja arvoja.
3. Säilytä sähköpostin MX-, SPF-, DKIM- ja DMARC-tietueet muuttumattomina.
4. Aseta apex primary-domainiksi ja `www` pysyväksi ohjaukseksi apex-osoitteeseen.
5. Odota, että Vercel näyttää DNS:n validina ja TLS-varmenteen aktiivisena.
6. Testaa molemmat hostit, HTTPS, redirect, `/robots.txt`, `/sitemap.xml`, `/tietosuoja`, Etuovi-polku ja PDF.

DNS-muutoksia ei ole tehty tässä työssä.

## Varmistus ja palautus

GitHub on lähdekoodin ensisijainen varmistus. Suojaa `main` niin, että suora force-push ja haaran poisto estetään ja tarkistukset vaaditaan ennen yhdistämistä. Varmista asetukset GitHubin käyttöliittymästä; niitä ei voi päätellä paikallisesta checkoutista.

Säilytä ympäristömuuttujien nimet ja arvot organisaation salatussa salasanaholvissa. Älä tallenna arvoja repositorioon, dokumenttiin tai tavalliseen pilvitiedostoon. Kirjaa samalla omistaja, käyttötarkoitus, ympäristö ja kiertopäivä.

Palautus:

1. Luo uusi Vercel-projekti GitHub-repositorion viimeisimmästä julkaisutagista.
2. Palauta salaisuudet salasanaholvista oikeisiin Production/Preview-ympäristöihin.
3. Aktivoi Web Analytics ja muut vain hyväksytyt integraatiot.
4. Aja `npm ci`, `npm run check`, mobiili- ja smoke-testit.
5. Liitä domain Vercelin näyttämillä tietueilla ja tarkista TLS sekä redirect.
6. Tee tuotannon toimintatesti ennen liikenteen ohjaamista.

Tarvittaessa repositoryn salattu offline-arkisto voidaan säilyttää erillisessä varmistuspalvelussa. Git-tag ei itsessään ole varmuuskopio, joten myös etärepositorion käyttöoikeudet ja palautusavaimet on suojattava.

## Ennen julkaisua hyväksyttävät asiat

- rekisterinpitäjä, yhteydenottotapa, käsittelyn tarkoitukset ja oikeusperusteet
- Vercelin, Kajabin ja mahdollisen OpenAI-käsittelyn roolit, DPA:t, alikäsittelijät ja kansainväliset siirrot
- lokien, analytiikan ja Kajabi-tietojen säilytys- sekä poistokäytännöt
- Vercel Analyticsin oikeusperuste ja paikallisen lainsäädännön mukainen eväste-/suostumustarve; tekninen toteutus ei käytä laskurin omia seurantaevästeitä
- rekisteröidyn pyyntöjen vastaanotto-, henkilöllisyyden varmennus- ja toteutusmenettely
- Vercel Firewallin tai muun hajautetun rate limitin käyttöönotto ennen suurta liikennettä

Tekninen toteutus ei yksin takaa GDPR-vaatimusten täyttymistä.
