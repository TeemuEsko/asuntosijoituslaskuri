import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 md:p-10">
      <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6 shadow-sm md:p-10">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">← Takaisin laskuriin</Link>
        <h1 className="mt-6 text-3xl font-bold">Tietosuojaseloste</h1>
        <div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">
          <p>Tämä on MVP-vaiheen kevyt tietosuojaseloste asuntosijoituslaskuri.fi-palvelulle.</p>
          <h2 className="text-lg font-semibold text-slate-900">Käsiteltävät tiedot</h2>
          <p>Palvelussa voidaan käsitellä käyttäjän syöttämiä kohdetietoja, laskentaoletuksia ja URL-hakuun annettuja kohdelinkkejä.</p>
          <h2 className="text-lg font-semibold text-slate-900">Käyttötarkoitus</h2>
          <p>Tietoja käytetään laskurin toiminnallisuuksien, analyysin ja URL-haun toteuttamiseen.</p>
          <h2 className="text-lg font-semibold text-slate-900">Sähköposti ja käyttäjätilit</h2>
          <p>Mikäli palveluun lisätään myöhemmin sähköpostilähetys, käyttäjätilit tai Kajabi-integraatio, tietosuojaselostetta täydennetään niiden osalta.</p>
          <h2 className="text-lg font-semibold text-slate-900">Evästeet ja analytiikka</h2>
          <p>Palvelussa voidaan myöhemmin käyttää analytiikkaa käyttökokemuksen kehittämiseen. Mahdollisista evästeistä ilmoitetaan erikseen.</p>
        </div>
      </div>
    </main>
  );
}
