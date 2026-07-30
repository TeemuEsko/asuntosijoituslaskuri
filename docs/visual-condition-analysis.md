# Visuaalinen kuntoanalyysi

## Auditin tulos

`apartment.condition` on myynti-ilmoituksesta tai käyttäjältä saatu yleinen tekstikenttä. Se ei sisällä kuvakohtaisia havaintoja, kattavuutta, varmuutta tai lähdehistoriaa. Taloyhtiön tekninen kunto muodostetaan erikseen korjaushistoriasta ja asiakirjoista. Sitä ei saa päätellä huoneiston valokuvista.

Aiempi kuvaominaisuus jäi käsinlataukseen, koska URL-hankinta palautti parserille vain tekstipohjaisen tuloksen ja hävitti alkuperäisen HTML:n ennen rikastusta. Selainhankinta esti kuvatiedostojen lataamisen, kuvagalleriaa ei avattu ja kuntopalvelu hyväksyi vain käyttäjän lähettämän `File`-olion. Uusi työnkulku käyttää jo palvelimella saatua staattista tai renderöityä HTML:ää kuvalähteiden poimintaan. Selain ei edelleenkään lataa kuvia hankintavaiheessa, vaan hyväksytyt kohdekuvat haetaan erillisessä rajatussa palvelinprosessissa.

Kuvia ei kirjoiteta levylle, tietokantaan tai istuntotallennukseen. Ilmoituskuvan URL on olemassa vain hetkellisessä palvelinpuolen kandidaattimallissa. Canonical-analyysiin tallennetaan kuvan järjestysnumero, lähde, analyysitulos, varmuus ja käsittelyaika, ei kuvatiedostoa eikä alkuperäistä URL-osoitetta.

## Rajaus ja terminologia

Käyttöliittymän nimi on **Valokuvien perusteella arvioitu kunto** tai **Visuaalinen kuntoarvio**. Kyse ei ole kuntotarkastuksesta, teknisestä kuntoarviosta tai rakenteiden tutkimuksesta.

Huoneiston visuaalinen kunto, rakennuksen ulkopuolelta näkyvä visuaalinen kunto ja taloyhtiön asiakirjoihin perustuva tekninen kunto säilytetään erillisinä:

- `apartmentVisualCondition`: huoneiston sisätilojen ja huoneistoon kuuluvien näkyvien pintojen havainnot
- `buildingVisualCondition`: ilmoituksen tai käyttäjän lisäämistä ulkokuvista tehdyt näkyvät havainnot
- `housingCompanyTechnicalCondition`: nykyinen korjaushistoriaan ja asiakirjoihin perustuva taloyhtiöriski

Valokuvahavainto ei koskaan muuta taloyhtiön korjaushistoriaa tai teknistä riskipistettä.

## Lähteet ja prioriteetti

Tietolähteiden prioriteetti on:

1. käyttäjän vahvistama tai muokkaama havainto
2. asiakirjasta saatu tieto
3. myynti-ilmoituksen teksti
4. kuvantulkinnan ehdotus
5. oletus

Kuvantulkinnan alkuperäinen ehdotus ja lähdehistoria säilytetään myös käyttäjän muokkauksen jälkeen. Ristiriitaisia lähtötietoja ei ylikirjoiteta automaattisesti.

Ilmoituksen kirjallinen kuntoluokitus ja vahvistettu visuaalinen arvio yhdistetään vertailuksi, ei uudeksi varmaksi faktaksi. Jos luokat tukevat toisiaan, käyttöliittymä kertoo luokituksen vaikuttavan uskottavalta. Jos ne poikkeavat toisistaan ja kuvien varmuus on riittävä, canonical-analyysiin tallennetaan tarkistettava ristiriita. Matalan varmuuden kuvista ei muodosteta ristiriitaväitettä.

Jokainen havainto sisältää kuvatunnisteen, varmuuden, luontiajan, `userConfirmed`- ja `userEdited`-liput sekä alkuperäisen ehdotuksen lähdehistoriassa. Hyväksytyn tai muokatun havainnon lähde on `user_confirmed`; käyttäjän itse lisäämän havainnon lähde on `user_observation`.

## Automaattinen URL-työnkulku

