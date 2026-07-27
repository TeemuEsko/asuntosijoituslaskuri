# asuntosijoituslaskuri.fi

Asuntosijoittajan suomenkielinen kohdetyötila. Nykyinen julkaisu sisältää uuden kohteen aloitusnäkymän, Etuovi- ja Oikotie-linkkien rajatun haun, ilmoitustekstin normalisoinnin sekä löydösten hyväksyntätyönkulun.

## Paikallinen testiversio

```powershell
npm.cmd install
npm.cmd run dev
```

Avaa selaimessa [http://localhost:3000](http://localhost:3000).

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
- ei ulkoista parseria tai AI-rajapintaa
- ristiriitaisia dokumenttiarvoja ei ylikirjoiteta automaattisesti
- laskentakatalogi: `docs/11_CALCULATION_CATALOG.md`
- Foundation-manifesti: `FOUNDATION_MANIFEST.json`
- myynti-ilmoituksen haun tuki ja rajoitteet: `docs/12_LISTING_IMPORT.md`
