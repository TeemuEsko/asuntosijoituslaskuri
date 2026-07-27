# Myynti-ilmoituksen tietojen haku V1

## Syötteet

- Etuovi-linkki (`etuovi.com` ja sen aliverkkotunnukset)
- Oikotie-linkki (`oikotie.fi` ja sen aliverkkotunnukset)
- käyttäjän liittämä myynti-ilmoituksen teksti

URL-haku tehdään palvelimella. Vain HTTP- ja HTTPS-osoitteet sallitaan, kohdeverkkotunnukset tarkistetaan ja uudelleenohjaukset hylätään. Vastauskoko on rajattu kahteen megatavuun ja hakuaika kymmeneen sekuntiin.

## Tuetut kentät

- myyntihinta, velaton hinta ja huoneistokohtainen yhtiölainaosuus
- hoito-, rahoitus- ja tonttivastike
- pinta-ala, huoneistotyyppi, rakennusvuosi, kerros ja kunto
- taloyhtiön nimi ja huoneistojen lukumäärä
- tontin omistusmuoto
- rajatut remonttihavainnot: putket, viemärit, sähköjärjestelmät, kylpyhuoneet, julkisivu, parvekkeet, elementtisaumat ja katto

Synonyymit ovat keskitetysti tiedostossa `src/core/parser/synonyms.ts`. Arvojen normalisointi on tiedostossa `src/core/parser/normalization.ts`.

## Luottamus ja hyväksyntä

Jokainen löydös sisältää lähteen, lähdekatkelman, alkuperäisen arvon, normalisoidun arvon, varmuustason ja ristiriidat. Käyttäjän on hyväksyttävä, korjattava tai jätettävä käyttämättä jokainen kenttälöydös ennen kohteen luomista.

Useat rahoitusvastikkeet säilytetään eriteltyinä ja niistä muodostetaan näkyvä yhteissumma. Muut ristiriitaiset arvot säilytetään rinnakkain, eikä lopullista arvoa valita automaattisesti.

## Tunnetut rajoitteet

- Etuovi tai Oikotie voi estää automatisoidun haun tai toimittaa tiedot vain selaimessa suoritettavalla JavaScriptillä. Tällöin käyttäjää pyydetään liittämään ilmoitusteksti.
- V1 ei pura kuvia, PDF-liitteitä eikä kirjautumisen takana olevia ilmoituksia.
- Vapaamuotoisten remonttikuvausten varmuus on matala. Putkiremonttia tai katon pinnoitusta ei tulkita automaattisesti täydelliseksi uusimiseksi.
- HTML-poiminta perustuu näkyvään tekstisisältöön eikä sivustokohtaiseen yksityiseen rajapintaan.
