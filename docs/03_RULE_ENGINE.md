# Rule Engine

## Säännön rakenne

Jokaisella säännöllä on:

- Rule ID
- nimi
- kategoria
- tarvittavat syötteet
- tarvittavat dokumentit
- ehto
- tulostila
- vakavuus
- käyttäjälle näytettävä viesti
- evidenssi
- poikkeukset
- versio

## Tulostilat

- `not_detected`
- `detected`
- `unchecked`
- `not_applicable`
- `data_conflict`

## Vakavuus

- info
- low
- medium
- high
- critical

## V1:n sääntöalueet

### Rakennus
- ikä ja tekemättömät peruskorjaukset
- viemärit
- käyttövesiputket
- lämpöputket
- asbesti
- valesokkeli
- tasakatto
- rakennustyyppi
- lämmitysmuoto

### Taloyhtiö
- pieni yhtiö
- taloudellinen tila
- vuokratalotausta
- tontti
- yhtiöjärjestyksen lunastuslauseke ja juridinen tarkistustarve
- omistuspohjan keskittyminen
- kunnossapitotarveselvitys ja PTS

### Talous
- hintojen ristiriita
- yhtiölaina ja rahoitusvastike
- kassavirta
- nettotuotto
- korkoherkkyys
- remonttivara

### Vuokraus ja likviditeetti
- vuokrakysyntä
- käyttöaste
- markkinavuokran epävarmuus
- sijainti
- jälleenmyytävyys

## Omistuspohjan keskittyminen

Osakeluettelo ei ole oletusarvoisesti saatavilla oleva julkinen asiakirja.

Siksi sääntö:

- on `unchecked`, jos osakeluetteloa tai käyttäjän vahvistamaa tietoa ei ole
- aktivoituu, kun käyttäjä lisää osakeluettelon tai syöttää tiedon
- ei estä muuta analyysiä
