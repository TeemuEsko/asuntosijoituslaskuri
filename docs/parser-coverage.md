# Parser coverage -rekisteri

Prioriteetti on nimetty label → rakenteinen HTML/JSON-LD → otsikko/yhteenveto → luotettava laskenta → `unknown`. Puuttuvaa arvoa ei korvata nollalla. Jokainen `ListingFinding` sisältää arvon, portaalin, alkuperäisen labelin, semanttisen poimintatavan, confidence-tason, lähdekatkelman ja hyväksyntätilan; käyttäjän muokkaus tallentuu canonical-kenttään.

| Canonical field | Etuovi-/Oikotie-labelit ja fallback | Confidence | Kysytään käyttäjältä | Testi |
|---|---|---|---|---|
| address/streetAddress | Osoite, käyntiosoite; JSON-LD | high | vain unknown | osoitefixture |
| listingTitle | otsikko; H1/JSON-LD | high | ei kriittinen | H1-fixture |
| city/postalCode/district | kunta, kaupunki, postinumero, alue | high/medium | vain unknown | suomalainen osoite |
| roomDescription | huoneet, huonejako; otsikkotulkinta | high/medium | vain unknown | 2h+k otsikko |
| areaSqm | pinta-ala, asuinpinta-ala; JSON-LD | high | vain unknown | m²-muodot |
| apartmentType/buildingType | asuntotyyppi, talotyyppi; otsikko | high/medium | vain unknown | kerros-/rivitalo |
| constructionYear | rakennusvuosi, valmistunut | high | vain unknown | vuosirajat |
| floor/floorCount | kerros, kerroksia | high | ei rivitalolle | 3/6 |
| condition | kunto, yleiskunto | high | vain unknown | enum-teksti |
| housingCompanyName | taloyhtiön nimi, Asunto Oy | high | vain unknown | osoitteen esto |
| apartmentCount | huoneistoja, asuntojen lukumäärä | high | analyysiä syventävä | kokonaisluku |
| landOwnership | oma/vuokra/valinnainen tontti | high | vain unknown | kolme tonttimuotoa |
| landRentAnnual | tontin vuosivuokra, maanvuokra | high | vain relevantti unknown | €/v |
| plotFeeMonthly | tonttivastike | high | vain relevantti unknown | €/kk |
| plotShareRedemptionPrice | tonttiosuuden lunastushinta | high | valinnaisella tontilla unknown | € |
| nextPlotShareRedemptionDate | seuraava lunastusajankohta | medium | valinnaisella tontilla unknown | päivämääräteksti |
| heatingType | lämmitys, lämmitysmuoto | high | vain unknown | kaukolämpö |
| energyClass | energialuokka | high | ei kriittinen | A–G |
| elevator/balcony/sauna/parking | suorat nimetyt kentät | high | vain soveltuva unknown | kyllä/ei-tekstit |
| salePrice/debtFreePrice | myynti-/velaton hinta; offers.price | high | vain unknown | hintakolmio |
| companyLoanShare | laina-/velkaosuus; ei yhtiön kokonaislainaa | high | vain unknown | väärän osuman esto |
| maintenanceFeeMonthly | hoitovastike | high | vain unknown | €/kk ja €/m² |
| financingFeeMonthly | rahoitus-/pääomavastikkeet, osat summataan | high | vain unknown | moniosainen vastike |
| totalHousingCharge | yhtiövastike yhteensä | high | ei korvaa osia | tuplalaskennan esto |
| water/parking/sauna/wasteFeeMonthly | nimetyt maksut | high | ei yleensä kriittinen | erittelyfixture |
| otherMonthlyFees | muut kuukausimaksut | medium | jos analyysille olennainen | ei tuplia |
| currentRentMonthly | nykyinen vuokra, vuokra | high/medium | vain unknown | €/kk |
| completedRenovations | tehtyjen remonttien osio | medium/high | asiakirjoilla syvennetään | status ja vuosi |
| futureRenovations | tulevat remontit | medium/high | asiakirjoilla syvennetään | planned/decided |
| maintenancePlanText | PTS, kunnossapitotarveselvitys | medium | jos dokumenttia ei ole | osiofixture |
| availability | vapautuminen, hallinnan luovutus | high | ei kriittinen | tekstiarvo |
| occupancyStatus | vuokrattu, vuokraustilanne | medium/high | vain unknown | vapaa/vuokrattu |
| articlesRedemptionClause | lunastuslauseke, lunastusoikeus | medium | tarkistetaan yhtiöjärjestyksestä | juridinen varoitus |
| usageRestrictions | käyttö- ja luovutusrajoitukset | medium | asiakirjasta tai käyttäjältä | tekstiarvo |

## Metadata ja kysymislogiikka

- `semanticSource` vastaa poimintatapaa (`named_field`, `structured_data`, `free_text`, `calculation`).
- `originalLabel`, `originalValue` ja `sourceExcerpt` säilyttävät lähteen.
- `confidence`, `confidenceScore` ja `confidenceReasons` kuvaavat varmuuden.
- Ristiriitainen löytö ei ole `autoAccepted`, eikä se ylikirjoita canonical-arvoa.
- Puuttuvien tietojen vaihe käyttää vain analyysin ydinkenttiä ja jättää soveltumattomat kentät, kuten rivitalon kerroksen, pois.

## Tunnetut rajat

- Juridisten ehtojen sisältöä ei tulkita automaattisesti lopulliseksi oikeudelliseksi johtopäätökseksi.
- PTS:n euromääräisiä kustannuksia ei arvata vapaasta tekstistä ilman huoneistokohtaista perustetta.
- Vuokrakysyntää, sijaintiriskiä ja jälleenmyytävyyttä ei päätellä ilmoitustekstistä ilman ulkoista markkinadataa; ne ovat käyttäjäoletuksia.
