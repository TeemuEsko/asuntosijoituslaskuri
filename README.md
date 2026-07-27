# PropertyOS Foundation v2.1 RC

PropertyOS on suomalaisen asuntosijoittajan päätöksenteon työtila. Foundation v2.1 Release Candidate määrittelee yhtenäisen kohdemallin, turvallisen lähdetietojen yhdistämisen, nykyisten laskentojen sopimukset sekä Alpha-työtilan paikallisella demo-datalla.

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
