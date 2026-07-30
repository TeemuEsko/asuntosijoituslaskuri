# asuntosijoituslaskuri.fi

Asuntosijoittajan suomenkielinen kohdetyötila. Nykyinen julkaisu sisältää uuden kohteen aloitusnäkymän, Etuovi- ja Oikotie-linkkien rajatun haun, ilmoitustekstin normalisoinnin sekä löydösten hyväksyntätyönkulun.

## Paikallinen testiversio

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Avaa selaimessa [http://localhost:3000](http://localhost:3000).

Valokuvien perusteella arvioitu kunto edellyttää, että asetat `.env.local`-tiedostoon palvelinpuolen `OPENAI_API_KEY`-avaimen. Muut analyysitoiminnot toimivat ilman avainta. Sovellus ei hae myynti-ilmoitusten kuvia automaattisesti.

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

## RC:n rajaus

- ei tietokantaa tai autentikointia
- ilmoitusparseri toimii paikallisesti; vain käyttäjän erikseen lisäämien valokuvien tulkinta käyttää valinnaista palvelinpuolen kuvantulkintarajapintaa
- ristiriitaisia dokumenttiarvoja ei ylikirjoiteta automaattisesti
- laskentakatalogi: `docs/11_CALCULATION_CATALOG.md`
- Foundation-manifesti: `FOUNDATION_MANIFEST.json`
- myynti-ilmoituksen haun tuki ja rajoitteet: `docs/12_LISTING_IMPORT.md`
