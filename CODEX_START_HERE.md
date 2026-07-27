# Codex: aloita tästä

Rakennat PropertyOS-nimistä selaimessa toimivaa suomalaisten asuntosijoittajien asiantuntijajärjestelmää.

## Ennen koodia

Lue kaikki seuraavat:

- `docs/00_PLAYBOOK.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_PROPERTY_MODEL.md`
- `docs/03_RULE_ENGINE.md`
- `docs/04_UI_GUIDELINES.md`
- `docs/05_DESIGN_SYSTEM.md`
- `docs/06_DOCUMENT_PIPELINE.md`
- `docs/07_PROGRESSIVE_ANALYSIS.md`
- `docs/08_DECISION_LOG.md`
- `docs/09_ROADMAP.md`
- `docs/10_GLOSSARY.md`
- kaikki `docs/rules/**`-tiedostot
- kaikki `docs/examples/**`-tiedostot
- `src/core/**`

## Ensimmäinen tehtävä

Älä muuta tiedostoja.

Palauta ensin:

1. yhteenveto nykyisestä toteutuksesta
2. arvio dokumentaation ja koodipohjan ristiriidoista
3. ehdotus lopullisesta kansiorakenteesta
4. Unified Property Modelin tarkistus
5. Rule Enginen tekninen toteutusmalli
6. Sprint 0:n tarkka työlista
7. riskit ja avoimet päätökset

Odota hyväksyntää ennen toteutusta.

## Kiinteät säännöt

- PropertyOS analysoi kohdetta, ei tiedostoja.
- Kaikki syöttötavat muodostavat saman Unified Property Modelin.
- Parseri ei arvaa.
- Käyttäjän syöttämä tai muokkaama arvo voittaa parserin arvon.
- AI ei pisteytä, suosittele eikä keksi.
- AI selittää deterministisen moottorin tuloksia.
- Rule Engine ei saa olla React-komponenteissa.
- Laskentalogiikka ei saa olla käyttöliittymässä.
- Jokaisella tiedolla pitää olla lähde, tila ja tarvittaessa luottamustaso.
- Analyysi päivittyy datan muuttuessa ilman uudelleenkäynnistystä.
- Vanhasta laskurista säilytetään toimivat värikorostukset, selitetekstit, infoikonit ja valintakortit modernisoituina.
