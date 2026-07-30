# Visuaalinen kuntoanalyysi

## Auditin tulos

Nykyisessä mallissa `apartment.condition` on myynti-ilmoituksesta tai käyttäjältä saatu yleinen tekstikenttä. Se ei sisällä kuvakohtaisia havaintoja, kattavuutta, varmuutta tai lähdehistoriaa. Taloyhtiön tekninen kunto muodostetaan erikseen korjaushistoriasta ja asiakirjoista. Sitä ei saa päätellä huoneiston valokuvista.

Myynti-ilmoituksen hankinta estää kuvat ja median, eikä sovellus klikkaa kuvagallerioita. Tätä suojausta ei muuteta. Uusi ominaisuus käsittelee vain käyttäjän itse valitsemia JPG-, JPEG-, PNG- ja WEBP-kuvia. Kuvia ei kirjoiteta levylle, tietokantaan tai istuntotallennukseen. Ne pidetään selaimen ja palvelinpyynnön muistissa käsittelyn ajan ja poistuvat valinnan tyhjentämisen, sivulta poistumisen tai pyynnön valmistumisen yhteydessä.

## Rajaus ja terminologia

Käyttöliittymän nimi on **Valokuvien perusteella arvioitu kunto** tai **Visuaalinen kuntoarvio**. Kyse ei ole kuntotarkastuksesta, teknisestä kuntoarviosta tai rakenteiden tutkimuksesta.

Huoneiston visuaalinen kunto, rakennuksen ulkopuolelta näkyvä visuaalinen kunto ja taloyhtiön asiakirjoihin perustuva tekninen kunto säilytetään erillisinä:

- `apartmentVisualCondition`: huoneiston sisätilojen ja huoneistoon kuuluvien näkyvien pintojen havainnot
- `buildingVisualCondition`: käyttäjän lisäämistä ulkokuvista tehdyt näkyvät havainnot
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

## Toteutussuunnitelma

1. Lisätään canonical-malli kuvien lähteille, huoneille, alueille, havainnoille, varmuudelle, kattavuudelle, kokonaisarviolle, korjauslaajuudelle ja kustannushaarukalle.
2. Lisätään deterministinen validointi ja aggregointi. Kuvapalvelu ehdottaa vain kuvakohtaisia havaintoja; sovellus laskee kokonaisarvion, kattavuuden, varmuuden, korjauslaajuuden ja rajatun pistevaikutuksen.
3. Lisätään palvelinreitti, joka hyväksyy vain käyttäjän lataamat kuvat. Toteutus ei hyväksy kuvan URL-osoitetta eikä hae ilmoituskuvia.
4. Lisätään käyttöliittymä kuvien valintaan, esikatseluun, analyysin etenemiseen, virheisiin, tulosten tarkistamiseen sekä havaintojen hyväksymiseen, muokkaamiseen, poistamiseen ja lisäämiseen.
5. Liitetään vahvistettu visuaalinen analyysi remonttivaraan, oikaistuun hankintahintaan, riskeihin ja vahvuuksiin. Vaikutus kokonaispisteeseen pidetään pienenä ja varmuusriippuvaisena.
6. Lisätään analyysi ladattavaan raporttidataan ja tulostettavaan näkymään ilman kuvatiedostoja tai pysyviä pikkukuvia.
7. Lisätään yksikkö-, integraatio-, käyttöliittymä- ja raporttiregressiotestit.

## Kuvan validointi ja säilytys

- sallitut muodot: JPG, JPEG, PNG ja WEBP
- enimmäismäärä: 20 kuvaa analyysiä kohden
- enimmäiskoko: 10 Mt per alkuperäinen kuva ja 40 Mt per pyyntö
- vähimmäistarkkuus: 320 × 240 pikseliä
- selain pienentää pitkän sivun enintään 1 600 pikseliin ja poistaa metatiedot uudelleenkoodauksella
- kuvadataa ei sisällytetä canonical-analyysiin, raporttiin tai `sessionStorage`-tallenteeseen
- palvelin käyttää `store: false` -asetusta kuvantulkintapyynnössä

## Turvallinen havaintokieli

Kuvista kuvataan vain näkyviä asioita. Havainto voi koskea esimerkiksi kulumaa, pintavauriota, halkeamaa, puuttuvaa viimeistelyä, vanhentunutta ilmettä tai puutteellista työnjälkeä. Henkilöitä ei tunnisteta eikä asukkaista tehdä päätelmiä.

Kosteutta tai piilevää vauriota ei diagnosoida. Sallittu muoto on esimerkiksi: “Kuvassa näkyy värimuutos, joka voi liittyä kosteuteen tai pintavaurioon. Syytä ei voida varmistaa kuvasta, joten kohta on tarkistettava paikan päällä.”

## Aggregointi

Kokonaisarvio perustuu käyttäjän hyväksymiin tai aktiivisiin kuvahavaintoihin, arvioitujen huoneiden osuuteen, kuvien laatuun sekä havaintojen vakavuuteen. `visualConditionScore`, `coverage` ja `overallConfidence` ovat erillisiä arvoja.

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

Käyttöliittymässä näytetään:

> Havainnot perustuvat myynti-ilmoituksen tai käyttäjän lisäämiin valokuviin. Kuvista ei voida arvioida rakenteiden sisäistä kuntoa, kosteutta tai piileviä vaurioita. Arvio ei korvaa kuntotarkastusta.

Raportissa näytetään:

> Havainnot perustuvat valokuviin eivätkä korvaa paikan päällä tehtävää tarkastusta tai ammattilaisen kuntotutkimusta. Kuvista ei voida arvioida rakenteiden sisäistä kuntoa tai piileviä vaurioita.

## Tunnetut rajoitukset

- Kalusteet, valaistus, kuvakulma, kuvanmuokkaus ja matala resoluutio voivat vääristää havaintoja.
- Kuvan ulkopuolelle jääviä tiloja ja pintoja ei arvioida.
- Rakenteiden sisäistä kuntoa, kosteutta, ilmanlaatua, toimivuutta tai piileviä vaurioita ei voida arvioida.
- Kustannushaarukka ei ole urakkatarjous eikä alueellinen markkinahinta-arvio.
- Kuvantulkintapalvelu edellyttää palvelinympäristössä `OPENAI_API_KEY`-avainta. Mallin voi vaihtaa `VISUAL_CONDITION_MODEL`-muuttujalla.
