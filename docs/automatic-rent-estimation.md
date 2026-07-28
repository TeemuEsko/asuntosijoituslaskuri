# Automaattinen markkinavuokra-arvio

## Tietolähde ja taulu

Arvio käyttää Tilastokeskuksen StatFin/PxWeb-rajapinnan taulua `15fa`: **Vuokraindeksi (2025=100) ja keskineliövuokrat, neljännesvuosittain**.

- API: `https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/asvu/15fa.px`
- Rahoitusmuoto: vapaarahoitteinen
- Mittari: asuntojen keskineliövuokra, euroa/m²/kk
- Lisämittari: keskineliövuokralaskennan havaintomäärä
- Ajankohta: taulun uusin saatavilla oleva vuosineljännes

Adapteri etsii muuttujat niiden merkityksen perusteella ja validoi taulun, rahoitusmuodon sekä mittarit ennen kyselyä. Muuttujakoodeja ei ole kopioitu käyttöliittymään. Jos rakenne muuttuu, adapteri ei palauta mahdollisesti väärää arvoa.

Taulu sisältää aritmeettisen keskineliövuokran. Sitä ei nimetä mediaaniksi. Suurten kaupunkien kokonaisvuokramediaanitaulu ei ole pinta-alasta laskettavan, alueellisesti kattavan neliövuokra-arvion kanssa sama mittari.

## Vuokran prioriteetti

`resolveEffectiveRent()` valitsee arvon seuraavasti:

1. käyttäjän vahvistama arvo
2. voimassa olevan vuokrasopimuksen vuokra
3. myynti-ilmoituksen nykyinen vuokra
4. hyväksytty StatFin-arvio
5. hyväksytty muu markkinadata
6. tuntematon

Käyttäjän arvo säilyttää edellisen automaattisen arvion vertailuna. Automaattisen arvion palautus valitsee uudelleen korkeimman prioriteetin automaattisen lähteen.

## Huoneluvun normalisointi

- `1h`, `1h + kk`, `1h + k`, yksiö → `ONE_ROOM`
- `2h`, `2h + kk`, `2h + k`, kaksio → `TWO_ROOMS`
- `3h` ja suuremmat, kolmio → `THREE_PLUS_ROOMS`

Keittiötä ei lasketa huoneeksi. Jos huonejakoa ei löydy, käytetään läpinäkyvää pinta-alafallbackia: alle 35 m² yksiö, alle 60 m² kaksio ja vähintään 60 m² kolmio+. Tällainen luokitus ei yksin nosta arvion luotettavuutta.

## Alueen normalisointi ja fallback

Kuntanimi normalisoidaan keskitetysti, mukaan lukien tavallisimmat kaksikieliset nimet kuten Vaasa/Vasa ja Helsinki/Helsingfors. Adapteri sovittaa normalisoidun nimen taulun kulloisiinkin aluekoodeihin.

Fallback-järjestys nykyisessä `15fa`-adapterissa:

1. kunta + huonelukuluokka
2. kunta + kaikki huoneluvut
3. maakunta + huonelukuluokka
4. maakunta + kaikki huoneluvut
5. tuntematon

Taulu ei sisällä valtakunnallista postinumerojakoa. Kaupunkia ei lainata toiselle kunnalle: esimerkiksi Laihialle käytetään tarvittaessa Pohjanmaan maakuntaa, ei Vaasan kuntalukua.

## Laskenta ja pyöristys

Tarkka arvio:

`exactEstimatedMonthlyRent = rentPerSquareMeter × areaSqm`

Laskenta käyttää asuinpinta-alaa. Tarkka arvo säilytetään metadatassa ja käyttöliittymän oletus pyöristetään lähimpään viiteen euroon. Korjauskertoimia saunasta, parvekkeesta, kunnosta tai mikrosijainnista ei käytetä.

## Luotettavuus

- korkea: käyttäjän vahvistama, vuokrasopimuksen tai selkeä ilmoituksen nykyinen vuokra
- kohtalainen: tuore kunta- ja huonelukuluokkakohtainen StatFin-arvo, jossa on vähintään 20 havaintoa
- matala: maakunta, kaikki huoneluvut, pieni havaintomäärä tai vanhentunut välimuistiarvo
- tuntematon: hyväksyttyä arvoa ei saatu

Matala arvio näytetään suuntaa-antavana ja varoituksella. Hyväksytyn vähimmäisluotettavuuden määrittää `MINIMUM_AUTOMATIC_RENT_CONFIDENCE`.

## Välimuisti ja virheet

Onnistunut arvio tallennetaan palvelinprosessin muistivälimuistiin 12 tunniksi sijainnin, huoneluokan ja pinta-alan yhdistelmälle. Rajapintavirhe ei kaada ilmoitushakua. Jos vanha arvo on saatavilla, se palautetaan vanhentuneeksi ja matalan luotettavuuden arvoksi; muuten vuokra jää tuntemattomaksi ilman `0 €/kk` -korvausarvoa.

## Esimerkkitilanteet

- Vuokrattu asunto: ilmoituksen vuokra on effective rent, StatFin-arvo näkyy vertailuna.
- Vapaa asunto suuressa kaupungissa: kunta- ja huonelukuluokkakohtainen StatFin-arvio käytetään automaattisesti.
- Pieni kunta: maakuntatason arvio näytetään suuntaa-antavana ja fallback kerrotaan.
- Käyttäjän override: käyttäjän arvo ohjaa kaikkia laskelmia, automaattinen arvo säilyy vertailuna.
- API-virhe: käytetään merkittyä vanhaa cache-arvoa tai jätetään vuokra tuntemattomaksi.

## Tunnetut rajoitteet

- Nykyinen 15fa-taulu ei tarjoa postinumeroaluekohtaista tietoa eikä mediaanineliövuokraa.
- Kuntien ja maakuntien keskitetty resolver kattaa aluksi taulun kaupungit ja erikseen määritetyt pienkuntien maakuntafallbackit; uusia kuntaliitoksia ja kaksikielisiä nimiä lisätään hallitusti.
- Tilasto on alueellinen vertailuarvo, ei kohteen auktoritatiivinen vuokranmääritys.
