# RE-024 Yhtiöjärjestyksen lunastuslauseke

Tarvitaan:
- yhtiöjärjestys tai käyttäjän vahvistama tieto
- lunastuslausekkeen tila: ei, kyllä tai ei voitu tarkistaa

Jos lauseke on kyllä:
- tila on `detected`
- näytä juridinen tarkistusvaroitus
- kerro, että osakkailla ja/tai yhtiöllä voi olla lunastusoikeus
- älä päättele määräaikaa, lunastushintaa tai lausekkeen soveltumista ilman ehtojen tarkistusta

Jos yhtiöjärjestystä ei ole voitu tarkistaa, tila on `unchecked`. Puuttuminen ei yksin estä muuta analyysiä.
