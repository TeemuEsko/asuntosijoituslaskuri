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
