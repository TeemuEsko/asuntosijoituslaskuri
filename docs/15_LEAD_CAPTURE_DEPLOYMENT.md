# Vanhan liididatan ylläpito

> Nykyinen julkinen laskuri ei käytä omaa opt-in-lomaketta eikä tarvitse tätä
> infrastruktuuria analyysin tai PDF-raportin avaamiseen. Vanha lomake sekä sen
> opt-in-, sessio-, funnel- ja peruutusrajapinnat on poistettu. Sähköpostiliidit
> kerätään vapaaehtoisen Kajabi-linkin kautta. Älä poista vanhaa tietokantaa tai
> sen tietoja ilman erillistä päätöstä ja dokumentoitua säilytys-/poistomenettelyä.

## Julkaisun estävät asetukset

Vanha liidi- ja CSV-infrastruktuuri käyttää pysyvää PostgreSQL-tietokantaa. Paikallinen testi voi käyttää paikallista PostgreSQL:ää; Vercelissä voidaan käyttää esimerkiksi projektin Marketplace-integraation kautta luotua PostgreSQL-palvelua. Julkinen maksuton analyysipolku ei kutsu näitä reittejä.

Vain vanhan liidi-infrastruktuurin ylläpidossa tarvittavat ympäristömuuttujat:

- `DATABASE_URL`: PostgreSQL-palvelun antama yhteysosoite. Älä käytä selaimelle näkyvää `NEXT_PUBLIC_`-muuttujaa.
- `LEAD_EXPORT_ADMIN_TOKEN`: erillinen vähintään 32 merkin satunnainen bearer-token CSV-vientiä varten.
- `PRIVACY_CONTROLLER_NAME`: todellinen rekisterinpitäjä.
- `PRIVACY_CONTACT`: rekisteröidyn pyyntöjen yhteydenottotapa.
- `PRIVACY_RETENTION_PERIOD`: omistajan hyväksymät säilytysajat ja poistokäytäntö.
- `PRIVACY_INTERNATIONAL_TRANSFERS`: todellinen kuvaus siirroista tai niiden puuttumisesta ja suojatoimista.

## Vercelin manuaaliset vaiheet

Julkista laskuria varten tarvitsee haluttaessa asettaa vain:

- `NEXT_PUBLIC_KAJABI_TRAINING_URL`: Kajabin koulutussivun URL. Jos arvo puuttuu, sovellus käyttää koodissa määriteltyä nykyistä oletuslinkkiä. Julkisen muuttujan muutos vaatii uuden buildin ja deploymentin.

Seuraavat vaiheet koskevat vain vanhan liididatan hallintaa:

1. Luo tai yhdistä PostgreSQL-tietokanta Vercel-projektiin.
2. Aseta yllä olevat muuttujat Production-, Preview- ja tarvittaessa Development-ympäristöihin. Käytä eri salaisuuksia ympäristöittäin.
3. Suorita kerran tietokantaa vasten `npm run db:migrate` niin, että `DATABASE_URL` on asetettu.
4. Täydennä ja juridisesti tarkista `/tietosuoja`-sivun tiedot, palvelutarkoituksen oikeusperusteet, palveluntarjoajat, säilytys ja kansainväliset siirrot.
5. Tarkista henkilötietojen käsittelysopimukset Vercelin, tietokantapalvelun ja Kajabin kanssa.
6. Ota käyttöön tuotantoympäristön lokien pääsynhallinta ja säilytysaika. Sovellus ei tarkoituksella lokita nimiä, sähköposteja tai ilmoitus-URL:eja.
7. Julkaise vasta smoke-testin jälkeen. DNS- tai domain-asetuksia tämä build ei muuta.

## Kajabi-CSV

CSV-reitti on `GET /api/admin/leads/export` ja se vaatii palvelinpuolella tarkistetun `Authorization: Bearer <LEAD_EXPORT_ADMIN_TOKEN>` -otsakkeen. Älä kirjoita tokenia selaimeen, URL:iin tai lähdekoodiin. Vienti sisältää vain voimassa olevan markkinointisuostumuksen antaneet henkilöt.

## Peruuttaminen ja poistaminen

Julkista liidisessiota tai peruutusrajapintaa ei enää ole. Ylläpitäjä käsittelee vahvistetun pyynnön palvelinympäristössä:

```powershell
npm run lead:admin -- revoke kayttaja@example.fi
npm run lead:admin -- delete kayttaja@example.fi
```

Sähköpostia ei pidä käyttää yksin pyytäjän henkilöllisyyden vahvistamiseen. Organisaation pitää määrittää pyyntöjen vastaanotto- ja varmennusmenettely ennen julkaisua.

## Nykyinen käyttöraja

Analyysi ja tulostus ovat tarkoituksella maksuttomia eivätkä vaadi palvelinsessiota. Uusia liidejä ei tallenneta sovelluksen omaan tietokantaan. Vanha PostgreSQL-data, suostumushistoria, suojattu ylläpitäjän CSV-vienti ja ylläpitokomento on säilytetty olemassa olevien tietojen hallintaa varten. Tietokannan säilytysajat, vanhan liididatan käsittely ja mahdollinen myöhempi poistaminen vaativat erillisen omistajapäätöksen.
