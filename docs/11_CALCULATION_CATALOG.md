# Laskentakatalogi — Foundation v2.1 RC

Katalogi on laskentamoottorin sopimus. Laskenta ei arvaa puuttuvaa arvoa nollaksi eikä muuta ristiriitaista lähdearvoa. Koneellisesti käytettävät samat määrittelyt ovat tiedostossa `src/core/calculations/purchase-price.ts`.

## Laskennallinen velaton hinta

- **Kaava:** myyntihinta + yhtiölainaosuus
- **Lähtötiedot:** myyntihinta (€), yhtiölainaosuus (€)
- **Sisältää:** myyntihinnan ja huoneistokohtaisen yhtiölainaosuuden
- **Ei sisällä:** varainsiirtoveroa, remonttivaraa eikä muita hankintakuluja
- **Yksikkö:** €
- **Pyöristys:** sentin tarkkuus, 2 desimaalia; hintojen täsmäytyksen toleranssi 1 €
- **Puuttuva tieto:** jos kumpi tahansa lähtötieto puuttuu, tulos on `null` eikä laskentaa esitetä valmiina

## Laskennallinen rahoitusvastike

- **Kaava:** jos yhtiölainaosuus = 0 €, tulos on 0 €/kk; muutoin raportoitu rahoitusvastike
- **Lähtötiedot:** yhtiölainaosuus (€), raportoitu rahoitusvastike (€/kk)
- **Sisältää:** raportoidun kuukausittaisen rahoitusvastikkeen, kun yhtiölainaa on
- **Ei sisällä:** hoitovastiketta, pankkilainan maksua eikä muita kuukausikuluja
- **Yksikkö:** €/kk
- **Pyöristys:** sentin tarkkuus, 2 desimaalia
- **Puuttuva tieto:** puuttuva yhtiölainaosuus tuottaa `null`; jos yhtiölainaa on mutta vastike puuttuu, tulos on `null`
- **Ristiriita:** yhtiölaina 0 € ja positiivinen raportoitu rahoitusvastike tuottaa laskennallisen arvon 0 €/kk sekä erillisen `company_loan_fee_conflict`-varoituksen. Raportoitu arvo säilytetään evidenssinä.

## Sijoitusanalyysin laskelmat

