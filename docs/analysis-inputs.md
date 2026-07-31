# Analyysin lähtötiedot

Analyysin muokattavat tiedot on ryhmitelty käyttäjän päätöksenteon mukaisesti. Jokainen kenttä näyttää lähteen, lyhyen kuvauksen, yksikön ja muokattavan tai laskennallisen arvon. Näyttöarvot muotoillaan suomalaisittain; laskennan canonical-arvoja ei pyöristetä esitystä varten.

## A. Hinta ja hankinta

| Kenttä | Merkitys ja käsittely |
|---|---|
| Velaton hinta | Kohteen hinta sisältäen mahdollisen huoneistokohtaisen yhtiölainaosuuden. |
| Myyntihinta | Myyjälle maksettava kauppahinta ilman huoneistokohtaista yhtiölainaosuutta. |
| Remonttivara | Huoneiston hankinnan yhteydessä tai lähiaikoina tarvittava kertaluonteinen varaus. Se ei sisällä taloyhtiön tulevia remontteja, rahoitusvastiketta, vuosittaista kunnossapitovarausta eikä kuukausikuluja. |
| Varainsiirtovero | Velattomasta hinnasta laskettava vero-oletus. |
| Muut kaupantekokulut | Esimerkiksi pankin lainan järjestely- tai nostopalkkio, omistuksen rekisteröinti ja muut kertaluonteiset ostokulut. Varainsiirtovero ja remonttivara eivät kuulu tähän kenttään. |
| Oikaistu hankintahinta | Velaton hinta + remonttivara + varainsiirtovero + muut kaupantekokulut. |

Kuukausittaista remonttivaraa ei ole. Kertaluonteinen remonttivara kasvattaa oikaistua hankintahintaa ja rahoitustarvetta sekä vaikuttaa tarjoushintasimulaatioon, mutta sitä ei vähennetä kuukausikassavirrasta.

## B. Kuukausitulot ja -kulut

| Kenttä | Merkitys ja käsittely |
|---|---|
| Kuukausivuokra | Varsinainen kuukausivuokra ilman erillisiä käyttökorvauksia. Lähde voi olla vuokrasopimus, myynti-ilmoitus, Tilastokeskus tai käyttäjä. |
| Hoitovastike | Taloyhtiön kuukausittainen hoitovastike ilman rahoitusvastiketta. |
| Rahoitusvastike | Huoneistokohtaiseen yhtiölainaan liittyvä kuukausittainen vastike. Tunnettu 0 euron yhtiölainaosuus tuottaa päätellyn arvon 0 €/kk. Aidosti puuttuva arvo näytetään muodossa “Ei tiedossa”. |
| Muut kuukausikulut | Vuokranantajan vastuulle jäävät jatkuvat kulut vastikkeiden lisäksi. |
| Arvioitu tyhjäkäynti | Arvio ilman vuokralaista olevista kuukausista vuodessa, välillä 0–12. |

## C. Pankkirahoitus

Pankkilainan määrä lasketaan kaavalla:

`max(0, myyntihinta + remonttivara + varainsiirtovero + muut kaupantekokulut − sijoitettu oma pääoma)`

Arvioitu vakuusarvo on pankin kohteelle hyväksymä vakuusarvo, ei markkinahinta. Se näytetään yhdellä desimaalilla, mutta canonical-arvo säilyy pyöristämättömänä.

### Lyhennystavat

| Tyyppi | Ensimmäinen kuukausierä ja pääoman käsittely |
|---|---|
| Annuiteetti (`annuity`) | `P × r / (1 − (1+r)^−n)`. Laina-aika pysyy samana ja maksuerä muuttuu koron muuttuessa. |
| Kiinteä tasaerä (`fixed_payment`) | Lähtökorolla sama maksueräkaava kuin annuiteetissa. Sopimusmallissa maksuerä pysyy samana ja korkomuutos muuttaa laina-aikaa. |
| Tasalyhennys (`equal_principal`) | Lyhennys `P / n`; kuukausierä on lyhennys + jäljellä olevan pääoman korko. |
| Vain korko (`interest_only`) | Kuukausierä on `P × r`; kuukausilyhennys on 0 ja koko pääoma on jäljellä jakson lopussa. |
| Kertalyhennys / bullet (`bullet`) | Jakson aikana maksetaan tässä mallissa korko. Kuukausilyhennys on 0 ja pääoma erääntyy kokonaan laina-ajan lopussa. |

Kaavoissa `P` on pankkilainan määrä, `r` kuukausikorko ja `n` maksuerien määrä. Nollakorolla annuiteetin ja kiinteän tasaerän maksuerä on `P / n`.

## D. Markkina-arviot

Vuokrakysyntä, sijaintiriski ja jälleenmyytävyys saavat automaattisen esivalinnan. Arvio näyttää lähteen, tärkeimmät perusteet ja luotettavuuden. Käyttäjä voi vaihtaa 1–5-valinnan ja palauttaa automaattisen arvion.

## Lähdebadget

- Myynti-ilmoitus
- Tilastokeskus
- Automaattinen arvio
- Käyttäjän tieto
- Oletus
- Päätelty
- Asiakirja
- Ei tiedossa

Oletusarvoa, parseriarvoa, tilastotietoa tai pääteltyä arvoa ei merkitä käyttäjän tiedoksi.
