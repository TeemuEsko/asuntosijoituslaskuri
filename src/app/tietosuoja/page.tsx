import Link from "next/link";
import { ConsentWithdrawal } from "@/components/privacy/consent-withdrawal";
import { missingPrivacyConfiguration, privacyConfiguration } from "@/server/privacy/config";

export default function PrivacyPage() {
  const configuration = privacyConfiguration();
  const missing = missingPrivacyConfiguration(configuration);
  return <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
    <div className="space-y-2"><Link href="/" className="text-sm underline underline-offset-4">Takaisin laskuriin</Link><h1 className="text-3xl font-bold">Tietosuojaseloste</h1><p className="text-sm text-muted-foreground">Päivitetty 16.10.2026</p></div>
    {missing.length ? <section className="rounded-xl border border-warning/30 bg-warning-soft p-4"><h2 className="font-semibold">Ei vielä julkaisuvalmis</h2><p className="mt-1 text-sm">Palvelun omistajan pitää täydentää ennen tuotantojulkaisua: {missing.join(", ")}.</p></section> : null}
    <section><h2 className="text-xl font-semibold">Rekisterinpitäjä ja yhteydenotto</h2><p>{configuration.controllerName ?? "Täydennetään ennen julkaisua."}</p><p>{configuration.contact ?? "Yhteydenottotapa täydennetään ennen julkaisua."}</p></section>
    <section><h2 className="text-xl font-semibold">Kerättävät tiedot</h2><p>Keräämme etunimen, normalisoidun sähköpostiosoitteen, vapaaehtoisen markkinointisuostumuksen tiedot ja palvelun käytön kannalta välttämättömät tekniset tapahtumat. Funnel-mittaukseen ei lähetetä sähköpostiosoitetta tai ilmoituksen URL-osoitetta.</p></section>
    <section><h2 className="text-xl font-semibold">Tarkoitukset ja oikeusperusteet</h2><p>Yhteystietoja käsitellään maksuttoman analyysin tarjoamiseksi ja palvelun turvallisen käytön mahdollistamiseksi erikseen määriteltävän palveluperusteen nojalla. Sähköistä suoramarkkinointia tehdään vain erillisellä suostumuksella. Lopulliset oikeusperusteet on tarkistettava juridisesti ennen julkaisua.</p></section>
    <section><h2 className="text-xl font-semibold">Markkinointisuostumus</h2><p>Markkinointilupa on vapaaehtoinen eikä vaikuta analyysiin pääsyyn. Suostumuksesta tallennetaan ajankohta, tekstiversio ja lähde. Voit peruuttaa tällä selaimella annetun suostumuksen alta.</p><div className="mt-4"><ConsentWithdrawal /></div></section>
    <section><h2 className="text-xl font-semibold">Vastaanottajat ja palveluntarjoajat</h2><p>Tietoja käsittelevät palvelun tekniseen toteutukseen valitut hosting- ja tietokantapalveluntarjoajat omien sopimustensa mukaisesti. Markkinointiluvan antaneiden henkilöiden tiedot voidaan viedä manuaalisesti Kajabiin. Lopullinen palveluntarjoajaluettelo on täydennettävä ennen julkaisua.</p></section>
    <section><h2 className="text-xl font-semibold">Säilytys</h2><p>{configuration.retentionPeriod ?? "Säilytysajat ja poistokäytännöt täydennetään ennen julkaisua."}</p></section>
    <section><h2 className="text-xl font-semibold">Oikeutesi</h2><p>Voit pyytää pääsyä tietoihisi, niiden oikaisua tai poistamista, käsittelyn rajoittamista ja vastustaa käsittelyä sovellettavan lain mukaisesti. Voit peruuttaa suostumuksen milloin tahansa. Pyynnöt tehdään yllä ilmoitettuun yhteydenottokanavaan.</p></section>
    <section><h2 className="text-xl font-semibold">Kansainväliset siirrot</h2><p>{configuration.internationalTransfers ?? "Mahdolliset kansainväliset siirrot ja niiden suojatoimet täydennetään ennen julkaisua."}</p></section>
    <p className="text-sm text-muted-foreground">Tämä tekninen toteutus ei yksinään takaa tietosuojalainsäädännön noudattamista. Organisatoriset päätökset, sopimukset ja lopullinen juridinen tarkistus tarvitaan ennen julkaisua.</p>
  </main>;
}
