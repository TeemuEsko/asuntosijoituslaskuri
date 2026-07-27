# Design System

## Lähtökohta

- shadcn/ui
- Base UI
- Nova-preset
- Geist
- Lucide Icons
- Tailwind

## Visuaalinen suunta

- ammattimainen
- rauhallinen
- informaatio edellä
- runsas mutta hallittu whitespace
- desktop ensin, responsiivinen rakenne

## Tilavärit

Värit määritetään design tokeneina, ei irrallisina Tailwind-luokkina liiketoimintalogiikassa.

Semanttiset tilat:

- success
- warning
- danger
- info
- neutral

Punainen:
- virhe
- pakollinen päätöstieto puuttuu
- korkean riskin havainto

Vihreä:
- valittu
- vahvistettu
- sääntö tarkistettu eikä riskiä havaittu

Keltainen:
- epävarma
- tarkistamatta
- lisätieto parantaisi analyysiä

## Keskeiset komponentit

- StatusBadge
- SourceBadge
- PropertyField
- AssumptionField
- ChoiceCardGroup
- MetricCard
- RiskCard
- DocumentCard
- AnalysisCoverage
- MissingInformationPanel
- DecisionSummary
- InlineHelp
