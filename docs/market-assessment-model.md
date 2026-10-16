# Markkina-arvioiden tietopohja ja rajaukset

Markkina-arviot ovat käyttäjän muokattavia 1–5-arvoja. Sovellus ei muodosta automaattista luokitusta kohteen koosta, kunnan nimestä tai yksittäisestä epäsuorasta tilastosignaalista.

## Canonical valinta

`EstimatedChoice<T>` säilyttää oletuksen, effective-arvon, lähteen, evidenssin ja käyttäjän override-tilan. Lähde on yksi seuraavista:

- `default`: neutraali 3/5-oletus; ei dataperusteista confidence-arvoa eikä pistepainoa
- `automatic`: varattu myöhemmälle validoidulle luokittelumallille
- `user`: käyttäjän nimenomainen 1–5-valinta
- `unknown`: arvoa ei ole

Käyttäjän valinta muuttaa vain effective-arvon ja lähteen. Tilastohaku ei ylikirjoita käyttäjän valintaa. Palautus palauttaa 3/5-oletuksen.

## Käytössä olevat avoimet lähteet

Kaikki alla olevat StatFin-aineistot ovat Tilastokeskuksen avointa dataa lisenssillä CC BY 4.0. Haku tehdään palvelimella viiden sekunnin aikakatkaisulla ja 24 tunnin prosessikohtaisella välimuistilla. Yhden taulun virhe ei estä muiden tietojen tai analyysin käyttöä.

| Arvio | Taulu | Muuttuja | Tarkkuus | Käyttö |
|---|---|---|---|---|
| Vuokrakysyntä | `15fa`, Vuokraindeksi ja keskineliövuokrat neljännesvuosittain | vapaarahoitteinen keskineliövuokra ja havaintomäärä | julkaistu postinumero, kunta tai alue | Näytetään kontekstina. Vuokratasoa ei tulkita kysynnäksi. |
| Sijaintiriski | `11ra`, Tunnuslukuja väestöstä | Väkiluvun muutos, % | kunta | Näytetään kuntatason kontekstina. Yksi väestösignaali ei tuota riskiluokitusta. |
| Jälleenmyytävyys | `13mx`, Vanhojen osakeasuntojen hinnat ja kauppamäärät kunnittain | Kauppojen lukumäärä vuodesta 2020 alkaen | kunta ja talotyyppiluokka | Näytetään likviditeetin taustatietona. Absoluuttista kauppamäärää ei pisteytetä ilman vertailukelpoista markkinakokoa. |

Taulujen metatiedosta valitaan aina viimeisin julkaistu havaintojakso. Käyttöliittymässä ja PDF:ssä näytetään lähde, taulun nimi ja tunniste, alueellinen tarkkuus, havaintojakso sekä lisenssi. Tilastokeskusta ei näytetä lähteenä, jos kyseinen haku ei palauttanut käyttökelpoista arvoa.

## Miksi tulos on yleensä 3/5

Nykyiset avoimet aineistot eivät yksin riitä puolustettavaan kohdetason 1–5-luokitukseen:

- vuokrataso ei kerro vajaakäyttöä tai vuokrausaikaa
- kuntatason väestömuutos ei kuvaa kaupunginosaa tai yksittäistä taloyhtiötä
- absoluuttinen kauppamäärä riippuu kunnan ja asuntokannan koosta
- avointa, toteutuneisiin kauppoihin yhdistettyä myyntiaika-aineistoa ei ole käytössä

Siksi kaikki kolme arviota käyttävät oletuksena 3/5 ja badgea **Oletus**. Confidencea ei näytetä dataperusteisena, eikä oletus lisää markkina-arvioiden painoa sijoituspisteisiin.

## Aiemman mallin auditointi

Aiempi resolveri käytti muun muassa kohteen pinta-alaa, huonelukua, tonttia ja rakennuksen ominaisuuksia sekä kovakoodattuja väestö-, työllisyys-, kauppamäärä- ja ilmoitusaikarajoja. Tuotantopolku ei kuitenkaan syöttänyt resolverille virallisia väestö-, työllisyys- tai kauppamäärätietoja. Kohdetiedoista johdettu tulos merkittiin silti automaattiseksi arvioksi. Malli poistettiin, koska rajojen kalibrointia tai soveltuvuutta ei ollut dokumentoitu.

## Pisteytys ja sijaintiriskin suunta

Neutraali oletus saa painon nolla. Käyttäjän valinta saa painon yksi. Sijaintiriskin asteikko säilyy päinvastaisena muihin arvioihin nähden: 1 tarkoittaa pientä ja 5 suurta riskiä. Nykyinen scoring engine käsittelee suuremman sijaintiriskin negatiivisena.

## Pois jätetyt lähteet

- Etuoven ja Oikotien ilmoitusmääriä tai näkyvilläoloaikoja ei scrapata eikä esitetä toteutuneena myynti- tai vuokrausaikana.
- Maanmittauslaitoksen kiinteistökauppadata ei vastaa sellaisenaan asunto-osakkeiden kohdetason myyntiaikaa.
- Maksullisia välittäjä- tai markkinadatapalveluja ei lisätty.
- Kuntien vaihtelevia avoimia aineistoja ei yhdistetty ilman valtakunnallisesti yhtenäistä muuttuja- ja alueluokitusta.

## Tarkemman mallin tietotarve

Vuokrakysynnän luokittelu vaatisi riittävän tarkan alueen vajaakäytön, toteutuneet vuokrausajat, tarjonnan ja usean ajanjakson kysyntähavainnot. Jälleenmyytävyyden luokittelu vaatisi toteutuneet myyntiajat, markkinakokoon suhteutetut kauppamäärät ja vertailukelpoiset kohdeluokat. Ennen automaattista 1–5-luokitusta rajat pitää kalibroida dokumentoidulla aineistolla ja validoida erillisellä testiaineistolla.
