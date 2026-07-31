# Automaattisten markkina-arvioiden malli

Markkina-arviot ovat perusteltuja esiarvioita, eivät faktoja. Keskitetyt resolverit ovat `resolveRentalDemand`, `resolveLocationRisk` ja `resolveResaleLiquidity`. Komponentit eivät kovakoodaa yksittäisten kaupunkien luokituksia.

## Canonical valinta

Jokainen arvio käyttää `EstimatedChoice<T>`-rakennetta:

- `automaticValue`: resolverin alkuperäinen 1–5-arvo
- `effectiveValue`: analyysissä käytettävä arvo
- `source`: `automatic`, `user` tai `unknown`
- `sourceName`: käyttäjälle näytettävä lähdekuvaus
- `confidence`: `high`, `medium`, `low` tai `unknown`
- `factors`: tunniste, otsikko, vaikutuksen suunta, kuvaus ja lähdeluokka
- `userOverridden`: onko käyttäjä vaihtanut arvon
- `generatedAt`: muodostusajankohta

Käyttäjän valinta muuttaa vain effective-arvon ja override-metadatan. Automatic-arvo ja perusteet säilyvät. “Palauta automaattinen arvio” palauttaa effective-arvon automatic-arvoon.

## Vuokrakysyntä

Nykyinen resolveri käyttää:

- parserin huonelukua ja pinta-alaa
- sijainnin tunnistusta
- jo haetun Tilastokeskuksen alueellisen vuokratiedon saatavuutta
- mahdollista virallista väestökehitystä
- vain erikseen sallittuna adaptaatiosignaalina vastaavien vuokrailmoitusten määrää ja arvioitua näkyvilläoloaikaa

Tilastollinen vuokrataso parantaa tietopohjaa mutta ei yksin todista kysynnän voimakkuutta. Ilman ajankohtaista ilmoitusdataa tämä puute kerrotaan perusteissa.

## Sijaintiriski

Resolveri tukee seuraavia virallisia aluesignaaleja:

- väestönmuutos ja nettomuutto
- työllisyys- ja työttömyysaste
- työpaikkaomavaraisuus
- työnantajakeskittymä
- urbanisaatioluokka

Nykyinen käyttöliittymä välittää resolverille parserin sijaintitiedot. Jos rikastettuja virallisia signaaleja ei ole, arvio pysyy neutraalina ja confidence on matala. Puuttuva työnantajadata ei aiheuta arvattua tulosta eikä estä analyysiä.

## Jälleenmyytävyys

Resolveri käyttää:

- toteutuneiden asuntokauppojen määrää ja kehitystä, kun hyväksytty tilastosignaali on saatavilla
- talotyyppiä, huonelukua, pinta-alaa ja rakennusvuotta
- hissiä, tontin omistusta ja taloyhtiön kokoa
- sallittua ilmoitusmäärää, näkyvilläoloaikaa ja taloyhtiön ilmoitushistoriaa vain tukisignaaleina

Toteutuneet kaupat painavat enemmän kuin ilmoitusmarkkina. Portaalin näkyvilläoloaikaa ei nimetä toteutuneeksi myyntiajaksi, eikä pyyntihintaa käsitellä toteutuneena kauppahintana.

## Luotettavuus ja pistevaikutus

Confidence muodostuu käyttökelpoisten, toisistaan erillisten signaalien määrästä ja siitä, onko ajankohtaista markkinasignaalia saatavilla:

- korkea: vähintään viisi signaalia ja ajankohtainen markkinasignaali
- kohtalainen: vähintään kolme signaalia
- matala: yksi tai kaksi signaalia
- tuntematon: ei käyttökelpoisia signaaleja

Automaattisen valinnan poikkeama neutraalista arvosta 3 vaikuttaa scoreen seuraavilla painoilla:

- korkea 100 %
- kohtalainen 75 %
- matala 45 %
- tuntematon 0 %

Käyttäjän valinta vaikuttaa 100-prosenttisesti mutta säilyy lähteeltään käyttäjän arviona. Sama painotus välitetään myös markkinamuuttujista muodostuviin riski- ja vahvuushavaintoihin.

## Portaalidata ja käyttöehdot

Tässä julkaisussa ei lisätä uutta scrapingia eikä tehdä verkkokutsuja markkina-arvioita varten. `PortalMarketSignals` on rajattu adaptaatioraja myöhempää käyttöehtojen mukaista, välimuistettua ja kutsumäärältään rajoitettua integraatiota varten. Signaali hyväksytään vain, kun `permitted` on tosi ja lähde dokumentoidaan.

Portaalidata kuvaa ilmoitusmarkkinaa. Taloyhtiösivujen ilmoitushistoria voidaan myöhemmin käyttää tukisignaalina, mutta sitä ei saa esittää toteutuneena kauppana.

## Tunnetut puutteet

- Väestö-, työllisyys- ja toteutuneiden kauppojen rikastus ei vielä tule erillisestä reaaliaikaisesta rajapinnasta.
- Työnantajien toimialajakaumaa ja keskustaetäisyyttä ei vielä rikasteta automaattisesti.
- Portaalisignaaleja ei käytetä ilman hyväksyttyä teknistä integraatiota.
- Arviot eivät korvaa paikallista markkinatuntemusta tai ammattilaisen hinta-arviota.