1. URL validoidaan Etuoven tai Oikotien tuetuksi julkiseksi ilmoitusosoitteeksi.
2. Hankinta palauttaa parserituloksen lisäksi HTML:n vain saman palvelinpyynnön sisäiseen käyttöön. Lähdedokumenttia ei lähetetä selaimelle.
3. Poiminta tunnistaa `img`-attribuutit, lazy-load-attribuutit, `srcset`- ja `picture`-lähteet, Open Graphin, JSON-LD:n, hydraatiotilan ja sisäisen JSON-datan.
4. Logot, välittäjäkuvat, kartat, pohjakuvat, energia-asiakirjat, mainokset, ikonit, pienet paikkamerkit ja muut kuin kohdekuvat suodatetaan. Pikkukuva- ja resoluutioversiot deduplikoidaan, ja paras resoluutio valitaan.
5. Enintään 20 edustavaa kuvaa haetaan hyväksytyiltä kuva-CDN-isänniltä ja analysoidaan palvelimella rajatulla rinnakkaisuudella.
6. Kuvista muodostetaan sama `VisualConditionAnalysis` kuin käyttäjän kuvista. Lähde on `listing_session`; käyttäjän myöhemmin lisäämät kuvat muuttavat lähteen muotoon `listing_and_user`.
7. URL-analyysi jatkuu normaalisti, vaikka yhtään kuvaa ei löydy, kuvien käyttö estyy tai kuvantulkinta epäonnistuu.

Käyttäjän kuvien reitti hyväksyy edelleen vain multipart-tiedoston, ei URL-osoitetta. Ilmoituskuvien haku on vain URL-tuonnin sisäinen palvelinfunktio, joten sovellus ei tarjoa avointa kuvavälityspalvelinta.

## Kuvan validointi ja säilytys

- sallitut muodot: JPG, JPEG, PNG ja WEBP
- enimmäismäärä: 20 kuvaa analyysiä kohden
- enimmäiskoko: 10 Mt per alkuperäinen kuva ja 40 Mt per pyyntö
- vähimmäistarkkuus: 320 × 240 pikseliä
- selain pienentää pitkän sivun enintään 1 600 pikseliin ja poistaa metatiedot uudelleenkoodauksella
- kuvadataa ei sisällytetä canonical-analyysiin, raporttiin tai `sessionStorage`-tallenteeseen
- palvelin käyttää `store: false` -asetusta kuvantulkintapyynnössä
- ilmoituskuvan jokainen uudelleenohjaus tarkistetaan uudelleen
- vain ennalta hyväksytyt portaalikohtaiset HTTPS-kuvaisännät sallitaan
- DNS-tulos ei saa osoittaa localhostiin, yksityisverkkoon, link-local-osoitteeseen tai muuhun estettyyn osoiteavaruuteen
- palvelin tarkistaa sisältötyypin, tavukoon, todelliset kuvamitat, aikakatkaisun ja uudelleenohjausten määrän
- hyväksytyt palvelinmuodot ovat JPEG, PNG ja WEBP

Ilmoituskuvien hallitut virhekoodit ovat `LISTING_IMAGES_NOT_FOUND`, `LISTING_IMAGE_ACCESS_DENIED`, `LISTING_IMAGE_FETCH_FAILED`, `UNSUPPORTED_IMAGE_FORMAT`, `IMAGE_TOO_LARGE`, `IMAGE_ANALYSIS_FAILED`, `NO_ANALYSABLE_LISTING_IMAGES` ja `IMAGE_ANALYSIS_TIMEOUT`.

## Turvallinen havaintokieli

Kuvista kuvataan vain näkyviä asioita. Havainto voi koskea esimerkiksi kulumaa, pintavauriota, halkeamaa, puuttuvaa viimeistelyä, vanhentunutta ilmettä tai puutteellista työnjälkeä. Henkilöitä ei tunnisteta eikä asukkaista tehdä päätelmiä.

Kosteutta tai piilevää vauriota ei diagnosoida. Sallittu muoto on esimerkiksi: “Kuvassa näkyy värimuutos, joka voi liittyä kosteuteen tai pintavaurioon. Syytä ei voida varmistaa kuvasta, joten kohta on tarkistettava paikan päällä.”

## Aggregointi

