import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm md:p-10">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Takaisin laskuriin</Link>
        <h1 className="mt-6 text-3xl font-bold">Käyttöehdot</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">
          <p>asuntosijoituslaskuri.fi on suuntaa-antava laskuri ja analyysityökalu asuntosijoituskohteiden arviointiin.</p>
          <h2 className="text-lg font-semibold text-slate-900">Tuottoperusteinen laskenta</h2>
          <p>Palvelun analyysit perustuvat käyttäjän syöttämiin tietoihin, tuottolaskelmiin, kassavirtaan, riskipisteytykseen sekä arvioituihin kulurakenteisiin. Palvelulla ei ole pääsyä toteutuneisiin kauppahintoihin tai virallisiin vertailukauppatietoihin, joten palvelu ei tuota markkina-arvoarvioita eikä virallisia hinta-arvioita.</p>
          <h2 className="text-lg font-semibold text-slate-900">Ei sijoitusneuvontaa</h2>
          <p>Palvelu ei tarjoa sijoitusneuvontaa, taloudellista neuvontaa, veroneuvontaa, lakineuvontaa tai ostosuosituksia. Laskurin tulokset ovat arvioita.</p>
          <h2 className="text-lg font-semibold text-slate-900">Käyttäjän vastuu</h2>
          <p>Käyttäjä vastaa aina itse syöttämiensä tietojen oikeellisuudesta, tietojen tarkistamisesta virallisista asiakirjoista sekä lopullisesta sijoituspäätöksestään.</p>
          <h2 className="text-lg font-semibold text-slate-900">Ei takuita</h2>
          <p>Palvelu ei takaa laskelmien, parserin, pisteytyksen tai simulaatioiden oikeellisuutta, täydellisyyttä tai ajantasaisuutta.</p>
          <h2 className="text-lg font-semibold text-slate-900">URL-haku</h2>
          <p>Automaattisesti haetut tiedot voivat sisältää virheitä tai olla puutteellisia. Käyttäjän tulee tarkistaa kaikki tiedot itse kohteen ilmoituksesta, isännöitsijäntodistuksesta, PTS:stä ja muista virallisista aineistoista.</p>
          <h2 className="text-lg font-semibold text-slate-900">Vastuunrajoitus</h2>
          <p>Palveluntarjoaja ei vastaa mahdollisista taloudellisista tappioista, vahingoista tai menetyksistä, jotka aiheutuvat palvelun käytöstä tai sen tulkinnasta.</p>
          <h2 className="text-lg font-semibold text-slate-900">Immateriaalioikeudet</h2>
          <p>Palvelun sisältö, käyttöliittymä, pisteytysmallit ja analyysilogiikka ovat palveluntarjoajan omaisuutta, ellei toisin ole sovittu.</p>
        </div>
      </div>
    </main>
  );
}
