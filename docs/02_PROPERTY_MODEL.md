# Unified Property Model

## Kentän yhteinen rakenne

Jokainen olennainen tieto mallinnetaan arvona ja metadatana:

- `value`
- `status`: parser | user | missing | derived
- `source`
- `confidence`
- `updatedAt`
- `notes`

## Pääkategoriat

### Identity
- kohteen tunniste
- osoite
- ilmoituslinkki
- kohteen nimi

### Purchase
- velaton hinta
- myyntihinta
- yhtiölainaosuus
- varainsiirtovero
- remonttivara
- muut hankintakulut

### Apartment
- pinta-ala
- huoneluku
- kerros
- kunto
- rakennusvuosi
- rakennustyyppi
- lämmitysmuoto

### Housing Company
- huoneistojen määrä
- tontin omistus: oma | vuokrattu | valinnainen vuokratontti
- huoneistokohtaisen tonttiosuuden lunastustila: lunastettu | ei lunastettu | ei tiedossa
- tonttiosuuden lunastushinta
- seuraava mahdollinen tonttiosuuden lunastusajankohta
- yhtiöjärjestyksen lunastuslauseke: ei | kyllä | ei voitu tarkistaa
- lunastusoikeuden kuvaus
- hoitovastike
- rahoitusvastike
- talouden tila
- tehdyt korjaukset
- tulevat korjaukset
- omistuspohjan keskittyminen

### Rent
- nykyinen vuokra
- markkinavuokra
- käyttöaste
- vuokrakysyntä
- muut vuokratuotot

### Financing
- sijoitettu oma pääoma
- pankkilaina
- kokonaiskorko
- laina-aika
- lyhennystyyppi
- vakuusarvoprosentti

### Documents
- dokumenttityyppi
- tiedoston nimi
- lisäyspäivä
- parserin tila
- avatut tarkistukset

### Analysis
- laskelmat
- sääntötulokset
- puuttuvat tiedot
- analyysin kattavuus
- päätöskooste

## Hintojen riippuvuus

Velaton hinta = myyntihinta + yhtiölainaosuus

Jos yhtiölainaosuus on 0:

- laskennallinen rahoitusvastike on 0
- UI näyttää tilan `Ei yhtiölainaa`
- mahdollinen positiivinen raportoitu rahoitusvastike säilytetään alkuperäisenä lähdearvona ja liputetaan erilliseksi dataristiriidaksi

## Ristiriitaiset lähdetiedot

- aktiivista arvoa ei ylikirjoiteta automaattisesti ristiriitaisella havainnolla
- alkuperäinen ja uusi lähdearvo sekä niiden lähteet säilytetään
- ristiriita näytetään omana varoituksenaan
- käyttäjä ratkaisee ristiriidan tai korjaa arvon; laskenta ei arvaa oikeaa arvoa
