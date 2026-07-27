# PropertyOS Foundation v2.1 Release Candidate

Tämä paketti liitetään olemassa olevan Next.js-projektin juureen.

## Tee näin

1. Pura ZIP.
2. Kopioi puretun kansion sisältö projektin juureen.
3. Jos Windows kysyy tiedostojen yhdistämisestä, hyväksy kansioiden yhdistäminen.
4. Paketti ei korvaa `src/app`-kansiota eikä nykyisiä shadcn-komponentteja.
5. Vie muutokset GitHubiin yhtenä commitina.
6. Avaa projekti Codexissa ja anna sille `CODEX_START_HERE.md`.

## Tärkeä rajaus

Tämä paketti määrittelee tuotteen perustan. Se ei vielä toteuta Parseria, Rule Engineä tai käyttöliittymää valmiiksi.

## v2.1 RC

- tontin omistus tukee omaa tonttia, vuokratonttia ja valinnaista vuokratonttia
- valinnaiselle vuokratontille mallinnetaan lunastustila, lunastushinta ja seuraava lunastusajankohta
- yhtiöjärjestyksen lunastuslauseke ja juridinen tarkistus mallinnetaan eksplisiittisesti
- ristiriitaisia lähdearvoja ei ylikirjoiteta automaattisesti
- laskettavien lukujen kaavat, yksiköt, rajaukset, pyöristykset ja puuttuvan tiedon käsittely on dokumentoitu

North Star:

> Auttaako tämä käyttäjää tekemään paremman asuntosijoituspäätöksen nopeammin?