| Nimi | Kaava ja lähtötiedot | Sisältää / ei sisällä | Yksikkö ja pyöristys | Puuttuva tieto | Näyttö / pisteet |
|---|---|---|---|---|---|
| Toteutuva vuosivuokra | kuukausivuokra × (12 − tyhjäkäyntikuukaudet) | pitkäaikaisen vuokran; ei arvonnousua | €/v, senttitarkka moottorissa | unknown ilman vuokraa | tunnusluvut / epäsuora |
| Bruttovuokratuotto | toteutuva vuosivuokra / velaton hinta × 100 | tyhjäkäynnin; ei kuluja | %, UI 1 desimaali | unknown ilman hintaa/vuokraa | analyysi / kyllä |
| Nettovuokratuotto | (vuosivuokra − 12 × jatkuvat kulut) / velaton hinta × 100 | hoito- ja rahoitusvastikkeen sekä muut jatkuvat kulut; ei kertaluonteista remonttivaraa eikä pankkilainaa | %, UI 1 desimaali | unknown, jos jokin pakollinen kulu puuttuu | analyysi / kyllä |
| Kassavirta ennen pankkilainaa | (vuosivuokra − vuosittaiset jatkuvat kulut) / 12 | vastikkeet ja muut jatkuvat kulut; ei kertaluonteista remonttivaraa eikä pankkilainaa | €/kk, UI kokonais-euro | unknown ilman vuokraa tai kuluja | kassavirta / kyllä |
| Pankkilainan kuukausierä | annuiteetti-, kiinteä tasaerä-, tasalyhennys-, vain korko- tai bullet-kaava | pankkilainan koron ja sopimusmallin mukaisen lyhennyksen; ei yhtiölainavastiketta | €/kk, UI kokonais-euro | unknown ilman lainamäärää, korkoa, aikaa tai tyyppiä | rahoitus / kyllä |
| Pankkilainan korko-osuus | lainapääoma × vuosikorko / 12 | ensimmäisen kuukauden koron | €/kk | unknown ilman lainatietoja | rahoitus / epäsuora |
| Pankkilainan lyhennysosuus | kuukausierä − korko-osuus | ensimmäisen kuukauden lyhennyksen | €/kk | unknown ilman lainatietoja | rahoitus / kyllä |
| Kassavirta pankkilainan jälkeen | kassavirta ennen lainaa − kuukausierä | kaikki mallinnetut kuukausikulut ja pankkilainan | €/kk, UI kokonais-euro | **unknown**, puuttuvaa lainaa ei käsitellä nollana | pääanalyysi / kyllä |
| Vuosikassavirta | kuukausikassavirta × 12 | saman sisällön vuositasolla | €/v | unknown ilman kuukausikassavirtaa | tunnusluvut / ei erillistä |
| Varainsiirtovero | velaton hinta × veroprosentti / 100 | käyttäjän vero-oletuksen; ei kaupantekokuluja | € | unknown ilman hintaa tai veroprosenttia | hankintahinta / ei |
| Oikaistu hankintahinta | velaton hinta + remonttivara + varainsiirtovero + kaupantekokulut | kertaluonteiset hankintakulut; ei kuukausikuluja | € | unknown ilman velatonta hintaa | tunnusluvut / velkavipu |
| Todellinen oma pääoma | myyntihinta + hankintakulut − pankkilaina | käteiskauppahinnan ja kulut | € | unknown ilman myyntihintaa tai lainaa | rahoitus / tuottoluvut |
| Vakuusvaje | max(0, pankkilaina − vakuusarvo) | kohteen oman vakuuden vajauksen; ei ulkoisia lisävakuuksia | € | unknown ilman lainaa tai vakuusarvoa | rahoitus / kyllä |
| Velkavipu | (pankkilaina + yhtiölainaosuus) / oikaistu hankintahinta | molemmat velat | %, UI 1 desimaali | unknown ilman pankkilainaa tai hintaa | rahoitus / kyllä |
| Oman pääoman kassatuotto | vuosikassavirta / oma pääoma × 100 | kassavirran; ei arvonnousua tai lyhennyksiä | %, UI 1 desimaali | unknown ilman positiivista omaa pääomaa | tunnusluvut / ei erillistä |
| Oman pääoman tuotto | (vuosikassavirta + pankkilainan ja tunnettu yhtiölainan vuosilyhennys) / oma pääoma × 100 | kassavirran ja velan lyhenemisen; ei arvonnousua | %, UI 1 desimaali | unknown ilman lainan lyhennystä tai omaa pääomaa | analyysidata / ei erillistä |
| Arvioitu exit-hinta | velaton hinta × (1 + arvonnousu/100)^pitoaika | käyttäjän arvonnousuoletuksen; ei markkinaennustetta | € | unknown ilman aikaa ja arvonnousua | exit / kyllä myöhemmässä pisteytyksessä |
| Arvioitu exit-tulos | exit-hinta × (1 − myyntikulut/100) − lähtöhinta | myyntikulut; ei veroja eikä jäljellä olevien velkojen tarkkaa amortisaatiota | € | unknown ilman exit-hintaa | exit / ei vielä päämittarissa |
| Tarjoushinnan enimmäismäärä | 500 € skenaariot, korkein hinta joka täyttää kassavirta-, nettotuotto- ja/tai oman pääoman kassatuottotavoitteen | nykyisen canonical analyysitilan | € lähimpään 500 euroon alaspäin | Ei laskettavissa ilman velatonta hintaa tai jos tavoite ei täyty | tarjoushintasimulaattori / skenaarion pisteet päivittyvät |
