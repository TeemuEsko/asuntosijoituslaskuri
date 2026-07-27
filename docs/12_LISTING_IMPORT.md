# Myynti-ilmoituksen tietojen haku 0.3.1

## Käsittelyputki

1. Linkki hyväksytään vain Etuoven tai Oikotien HTTP(S)-osoitteena. Uudelleenohjaukset, liian suuri vastaus ja 10 sekunnin aikakatkaisu käsitellään erikseen.
2. HTML:stä poimitaan ensin JSON-LD-rakenteinen tieto sekä `dt/dd`- ja taulukkoparien nimetyt kentät.
3. Näkyvä teksti jaetaan otsikoiden perusteella osioihin, kuten hintatietoihin, vastikkeisiin, taloyhtiöön, tonttiin sekä tehtyihin ja tuleviin remontteihin.
4. Kenttänimet tunnistetaan keskitetystä synonyymirekisteristä. Arvot, suomalaiset luvut ja yksiköt normalisoidaan kenttäkohtaisesti.
5. Samaa asiaa tarkoittavat samat arvot yhdistetään. Eri arvot säilyvät rinnakkain ristiriitana; alkuperäisiä arvoja ei ylikirjoiteta.
6. Havainnoille lasketaan selitettävä varmuuspistemäärä lähteen, tarkan kenttäosuman, yksikön, osion, tukevien lähteiden, epäselvyyden ja ristiriitojen perusteella.
7. Varmat, ristiriidattomat tiedot hyväksytään valmiiksi. Muut tiedot jäävät käyttäjän tarkistettaviksi.

Lähdejärjestys ei ole kaikille kentille sama. Nimetty kenttä on yleensä vahvin lähde, JSON-LD seuraava ja tunnistetun osion sisältö sen jälkeen. Taloyhtiön nimessä yhtiöosion nimetty kenttä säilyttää täydellisen yhtiömuodon. Eri lähteiden ristiriita ohittaa lähdejärjestyksen: kumpaakaan arvoa ei valita automaattisesti.

## Duplikaatit ja ristiriidat

- Sama kenttä, normalisoitu arvo ja yksikkö yhdistetään yhdeksi löydökseksi, johon liitetään kaikki tukevat lähdekatkelmat.
- Taloyhtiön nimessä yhtiömuotoa (`Asunto Oy`, `As Oy`) ei käytetä identiteetin erottavana osana, mutta lähteessä esiintynyt täydellisin nimi näytetään käyttäjälle.
- Rahoitusvastikkeiden eri nimet säilyvät omina osinaan ja niistä muodostetaan perusteltu yhteissumma.
- Myyntihinnan, yhtiölainaosuuden ja velattoman hinnan laskennallinen ristiriita näytetään muuttamatta yhtäkään lähtöarvoa.
- Yhtiölainaosuuden 0 € ja positiivisen rahoitusvastikkeen yhdistelmä näytetään erillisenä ristiriitana.

## Remonttien väärien osumien esto

Pelkkä rakenneosan maininta ei muodosta remonttihavaintoa. Havainnolta vaaditaan remonttiosio tai toimenpidettä kuvaava ilmaus, kuten *uusittu*, *sukitettu*, *tehty* tai *suunnitteilla*. Näin esimerkiksi asunnon kuvauksessa mainittu kylpyhuone ei muutu tehdyksi kylpyhuoneremontiksi.

Käyttövesiputket, viemärit, viemärien sukitus, määrittelemätön putkiremontti ja täysi linjasaneeraus ovat eri käsitteitä. Myös kielteiset ja epävarmat ilmaukset säilyvät tiloina, esimerkiksi *ei tehty*, *tutkitaan* ja *ei tiedossa*.

## Käyttöliittymä ja diagnostiikka

Tarkistusnäkymä ryhmittelee tiedot varmoihin, tarkistettaviin, ristiriitaisiin ja puuttuviin olennaisiin tietoihin. Jokaisesta löydöksestä voi avata lähteen ja varmuuden perustelut. Kehitystilassa näkyvä diagnostiikka sisältää parseriversion, sivuston, tunnistetut osiot, ehdokasmäärät, hylkäyssyyt ja ristiriidat.

## Todellinen Etuovi- ja Oikotie-tuki

Tuki perustuu julkisesti palautettuun HTML:ään, JSON-LD:hen ja näkyvään tekstiin. Se ei käytä sivustojen yksityisiä rajapintoja. Jos sivusto estää palvelinhaun, vaatii JavaScript-suorituksen, poistaa ilmoituksen tai muuttaa HTML-rakennetta, käyttäjälle tarjotaan ilmoitustekstin liittämistä. Kirjautumisen takana olevia tietoja, kuvia tai ilmoituksen PDF-liitteitä ei tässä releasessa käsitellä.

## Laatumittaus

Automaattinen laatuaineisto sisältää 20 tilannetta: tavalliset Etuovi- ja Oikotie-ilmoitukset, laina- ja vastikevariantit, tonttimuodot, remonttien positiiviset ja negatiiviset tapaukset, duplikaatit, ristiriidat, puuttuvat tiedot sekä poistuneen ja estetyn sivun. Testi mittaa odotettujen kenttien puuttumisia, kiellettyjä remonttiosumia ja yhdistämisen lopputulosta.

Seuraava laatukierros kannattaa tehdä anonymisoiduilla oikeilla ilmoitusnäytteillä. Synteettinen aineisto suojaa tunnetuilta regressioilta, mutta sivustojen todelliset rakenne- ja sanamuotovariaatiot löytyvät luotettavimmin tuotantoa vastaavista näytteistä.
