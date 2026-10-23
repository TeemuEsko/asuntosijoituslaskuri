# asuntosijoituslaskuri.fi

Asuntosijoittajan suomenkielinen kohdetyötila. Nykyinen julkaisu sisältää uuden kohteen aloitusnäkymän, Etuovi- ja Oikotie-linkkien rajatun haun, ilmoitustekstin normalisoinnin sekä löydösten hyväksyntätyönkulun.

## Paikallinen testiversio

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Avaa selaimessa [http://localhost:3000](http://localhost:3000).

Analyysi, lähtötietojen muokkaus ja PDF-tulostus toimivat ilman rekisteröitymistä tai PostgreSQL-tietokantaa. Valokuvien perusteella arvioitu kunto edellyttää palvelinpuolen `OPENAI_API_KEY`-avainta. Kajabin koulutuslinkin voi vaihtaa asetuksella `NEXT_PUBLIC_KAJABI_TRAINING_URL`.

Vanhan liididatan ylläpito, suojattu CSV-vienti ja poistomenettely on kuvattu tiedostossa `docs/15_LEAD_CAPTURE_DEPLOYMENT.md`. Ne eivät kuulu julkiseen analyysipolkuun.

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

- analyysi ja PDF-tulostus toimivat ilman rekisteröitymistä, liidisessiota tai tietokantaa
- analyysiluonnos säilytetään vain saman välilehden `sessionStorage`-tallennuksessa; se ei ole liidirekisteri
- julkiset palvelinreitit käyttävät same-origin-tarkistusta ja instanssikohtaista kutsurajoitusta; tuotantotason hajautettu rajoitus on erillinen jatkotoimi
- vanha PostgreSQL-liididata ja suojattu CSV-ylläpitoreitti säilyvät vain olemassa olevien tietojen hallintaa varten
- talouslaskennan JavaScript jää osittain client bundleen; katso dokumentoitu suojausraja ennen tuotantojulkaisua
- ilmoitusparseri toimii ilman maksullista AI:ta; valokuvien tulkinta käyttää valinnaista palvelinpuolen kuvantulkintarajapintaa
- ilmoituskuvien automaattinen tulkinta vaatii sekä `OPENAI_API_KEY`-avaimen että erillisen `ENABLE_LISTING_IMAGE_ANALYSIS=true` -asetuksen
- ristiriitaisia dokumenttiarvoja ei ylikirjoiteta automaattisesti
- laskentakatalogi: `docs/11_CALCULATION_CATALOG.md`
- Foundation-manifesti: `FOUNDATION_MANIFEST.json`
- myynti-ilmoituksen haun tuki ja rajoitteet: `docs/12_LISTING_IMPORT.md`
