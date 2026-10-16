# Liidinkeräyksen käyttöönotto

## Julkaisun estävät asetukset

Toteutus käyttää pysyvää PostgreSQL-tietokantaa. Paikallinen testi voi käyttää paikallista PostgreSQL:ää; Vercelissä voidaan käyttää esimerkiksi projektin Marketplace-integraation kautta luotua PostgreSQL-palvelua. Tuotantoa ei saa julkaista ennen kuin tietokanta, migraatio, salaisuudet ja tietosuojatiedot on konfiguroitu.

Pakolliset ympäristömuuttujat:

- `DATABASE_URL`: PostgreSQL-palvelun antama yhteysosoite. Älä käytä selaimelle näkyvää `NEXT_PUBLIC_`-muuttujaa.
- `SESSION_SECRET`: vähintään 32 merkin satunnainen salaisuus. Luo salaisuuksien hallintaan sopivalla työkalulla, esimerkiksi `openssl rand -base64 48`.
- `LEAD_EXPORT_ADMIN_TOKEN`: erillinen vähintään 32 merkin satunnainen bearer-token CSV-vientiä varten.
- `PRIVACY_CONTROLLER_NAME`: todellinen rekisterinpitäjä.
- `PRIVACY_CONTACT`: rekisteröidyn pyyntöjen yhteydenottotapa.
- `PRIVACY_RETENTION_PERIOD`: omistajan hyväksymät säilytysajat ja poistokäytäntö.
- `PRIVACY_INTERNATIONAL_TRANSFERS`: todellinen kuvaus siirroista tai niiden puuttumisesta ja suojatoimista.

## Vercelin manuaaliset vaiheet

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

Saman selaimen voimassa olevalla sessiolla käyttäjä voi peruuttaa markkinointiluvan tietosuojasivulta. Ylläpitäjä käsittelee vahvistetun pyynnön palvelinympäristössä:

```powershell
npm run lead:admin -- revoke kayttaja@example.fi
npm run lead:admin -- delete kayttaja@example.fi
```

Sähköpostia ei pidä käyttää yksin pyytäjän henkilöllisyyden vahvistamiseen. Organisaation pitää määrittää pyyntöjen vastaanotto- ja varmennusmenettely ennen julkaisua.

## Tunnettu suojausraja

Analyysin API-payload ja tulostuksen avaus on suojattu allekirjoitetulla palvelinsessiolla. Nykyinen talouslaskennan JavaScript on kuitenkin edelleen osittain asiakassovelluksen bundle-tiedostoissa. Siksi proprietary-laskentalogiikan täydellinen tekninen salaus ei toteudu tässä buildissa. Jos tämä on julkaisuvaatimus, laskenta on siirrettävä kokonaan palvelinpuolelle ennen tuotantoa.
