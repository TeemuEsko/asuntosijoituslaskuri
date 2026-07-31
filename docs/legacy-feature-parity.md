# Legacy feature parity -rekisteri

Auditointipäivä: 2026-07-28. Legacy-lähde on Git-commit `8ace2a6`, ensisijaisesti `app/page.js`. Nykyinen toteutus on `src/core/**` ja `src/components/property/**`. `REPLACED` tarkoittaa tässä samaa käyttäjätarvetta vähintään samalla tietosisällöllä, ei vanhan käyttöliittymän kopiointia.

## Yhteenveto

| Status | Määrä |
|---|---:|
| COMPLETE | 28 |
| PARTIAL | 4 |
| MISSING | 2 |
| BROKEN | 0 |
| REPLACED | 7 |
| NOT_APPLICABLE | 2 |
| **Yhteensä** | **43** |

## Ominaisuusrekisteri

| Ominaisuus | Käyttäjähyöty | Legacy-lähde | Nykytila / status | Siirtotarve ja tavoitearkkitehtuuri | Testivaatimus |
|---|---|---|---|---|---|
| Velaton/myyntihinta/yhtiölaina | Hintojen yhteys säilyy | `normalizedData`, `analyzeCore` | COMPLETE | `purchase-price.ts` | kolmen kentän reaktiot |
| Bruttovuokratuotto | Hintatason vertailu | `analyzeCore` | COMPLETE | `investment-analysis.ts` | tyhjäkäynti ja rajat |
| Nettovuokratuotto | Kulujen jälkeinen tuotto | `analyzeCore` | COMPLETE | keskitetty laskenta | null ja kulut |
| Kassavirta ennen pankkilainaa | Operatiivinen kannattavuus | johdettavissa `analyzeCore` | COMPLETE | keskitetty laskenta | €/kk ja €/v |
| Kassavirta pankkilainan jälkeen | Todellinen kuukausipuskuri | `cashflow` | COMPLETE | ensisijainen analyysiluku | puuttuva laina unknown |
| Annuiteetti | Lainan kuukausierä | `monthlyLoanPayment` | COMPLETE | `calculateBankLoanPayment` | nolla- ja korkotapaus |
| Tasalyhennys | Ensimmäinen maksuerä | `monthlyLoanPayment` | COMPLETE | sama | korko/lyhennys erikseen |
| Vain korko | Lyhennysvapaan vaikutus | `monthlyLoanPayment` | COMPLETE | sama | pääoma 0 |
| Bullet | Kertalyhenteinen rahoitus | legacy käsitteli vain korkoa | REPLACED | eksplisiittinen tyyppi | maksuerä ja pääoma |
| Korko- ja lyhennysosuus | Velan kehitys | `estimatePrincipalReduction` | COMPLETE | analyysitulos | kuukausi/vuosi |
| Yhtiölainan arvioitu lyhennys | Oman pääoman kasvu | `estimateHousingCompanyLoanPrincipalReduction` | PARTIAL | vaatii yhtiölainan korko- ja laina-aikatiedot; nyt vain eksplisiittinen annual input | unknown ilman tietoa |
| Oikaistu hankintahinta | Remonttien ja verojen vaikutus | `adjustedDebtFreePrice` | REPLACED | sisältää veron ja kaupantekokulut | sisältötesti |
| Varainsiirtovero | Todellinen pääomatarve | ei erillistä kenttää | COMPLETE | `transferTaxRate` | prosentti ja null |
| Kaupantekokulut | Todellinen pääomatarve | ei erillistä kenttää | COMPLETE | canonical oletus | euromäärä |
| Todellinen oma pääoma | Rahoitustarve | `requiredOwnCashOrExtraCollateral` | COMPLETE | `actualEquityRequired` | laina ja kulut |
| Vakuusarvo | Pankkirahoituksen arvio | `collateralValue` | COMPLETE | canonical oletus | euroarvo |
| Vakuusvaje | Lisävakuuden tarve | `requiredOwnCashOrExtraCollateral` | COMPLETE | `collateralShortfall` | positiivinen erotus |
| Velkavipu | Rahoitusriski | `leverageRatio` | COMPLETE | pankki- ja yhtiölaina/oikaistu hinta | raja 80 % |
| Cash-on-cash | Oman rahan kassatuotto | ei nimetty | COMPLETE | analyysimoottori | vuotuinen kassavirta/equity |
| Oman pääoman tuotto | Kassavirta ja lyhennys | pääoman lyhennykset erillisinä | COMPLETE | `returnOnEquity` | lyhennys mukana |
| Tyhjäkäynti | Realistinen vuokratulo | ei legacyssä | REPLACED | kuukausipohjainen occupancy | 0–12 kk |
| Kuukausittainen remonttivara | Poistettu epäselvänä kaksoiskäsitteenä | remonttivara oli kertaluonteinen | NOT_APPLICABLE | ei kuulu canonical laskentaan; kertaluonteinen remonttivara säilyy | ei renderöidy eikä vaikuta kassavirtaan |
| Kertaluonteinen remonttivara | Oikaistu hankintahinta | `estimateRenovationReserve` | COMPLETE | kauppatiedon oletus | hankintahinta |
| Teknisten remonttien kustannusarvio | Putket, katto ym. | `renovationCostMidpoints` | PARTIAL | nykyinen moottori luokittelee riskin; euromääräinen rakennusosakatalogi vaatii hyväksytyt kustannuslähteet | ei arvata puuttuvaa hintaa |
| Rakennustyyppipoikkeukset | Ei kerrostalologiikkaa rivitalolle | `isLowRise` | COMPLETE | `repair-history.ts` | rivitalofixture |
| Korjaushistorian kattavuus | Vältä perusteettomat riskit | legacy statusvalinnat | REPLACED | dokumenttipohjainen RE-005 | kattava/puutteellinen aineisto |
| Tarjoushinta kassavirtatavoitteella | Neuvotteluraja | `findOfferForTargets` | COMPLETE | `offer-price.ts` 500 € askel | reaktiivinen tulos |
| Tarjoushinta nettotuottotavoitteella | Tuottovaatimuksen hinta | sama | COMPLETE | sama | 6 % tavoite |
| Tarjoushinta CoC-tavoitteella | Oman rahan tuottoraja | ei legacyssä | REPLACED | sama simulaattori | tavoiteraja |
| Kassavirtariski | Negatiivinen tulos näkyy | `buildRiskProfile` | COMPLETE | keskitetty observation engine | severity high |
| Matala nettotuotto | Heikko tuotto näkyy | `buildRiskProfile` | COMPLETE | keskitetty observation engine | 4,5 % raja |
| Korkea velkavipu | Rahoitusriski | `financeScore` | COMPLETE | keskitetty observation engine | >80 % |
| Korkoherkkyys | Korkoriski | `financeScore` | COMPLETE | keskitetty observation engine | >=6 % |
| Vuokrakysyntä | Tyhjäkäyntiriski | `locationDemand` | COMPLETE | käyttäjäoletus, ei parseriarvaus | asteikko 1–5 |
| Sijaintiriski | Alueen riski | `locationRisk` | COMPLETE | käyttäjäoletus ja exit-komponentti | asteikko 1–5 |
| Jälleenmyytävyys | Exit-likviditeetti | `liquidity` | COMPLETE | käyttäjäoletus ja exit-komponentti | asteikko 1–5 |
| Tontin uusimisriski | Vuokrankorotusriski | `yearsToLandLeaseRenewal` | PARTIAL | canonical tonttipäivä on olemassa; sääntö vaatii sopimus-/päättymispäivän UI-kytkennän | <=5 v |
| Lämmitysmuodon riskit | Käyttökulu- ja exit-riski | `heatingScoreAdjustment` | PARTIAL | parseri löytää arvon; pistevaikutus odottaa hyväksyttyjä rajoja | sähkö/öljy fixture |
| Tulostettava analyysiraportti | Päätösaineisto | `downloadPdfReport` | REPLACED | tulostus/PDF käyttää current canonical statea | report snapshot |
| Rahoitushakemus-PDF | Pankkikeskustelu | `downloadFinanceApplicationPdf` | MISSING | jatkotehtävä P1: erillinen PDF-template ja lakitekstien hyväksyntä; raakadata on ladattavissa | ajantasainen rahoitusdata |
| Varsinainen palvelin-PDF | Vakioitu tiedosto | legacy selain-PDF | MISSING | jatkotehtävä P2: palvelinrenderöinti ja fontti-/sivutustestaus; selaimen Tulosta PDF toimii nyt | renderöinti- ja snapshot-testit |
| Parserin URL-haku | Vähemmän käsinsyöttöä | legacy `parse-listing` | REPLACED | nykyinen acquisition + parser + confidence on kattavampi | Etuovi/Oikotie |
| PropertyOS-nimi UI:ssa | Sisäinen moottori | legacy ei käytä | NOT_APPLICABLE | käyttäjäbrändi on asuntosijoituslaskuri.fi | lokalisointitesti |

## Hylätyt legacy-säännöt

- Nollaa ei käytetä puuttuvan tiedon yleisenä fallbackina. Legacy `asNumber(..., 0)` peitti puuttuvan datan.
- Rakennusvuosi ei yksin ole riski tai vahvuus; tarvitaan rakenne- tai korjauskonteksti.
- “Vuokra kattaa vastikkeet” ei ole vahvuus. Vahvuus edellyttää kaikkien kulujen ja pankkilainan jälkeistä kassavirtaa.
- Lämmitysmuodon kiinteitä pistebonuksia ei siirretty ilman validoitua kustannus- ja markkina-aineistoa.
- Yhtiölainan lyhennystä ei arvioida oletuskorolla, jos todellisia lainaehtoja ei ole.

## Perustellut jatkotehtävät

1. **P1:** rahoitushakemuksen vakioitu PDF-template ja hyväksytyt juridiset tekstit.
2. **P2:** palvelinrenderöity PDF ja visuaaliset sivutustestit.
3. **P2:** rakennusosakohtainen kustannuskatalogi hyväksytyistä, ajantasaisista lähteistä.
4. **P2:** tontin sopimuspäättymisen ja indeksiehdon canonical-kentät sekä sääntö.
