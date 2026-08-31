import { Check, Filter, Sparkles, ArrowRight, BarChart3, MessageCircle, QrCode, ShieldCheck, Star, TrendingUp } from 'lucide-react';
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
            <span className="text-[#1a73e8]">Get</span>review
          </span>
        </div>
        <div className="flex items-center">
          <Link 
            href="/login"
            className="border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#3c4043] font-semibold px-4 py-2 rounded-xl text-sm transition shadow-sm"
          >
            Prisijungti
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

        <section className="pb-16">
          <div className="bg-[#202124] rounded-3xl p-6 sm:p-10 text-white overflow-hidden relative">
            <div className="relative z-10 grid lg:grid-cols-[0.85fr_1.15fr] gap-10 items-center">
              <div>
                <p className="text-xs font-bold tracking-widest text-[#8ab4f8] mb-3">VIENA VIETA VISKAM</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">Žinokite, ką klientai galvoja apie jus.</h2>
                <p className="text-[#bdc1c6] leading-relaxed mb-6">Getreview surenka kiekvieną signalą ir paverčia jį aiškiais veiksmais: daugiau gerų atsiliepimų, greitesnis reagavimas ir stipresnė reputacija.</p>
                <div className="flex flex-wrap gap-3 text-sm text-[#e8eaed]">
                  <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#81c995]" /> Privatūs atsakymai</span>
                  <span className="flex items-center gap-2"><TrendingUp size={16} className="text-[#8ab4f8]" /> Aiškūs rezultatai</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 text-[#202124] shadow-2xl shadow-black/30">
                <div className="flex justify-between items-center mb-5"><div><p className="text-xs text-[#5f6368]">BENDRAS ĮVERTINIMAS</p><div className="flex items-center gap-2 mt-1"><span className="text-3xl font-extrabold">4.9</span><span className="text-[#fbbc04] flex gap-0.5"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></span></div></div><span className="text-xs font-semibold text-[#137333] bg-[#e6f4ea] px-2.5 py-1.5 rounded-lg">+18.4% šį mėn.</span></div>
                <div className="flex items-end gap-2 h-28 border-b border-[#dadce0] pb-2">{[38, 52, 45, 68, 61, 82, 96].map((height, index) => <div key={index} className="flex-1 bg-[#8ab4f8] rounded-t-md" style={{ height: `${height}%` }} />)}</div>
                <div className="flex justify-between text-[11px] text-[#80868b] mt-2"><span>Prieš 6 sav.</span><span>Dabar</span></div>
              </div>
            </div>
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
            <p className="text-xs font-bold tracking-widest text-[#1a73e8] mb-3">KODĖL GETREVIEW</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Mažiau spėlionių. Daugiau augimo.</h2>
            <p className="text-[#5f6368]">Viskas, ko reikia reputacijai valdyti, be sudėtingų lentelių ir prarastų žinučių.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: QrCode, title: 'Vienas QR kodas', text: 'Padėkite klientui palikti atsiliepimą vos keliais paspaudimais.' },
              { icon: BarChart3, title: 'Gyva analitika', text: 'Matykite tendencijas pagal laiką, vietą ir įvertinimą.' },
              { icon: MessageCircle, title: 'Greitas atsakas', text: 'Pastebėkite problemas privačiai, kol jos netapo viešos.' },
              { icon: TrendingUp, title: 'Daugiau pasitikėjimo', text: 'Geresnis reitingas padeda naujiems klientams apsispręsti.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm">
                <Icon size={22} className="text-[#1a73e8] mb-5" />
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-[#5f6368] leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#dadce0] py-16">
          <div className="max-w-3xl mx-auto text-center mb-10"><p className="text-xs font-bold tracking-widest text-[#1a73e8] mb-3">KLIENTŲ PATIRTIS</p><h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Reputacija, kuri dirba už jus</h2></div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { quote: 'Pagaliau matome ne tik žvaigždučių skaičių, bet ir tai, ką turime pagerinti.', name: 'Ieva M.', role: 'Grožio studijos savininkė' },
              { quote: 'QR kodą klientai naudoja iškart po vizito. Atsiliepimų tapo gerokai daugiau.', name: 'Tomas R.', role: 'Restorano vadovas' },
              { quote: 'Dashboard leidžia komandai greitai suprasti, kas veikia kiekvienoje vietoje.', name: 'Gabija K.', role: 'Paslaugų tinklo vadovė' },
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm"><div className="flex gap-1 text-[#fbbc04] mb-4"><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /><Star size={15} fill="currentColor" /></div><p className="text-[#3c4043] leading-relaxed mb-6">„{testimonial.quote}“</p><p className="font-bold text-sm">{testimonial.name}</p><p className="text-xs text-[#5f6368] mt-1">{testimonial.role}</p></div>
            ))}
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
              { name: 'Startas', price: '14,99', description: 'Mažoms įmonėms ir individualiems meistrams.', features: ['1 vieta / adresas', '1 QR kodas', 'Neriboti QR nuskaitymai'] },
              { name: 'Pro', price: '19,99', description: 'Kavinėms, restoranams ir komandoms.', features: ['1 vieta / adresas', 'Neriboti QR kodai (stalams, personalui)', 'QR statistika: kuris kodas surenka daugiausia gerų atsiliepimų'], popular: true },
              { name: 'Verslas', price: '34,99', description: 'Tinklams ir didelėms įmonėms.', features: ['Iki 5 vietų', 'Neriboti QR kodai', 'QR kodų susiejimas su vietomis'] },
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