Kokonaisarvio perustuu aktiivisiin kuvahavaintoihin, arvioitujen huoneiden osuuteen, kuvien laatuun sekä havaintojen vakavuuteen. Automaattiset ilmoituskuvahavainnot merkitään `automatic`-tilaan ja huomioidaan ensimmäisessä sijoitusanalyysissä; käyttöliittymä kertoo tämän suoraan, ja käyttäjä voi korjata tai hylätä havainnot. Käyttäjän itse lisäämät kuvat pysyvät `pending`-tilassa, kunnes käyttäjä hyväksyy ne. `visualConditionScore`, `coverage` ja `overallConfidence` ovat erillisiä arvoja.

Alhainen kattavuus tai varmuus estää vahvan kokonaispäätelmän ja pistemuutoksen. Hyvä visuaalinen kunto voi pienentää remonttivarauksen tarvetta, mutta ei yksin tee kohteesta hyvää sijoitusta.

## Korjauslaajuus ja kustannushaarukka

Koska projektissa ei ole validoitua alueellista kustannustietokantaa, kustannusarvio on vain suuntaa-antava, leveä haarukka. Se perustuu huoneiston pinta-alaan, aktiivisten havaintojen laajuuteen ja vakavuuteen sekä arvioituihin tiloihin. Pelkkä tilan ikä tai vanha ilme ei automaattisesti lisää märkätiläremonttia.

Sisäiset oletushaarukat ovat:

- ei tarvetta: 0 €
- pieni: noin 40–90 €/m², vähintään 2 000 € ja enintään 8 000 €
- kohtalainen: noin 150–350 €/m², vähintään 8 000 € ja enintään 30 000 €
- suuri: noin 400–900 €/m², vähintään 20 000 € ja enintään 70 000 €
- erittäin laaja: noin 700–1 400 €/m², vähintään 40 000 € ja enintään 120 000 €

Arvion yhteydessä näytetään aina oletukset ja epävarmuus. Käyttäjän itse antama remonttivara voittaa kuvista johdetun ehdotuksen.

## Käyttöliittymän ja raportin vastuuvapautukset

Käyttöliittymän ensimmäinen virke määräytyy toteutuneen lähteen mukaan:

- ilmoitus: “Havainnot perustuvat myynti-ilmoituksen valokuviin.”
- käyttäjän kuvat: “Havainnot perustuvat käyttäjän lisäämiin valokuviin.”
- molemmat: “Havainnot perustuvat myynti-ilmoituksen ja käyttäjän lisäämiin valokuviin.”

Sen jälkeen näytetään aina:

> Kuvista ei voida arvioida rakenteiden sisäistä kuntoa, kosteutta tai piileviä vaurioita. Arvio ei korvaa kuntotarkastusta.

Raportissa näytetään:

> Havainnot perustuvat valokuviin eivätkä korvaa paikan päällä tehtävää tarkastusta tai ammattilaisen kuntotutkimusta. Kuvista ei voida arvioida rakenteiden sisäistä kuntoa tai piileviä vaurioita.

## Tunnetut rajoitukset

- Kalusteet, valaistus, kuvakulma, kuvanmuokkaus ja matala resoluutio voivat vääristää havaintoja.
- Kuvan ulkopuolelle jääviä tiloja ja pintoja ei arvioida.
- Rakenteiden sisäistä kuntoa, kosteutta, ilmanlaatua, toimivuutta tai piileviä vaurioita ei voida arvioida.
- Kustannushaarukka ei ole urakkatarjous eikä alueellinen markkinahinta-arvio.
- Kuvantulkintapalvelu edellyttää palvelinympäristössä `OPENAI_API_KEY`-avainta. Mallin voi vaihtaa `VISUAL_CONDITION_MODEL`-muuttujalla.
- Portaalien HTML-rakenne ja kuva-CDN-isännät voivat muuttua. Uusi CDN lisätään vain erikseen tarkistettuna `LISTING_IMAGE_HOSTS_ETUOVI`- tai `LISTING_IMAGE_HOSTS_OIKOTIE`-muuttujaan.
- Ilmoituskuvien automaattinen analyysi on URL-tuonnin rikastus, eikä sen epäonnistuminen estä talousanalyysin muodostamista.
