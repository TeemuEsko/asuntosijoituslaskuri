# Decision Log

## D-001 North Star

Auttaako tämä käyttäjää tekemään paremman asuntosijoituspäätöksen nopeammin?

## D-002 Velaton hinta ensin

Kauppatietojen järjestys:

1. velaton hinta
2. myyntihinta
3. yhtiölainaosuus

## D-003 Ei vahvistuscheckboxeja

Kentän muokkaaminen vahvistaa arvon.

## D-004 Käyttäjän arvo voittaa

Käyttäjän syöttämä tai muokkaama tieto syrjäyttää parserin arvon.

## D-005 Parseri ei arvaa

Epävarma kenttä jätetään tyhjäksi.

## D-006 Yhtiölaina ja rahoitusvastike

Jos yhtiölainaosuus on 0, rahoitusvastike on laskennassa 0.

## D-007 Osakeluettelo on lisätieto

Sen puuttuminen ei estä analyysiä. Omistuskeskittymä jää tarkistamatta.

## D-008 AI vain selittää

AI ei pisteytä, suosittele eikä muuta moottorin tuloksia.

## D-009 Property Workspace

Tuote analysoi jatkuvasti yhtä kohdetta. Analyysiä ei käynnistetä alusta uusien dokumenttien yhteydessä.

## D-010 Vanhan UI:n toimivat ratkaisut säilytetään

Värikorostukset, selitetekstit, infoikonit ja valintakortit modernisoidaan.

## D-011 Ristiriitaisia lähdearvoja ei ylikirjoiteta

Alkuperäinen dokumenttiarvo ja ristiriitainen uusi havainto säilytetään. Laskennallinen arvo ei muuta lähde-evidenssiä.

## D-012 Tontin omistusmuodot

Tontti mallinnetaan arvona `owned`, `leased` tai `optional_leasehold`. Valinnaisen vuokratontin huoneistokohtainen lunastustila, hinta ja seuraava ajankohta ovat erillisiä kenttiä.

## D-013 Lunastuslauseke vaatii juridisen tarkistuksen

Yhtiöjärjestyksen lunastuslauseke ei johda automaattiseen johtopäätökseen. Tila `yes` tai `unchecked` näyttää juridisen tarkistusvaroituksen.
