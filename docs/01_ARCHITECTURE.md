# Arkkitehtuuri

## Päävirta

Input  
↓  
Parser (valinnainen)  
↓  
Data Fusion Engine  
↓  
Unified Property Model  
↓  
Calculation Engine + Rule Engine  
↓  
Deterministic Analysis Result  
↓  
AI Explanation  
↓  
Property Workspace

## Vastuut

### Parser

- poimii vain tunnistetut arvot
- tallentaa lähteen ja luottamuksen
- jättää epävarman kentän tyhjäksi
- ei tee riskipäätelmiä

### Data Fusion Engine

- yhdistää linkit, dokumentit ja käyttäjän syötteet
- ratkaisee lähteiden prioriteetin
- ylläpitää yhtä kohdemallia
- säilyttää muutoshistorian myöhemmässä vaiheessa

Prioriteetti:

1. käyttäjän muokkaama arvo
2. käyttäjän syöttämä arvo
3. luotettavasti parseroitu arvo
4. tyhjä

### Unified Property Model

Kaikkien ominaisuuksien yhteinen tietolähde.

### Calculation Engine

- tuotot
- kassavirta
- rahoitus
- hintojen täsmäytys
- V1:n vuokraustoiminnan laskelmat

### Rule Engine

- suorittaa deterministiset säännöt
- palauttaa tilan, vakavuuden, perustelun ja evidenssin
- ei riipu käyttöliittymästä

### AI Explanation

- muotoilee moottorin tulokset ymmärrettäväksi
- ei muuta riskitasoa
- ei keksi puuttuvia faktoja
- ilmaisee epävarmuudet

## Tekninen rajaus

`src/core` ei saa tuoda Reactia, Next.js:ää tai UI-komponentteja.
