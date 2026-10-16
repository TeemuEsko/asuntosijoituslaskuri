# asuntosijoituslaskuri.fi

Asuntosijoittajan suomenkielinen kohdetyötila. Nykyinen julkaisu sisältää uuden kohteen aloitusnäkymän, Etuovi- ja Oikotie-linkkien rajatun haun, ilmoitustekstin normalisoinnin sekä löydösten hyväksyntätyönkulun.

## Paikallinen testiversio

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Avaa selaimessa [http://localhost:3000](http://localhost:3000).

Liidinkeräys ja analyysiin pääsy edellyttävät PostgreSQL-tietokantaa sekä `DATABASE_URL`- ja `SESSION_SECRET`-asetuksia. Suorita ennen käynnistystä `npm.cmd run db:migrate`. Valokuvien perusteella arvioitu kunto edellyttää lisäksi palvelinpuolen `OPENAI_API_KEY`-avainta.

Tarkka Vercel-käyttöönotto, CSV-vienti, suostumuksen peruuttaminen ja tietojen poistomenettely on kuvattu tiedostossa `docs/15_LEAD_CAPTURE_DEPLOYMENT.md`.

## Tarkistukset

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
```

Koko tarkistusketju yhdellä komennolla:

```powershell
npm.cmd run check
```

## Nykyinen rajaus

- analyysiin pääsy perustuu kevyeen, allekirjoitettuun 30 päivän selaimistuntoon; sähköpostia ei varmenneta eikä ratkaisu ole käyttäjätili
- liidit, suostumushistoria, funnel-tapahtumat ja palvelinpuolinen rate limit tallennetaan PostgreSQL:ään
- talouslaskennan JavaScript jää osittain client bundleen; katso dokumentoitu suojausraja ennen tuotantojulkaisua
- ilmoitusparseri toimii paikallisesti; vain käyttäjän erikseen lisäämien valokuvien tulkinta käyttää valinnaista palvelinpuolen kuvantulkintarajapintaa
- ristiriitaisia dokumenttiarvoja ei ylikirjoiteta automaattisesti
- laskentakatalogi: `docs/11_CALCULATION_CATALOG.md`
- Foundation-manifesti: `FOUNDATION_MANIFEST.json`
- myynti-ilmoituksen haun tuki ja rajoitteet: `docs/12_LISTING_IMPORT.md`
