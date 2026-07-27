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
- tontin omistus
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

- rahoitusvastike pakotetaan laskennassa arvoon 0
- UI näyttää tilan `Ei yhtiölainaa`
- mahdollinen ristiriitainen rahoitusvastike liputetaan datavirheenä
