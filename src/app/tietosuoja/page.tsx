import Link from "next/link";
import {
  missingPrivacyConfiguration,
  privacyConfiguration,
} from "@/server/privacy/config";

export default function PrivacyPage() {
  const configuration = privacyConfiguration();
  const missing = missingPrivacyConfiguration(configuration);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <Link href="/" className="text-sm underline underline-offset-4">
          Takaisin laskuriin
        </Link>
        <h1 className="text-3xl font-bold">Tietosuojaseloste</h1>
        <p className="text-sm text-muted-foreground">Päivitetty 23.10.2026</p>
      </div>

      {missing.length ? (
        <section className="rounded-xl border border-warning/30 bg-warning-soft p-4">
          <h2 className="font-semibold">Ei vielä julkaisuvalmis</h2>
          <p className="mt-1 text-sm">
            Palvelun omistajan pitää täydentää ja hyväksyä ennen
            tuotantojulkaisua: {missing.join(", ")}.
          </p>
        </section>
      ) : null}

      <section>
        <h2 className="text-xl font-semibold">
          Rekisterinpitäjä ja yhteydenotto
        </h2>
        <p>{configuration.controllerName ?? "Täydennetään ennen julkaisua."}</p>
        <p>
          {configuration.contact ??
            "Yhteydenottotapa täydennetään ennen julkaisua."}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Käsiteltävät tiedot</h2>
        <p>
          Laskuri ei pyydä nimeä tai sähköpostiosoitetta. Syöttämäsi
          ilmoituslinkki, ilmoituksesta tai asiakirjasta poimitut tiedot,
          asuntoa koskevat lähtötiedot ja laskurin oletukset käsitellään
          analyysin muodostamiseksi. Osoite, kuvat tai asiakirjat voivat
          sisältää henkilötietoa. Tekniseen käyttöön voi lisäksi liittyä IP-,
          laite-, pyyntö- ja lokitietoja palveluntarjoajien asetusten mukaan.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Selain- ja palvelinkäsittely</h2>
        <p>
          Analyysiluonnos säilytetään vain saman välilehden
          istuntotallennuksessa (sessionStorage), jotta työn voi palauttaa
          sivun päivityksen jälkeen. Sovelluksella ei ole omaa
          henkilötietokantaa. Ilmoituksen haku, ilmoitustekstin tai asiakirjan
          tulkinta ja mahdollinen kuva-analyysi kulkevat Vercelin
          palvelinreittien kautta tilapäisesti. PDF muodostetaan selaimen
          tulostustoiminnolla eikä raporttitiedostoa tallenneta palvelimelle.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">
          Tarkoitukset ja oikeusperusteet
        </h2>
        <p>
          Tietoja käsitellään laskurin toimittamiseen, tietoturvaan,
          väärinkäytösten estämiseen ja palvelun toimivuuden mittaamiseen.
          {" "}
          {configuration.legalBases ??
            "Oikeusperusteet täydennetään ja tarkistetaan juridisesti ennen julkaisua."}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Analytiikka</h2>
        <p>
          Palvelu käyttää Vercel Web Analyticsia sivunäyttöjen, kävijämäärien
          ja rajattujen käyttötapahtumien mittaamiseen. Tapahtumiin ei liitetä
          nimeä, sähköpostia, asunnon osoitetta, ilmoituslinkin
          hakuparametreja tai laskelmien sisältöä. Mittauksessa käytetään vain
          toiminnon nimeä sekä tarvittaessa CTA:n tyyppiä ja sijaintia. Vercel
          ilmoittaa Web Analyticsin olevan evästeetön, mutta palvelun omistajan
          on silti hyväksyttävä oikeusperuste, palveluasetukset ja mahdollinen
          suostumustarve sovellettavan lain perusteella.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">
          Maksuton koulutus ja markkinointi
        </h2>
        <p>
          Laskurin vapaaehtoiset linkit vievät Kajabin ulkoisille sivuille.
          Laskuri ei siirrä yhteystietoja Kajabiin automaattisesti. Kajabissa
          annetut yhteystiedot ja markkinointisuostumukset käsitellään Kajabin
          lomakkeiden tietosuoja- ja suostumusehtojen mukaisesti.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">
          Vastaanottajat ja palveluntarjoajat
        </h2>
        <p>
          {configuration.serviceProviders ??
            "Vercelin, Kajabin ja mahdollisen OpenAI-kuvatulkinnan roolit, alueet, alikäsittelijät ja käsittelysopimukset täydennetään ennen julkaisua."}
        </p>
        <p>
          Kuva-analyysi on oletuksena poissa käytöstä. Jos se otetaan käyttöön,
          analysoitavat kuvat välitetään OpenAI:n rajapintaan ilman sovelluksen
          omaa pysyvää tallennusta.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Säilytys ja poistaminen</h2>
        <p>
          {configuration.retentionPeriod ??
            "Säilytysajat ja poistokäytännöt täydennetään ennen julkaisua."}
        </p>
        <p>
          Selaimen istuntoluonnoksen voi poistaa palaamalla laskurin
          etusivulle tai päättämällä välilehden istunnon. Kajabissa annettujen
          tietojen poistaminen ja suostumuksen peruuttaminen tehdään Kajabin
          prosessin kautta.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Oikeutesi</h2>
        <p>
          Voit pyytää pääsyä tietoihisi, niiden oikaisua tai poistamista,
          käsittelyn rajoittamista ja vastustaa käsittelyä sovellettavan lain
          mukaisesti. Pyynnöt tehdään yllä ilmoitettuun yhteydenottokanavaan.
          Organisaation pitää määrittää pyyntöjen turvallinen
          henkilöllisyyden varmennus- ja toteutusmenettely.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Kansainväliset siirrot</h2>
        <p>
          {configuration.internationalTransfers ??
            "Mahdolliset kansainväliset siirrot ja niiden suojatoimet täydennetään ennen julkaisua."}
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        Tämä tekninen toteutus ei yksinään takaa tietosuojalainsäädännön
        noudattamista. Organisatoriset päätökset, sopimukset ja lopullinen
        juridinen tarkistus tarvitaan ennen julkaisua.
      </p>
    </main>
  );
}
