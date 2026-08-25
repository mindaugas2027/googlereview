import { Check, Filter, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#202124] font-sans">
      {/* VIRŠUTINĖ NAVIGACIJA */}
      <header className="flex justify-between items-center p-6 border-b border-[#dadce0] max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1a73e8] text-white">
            <Sparkles size={18} />
          </span>
          <span className="text-lg font-bold">
            Review<span className="text-[#1a73e8]">Flow</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/login"
            className="text-sm font-medium text-[#5f6368] hover:text-[#1a73e8] transition"
          >
            Prisijungti
          </Link>
          <Link
            href="/login?mode=signup"
            className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Išbandyti nemokamai
          </Link>
        </div>
      </header>

      {/* PAGRINDINIS TURINYS */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section className="text-center py-12 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#e8f0fe] border border-[#c6dafc] text-[#1967d2] text-xs px-3 py-1 rounded-full mb-6 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#34a853] animate-pulse" /> Naujos kartos atsiliepimai
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6">
            Paverskite atsiliepimus <span className="text-[#1a73e8]">savo verslo varikliu</span>
          </h1>
          <p className="text-[#5f6368] text-lg mb-8 max-w-2xl mx-auto">
            Rinkite klientų atsiliepimus naudodami išmaniuosius QR kodus, gerinkite Google reitingus ir auginkite pardavimus.
          </p>
          <div className="flex justify-center">
            <Link
              href="/login?mode=signup"
              className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
            >
              Pradėti nemokamai <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="border-t border-[#dadce0] py-16">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-[#1a73e8] mb-3">KAIP TAI VEIKIA</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Išmanus atsiliepimų filtras</h2>
            <p className="text-[#5f6368]">
              Padėkite patenkintiems klientams lengvai jus rasti Google, o į privačias pastabas reaguokite dar prieš joms tampant viešomis.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center mb-5">1</div>
              <h3 className="font-bold text-lg mb-2">Klientas nuskaito QR kodą</h3>
              <p className="text-sm text-[#5f6368]">Po apsilankymo klientas greitai įvertina jūsų paslaugą telefone.</p>
            </div>
            <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#fce8e6] text-[#ea4335] grid place-items-center mb-5"><Filter size={18} /></div>
              <h3 className="font-bold text-lg mb-2">Įvertinimas nukreipia toliau</h3>
              <div className="space-y-2 text-sm mt-4">
                <div className="flex items-center justify-between rounded-lg bg-[#e6f4ea] border border-[#b7dfc1] px-3 py-2"><span className="text-[#137333]">4–5 žvaigždutės</span><span className="text-[#3c4043]">Google Review</span></div>
                <div className="flex items-center justify-between rounded-lg bg-[#fef7e0] border border-[#f9df96] px-3 py-2"><span className="text-[#b06000]">1–3 žvaigždutės</span><span className="text-[#3c4043]">Privati žinutė jums</span></div>
              </div>
            </div>
            <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center mb-5">3</div>
              <h3 className="font-bold text-lg mb-2">Auginkite reputaciją</h3>
              <p className="text-sm text-[#5f6368]">Stebėkite rezultatus vienoje valdymo panelėje ir greičiau išspręskite problemas.</p>
            </div>
          </div>
        </section>

        <section className="border-t border-[#dadce0] py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold tracking-widest text-[#1a73e8] mb-3">KAINODARA</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Aiškūs planai jūsų verslui</h2>
            <p className="text-[#5f6368]">Pradėkite paprastai ir auginkite kartu su savo klientų atsiliepimais.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Startas', price: '19', description: 'Mažoms įmonėms ir individualiems meistrams.', features: ['1 vieta / adresas', 'Neriboti QR nuskaitymai', 'Pagrindinė analitika'] },
              { name: 'Pro Verslas', price: '39', description: 'Augantiems verslams su komanda.', features: ['Iki 5 vietų', 'Google Review integracija', 'Išplėstinė analitika'], popular: true },
              { name: 'Maksimalus', price: '79', description: 'Tinklams ir didelėms įmonėms.', features: ['Neribotas vietų skaičius', 'API prieiga', 'Asmeninis vadybininkas'] },
            ].map((plan) => (
              <div key={plan.name} className={`relative bg-white border rounded-2xl p-6 shadow-sm ${plan.popular ? 'border-[#1a73e8] shadow-lg shadow-blue-500/10' : 'border-[#dadce0]'}`}>
                {plan.popular && <span className="absolute -top-3 left-6 bg-[#1a73e8] text-xs font-bold px-3 py-1 rounded-full text-white">Populiariausias</span>}
                <h3 className="font-bold text-xl mb-2">{plan.name}</h3>
                <p className="text-sm text-[#5f6368] min-h-10">{plan.description}</p>
                <div className="my-6"><span className="text-4xl font-extrabold text-[#202124]">€{plan.price}</span><span className="text-[#5f6368]"> / mėn.</span></div>
                <ul className="space-y-3 text-sm text-[#3c4043] mb-7">
                  {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><Check size={16} className="text-[#34a853]" />{feature}</li>)}
                </ul>
                <Link href="/login?mode=signup" className={`w-full py-3 rounded-xl font-semibold text-center block transition ${plan.popular ? 'bg-[#1a73e8] hover:bg-[#1769d1] text-white' : 'bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043]'}`}>
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