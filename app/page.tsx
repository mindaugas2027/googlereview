import { Check, Filter, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* VIRŠUTINĖ NAVIGACIJA */}
      <header className="flex justify-between items-center p-6 border-b border-slate-800 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-bold">
            Review<span className="text-blue-500">Flow</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login"
            className="text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Prisijungti
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Išbandyti nemokamai
          </Link>
        </div>
      </header>

      {/* PAGRINDINIS TURINYS */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section className="text-center py-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full mb-6 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Naujos kartos atsiliepimai
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Paverskite atsiliepimus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">savo verslo varikliu</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Rinkite klientų atsiliepimus naudodami išmaniuosius QR kodus, gerinkite Google reitingus ir auginkite pardavimus.
          </p>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
            >
              Pradėti nemokamai <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="border-t border-slate-800 py-16">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-blue-400 mb-3">KAIP TAI VEIKIA</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Išmanus atsiliepimų filtras</h2>
            <p className="text-slate-400">
              Padėkite patenkintiems klientams lengvai jus rasti Google, o į privačias pastabas reaguokite dar prieš joms tampant viešomis.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 grid place-items-center mb-5">1</div>
              <h3 className="font-bold text-lg mb-2">Klientas nuskaito QR kodą</h3>
              <p className="text-sm text-slate-400">Po apsilankymo klientas greitai įvertina jūsų paslaugą telefone.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 grid place-items-center mb-5"><Filter size={18} /></div>
              <h3 className="font-bold text-lg mb-2">Įvertinimas nukreipia toliau</h3>
              <div className="space-y-2 text-sm mt-4">
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2"><span className="text-emerald-300">4–5 žvaigždutės</span><span className="text-slate-300">Google Review</span></div>
                <div className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2"><span className="text-amber-300">1–3 žvaigždutės</span><span className="text-slate-300">Privati žinutė jums</span></div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 grid place-items-center mb-5">3</div>
              <h3 className="font-bold text-lg mb-2">Auginkite reputaciją</h3>
              <p className="text-sm text-slate-400">Stebėkite rezultatus vienoje valdymo panelėje ir greičiau išspręskite problemas.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-800 py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-blue-400 mb-3">KAINODARA</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Aiškūs planai jūsų verslui</h2>
            <p className="text-slate-400">Pradėkite paprastai ir auginkite kartu su savo klientų atsiliepimais.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Startas', price: '19', description: 'Mažoms įmonėms ir individualiems meistrams.', features: ['1 vieta / adresas', 'Neriboti QR nuskaitymai', 'Pagrindinė analitika'] },
              { name: 'Pro Verslas', price: '39', description: 'Augantiems verslams su komanda.', features: ['Iki 5 vietų', 'Google Review integracija', 'Išplėstinė analitika'], popular: true },
              { name: 'Maksimalus', price: '79', description: 'Tinklams ir didelėms įmonėms.', features: ['Neribotas vietų skaičius', 'API prieiga', 'Asmeninis vadybininkas'] },
            ].map((plan) => (
              <div key={plan.name} className={`relative bg-slate-900 border rounded-2xl p-6 ${plan.popular ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-800'}`}>
                {plan.popular && <span className="absolute -top-3 left-6 bg-blue-600 text-xs font-bold px-3 py-1 rounded-full">Populiariausias</span>}
                <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-400 min-h-10">{plan.description}</p>
                <div className="my-6"><span className="text-4xl font-extrabold">€{plan.price}</span><span className="text-slate-400"> / mėn.</span></div>
                <ul className="space-y-3 text-sm text-slate-300 mb-7">
                  {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check size={16} className="text-emerald-400" />{feature}</li>)}
                </ul>
                <Link href="/login" className={`w-full py-3 rounded-xl font-semibold text-center block transition ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
                  Išbandyti nemokamai
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}