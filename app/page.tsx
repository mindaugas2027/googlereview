'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowRight, BarChart3, Check, Copy, ExternalLink, Eye, 
  Globe2, LayoutDashboard, LogOut, MapPin, Menu, MessageSquare, 
  Plus, QrCode, ScanLine, Settings, Sparkles, Star, ThumbsUp, X, Zap, Lock, Mail
} from 'lucide-react';

type Business = {
  id: string;
  name: string;
  category: string;
  address: string;
  brand_color: string;
  google_review_url: string;
  min_stars_for_google: number;
};

export default function App() {
  const [page, setPage] = useState<'landing' | 'overview' | 'feedback' | 'qr' | 'analytics' | 'locations' | 'settings' | 'billing' | 'public_review'>('landing');
  const [mobileMenu, setMobileMenu] = useState(false);

  // Prisijungimo lango (Modal) būsenos
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Verslo profilis ir nustatymai
  const [business, setBusiness] = useState<Business>({
    id: 'demo-id',
    name: 'Mano Verslas',
    category: 'Grožio paslaugos',
    address: 'Gedimino pr. 1, Vilnius',
    brand_color: '#2563eb',
    google_review_url: 'https://g.page/r/example/review',
    min_stars_for_google: 4,
  });

  // Atsiliepimų duomenys
  const [feedbacks, setFeedbacks] = useState([
    { id: 1, name: 'Tomas A.', rating: 5, comment: 'Puikus aptarnavimas ir labai greitas darbas!', date: 'Prieš 2 val.', sentToGoogle: true },
    { id: 2, name: 'Rūta M.', rating: 4, comment: 'Viskas patiko, tik reikėjo šiek tiek palaukti.', date: 'Prieš 1 d.', sentToGoogle: true },
    { id: 3, name: 'Anonimas', rating: 2, comment: 'Ilgas laukimo laikas.', date: 'Prieš 3 d.', sentToGoogle: false }
  ]);

  // QR Vertinimo puslapio būsenos
  const [userRating, setUserRating] = useState<number>(0);
  const [userComment, setUserComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReviewSubmit = () => {
    if (userRating === 0) return;
    const newEntry = {
      id: Date.now(),
      name: 'Klientas (QR)',
      rating: userRating,
      comment: userComment || 'Be komentaro',
      date: 'Tiesiog dabar',
      sentToGoogle: userRating >= business.min_stars_for_google,
    };
    setFeedbacks([newEntry, ...feedbacks]);
    setReviewSubmitted(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userComment);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAuthModal(false);
    setPage('overview');
  };

  // LANDING PUSLAPIS
  if (page === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative">
        <header className="flex justify-between items-center p-6 border-b border-slate-800 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white"><Sparkles size={18} /></span>
            <span className="text-lg font-bold">Review<span className="text-blue-500">Flow</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setAuthMode('login'); setShowAuthModal(true); }} 
              className="text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Prisijungti
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} 
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Išbandyti nemokamai
            </button>
          </div>
        </header>

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
              <button 
                onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
              >
                Pradėti nemokamai <ArrowRight size={18} />
              </button>
            </div>
          </section>

          <section className="py-20 border-t border-slate-900">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">KAIP TAI VEIKIA</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
                Išmanus atsiliepimų filtras ir valdymo panelė
              </h2>
              <p className="text-slate-400">
                Apsaugokite savo verslo reputaciją internete ir automatizuokite teigiamų atsiliepimų rinkimą.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 font-bold flex items-center justify-center mb-4 border border-blue-500/20">
                  1
                </div>
                <h3 className="text-xl font-bold text-white mb-2">QR kodo nuskaitymas</h3>
                <p className="text-slate-400 text-sm">
                  Klientas skenuoja QR kodą ant stalo, sąskaitos ar kortelės ir patenka į jūsų firminį atsiliepimų puslapį.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 font-bold flex items-center justify-center mb-4 border border-blue-500/20">
                  2
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Išmanus filtravimas ★★★★★</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Sistemos reakcija priklauso nuo kliento palikto įvertinimo žvaigždutėmis:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                    <span className="font-bold text-amber-400">4–5 ★</span>
                    <span>Nukreipiama tiesiai į <b>Google Review</b></span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                    <span className="font-bold text-amber-400">1–3 ★</span>
                    <span>Atsiliepimas siunčiamas tik <b>jums privačiai</b></span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl relative">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 font-bold flex items-center justify-center mb-4 border border-blue-500/20">
                  3
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Valdymo panelė (Dashboard)</h3>
                <p className="text-slate-400 text-sm">
                  Stebėkite visą statistiką vienoje vietoje: nuskaitymų skaičių, gautus įvertinimus ir greitai spręskite privačias klientų pastabas.
                </p>
              </div>
            </div>
          </section>

          <section className="py-12 border-t border-slate-900">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Aiški kainodara</h2>
              <p className="text-slate-400">Jokių slaptų mokesčių. Galite atsisakyti bet kada.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: 'Startas', price: '19', desc: 'Mažoms įmonėms ir individualiems meistrams.', features: ['1 vieta / adresas', 'Nereiboti QR nuskaitymai', 'Pagrindinė analitika'] },
                { name: 'Pro Verslas', price: '39', desc: 'Augantiems verslams su komanda.', features: ['Iki 5 vietų', 'Google Review integracija', 'Išplėstinė analitika'], popular: true },
                { name: 'Maksimalus', price: '79', desc: 'Tinklams ir didelėms įmonėms.', features: ['Neapribotos vietos', 'API prieiga', 'Asmeninis vadybininkas'] }
              ].map(plan => (
                <div key={plan.name} className={`bg-slate-900 border rounded-2xl p-8 flex flex-col justify-between relative ${plan.popular ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-800'}`}>
                  {plan.popular && <span className="absolute -top-3 right-6 bg-blue-600 text-xs font-bold uppercase px-3 py-1 rounded-full text-white">Populiariausias</span>}
                  <div>
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-slate-400 text-sm mb-6">{plan.desc}</p>
                    <div className="text-4xl font-extrabold mb-6">€{plan.price} <span className="text-sm font-normal text-slate-500">/mėn</span></div>
                    <ul className="space-y-3 mb-8 text-sm text-slate-300">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2"><Check size={16} className="text-blue-400" /> {f}</li>
                      ))}
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setAuthMode('register'); setShowAuthModal(true); }} 
                    className={`w-full py-3 rounded-xl font-semibold text-center transition ${plan.popular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
                  >
                    Pasirinkti
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* PRISIJUNGIMO / REGISTRACIJOS LANGAS (MODAL) */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-2xl relative shadow-2xl">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {authMode === 'login' ? 'Prisijungti prie paskyros' : 'Sukurti paskyrą'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {authMode === 'login' ? 'Įveskite savo duomenis prisijungimui' : 'Pradėkite rinkti atsiliepimus jau šiandien'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">El. paštas</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-3 text-slate-500" />
                    <input 
                      type="email" 
                      required
                      placeholder="vardas@imone.lt" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Slaptažodis</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-3 text-slate-500" />
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm shadow-lg shadow-blue-600/20"
                >
                  {authMode === 'login' ? 'Prisijungti' : 'Registruotis'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-400">
                {authMode === 'login' ? (
                  <p>
                    Neturite paskyros?{' '}
                    <button 
                      onClick={() => setAuthMode('register')} 
                      className="text-blue-400 font-semibold hover:underline"
                    >
                      Registruokitės
                    </button>
                  </p>
                ) : (
                  <p>
                    Jau turite paskyrą?{' '}
                    <button 
                      onClick={() => setAuthMode('login')} 
                      className="text-blue-400 font-semibold hover:underline"
                    >
                      Prisijunkite
                    </button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DEMO VIEŠAS QR PUSLAPIS
  if (page === 'public_review') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center relative shadow-2xl">
          <button onClick={() => setPage('overview')} className="absolute top-4 right-4 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg">
            Atgal į skydelį
          </button>

          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-lg shadow-blue-500/20">
            {business.name[0]}
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{business.name}</h2>
          <p className="text-xs text-slate-400 mb-6">Įvertinkite savo patirtį šiandien!</p>

          {!reviewSubmitted ? (
            <div className="space-y-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setUserRating(star)} className="p-1 hover:scale-110 transition">
                    <Star size={36} className={star <= userRating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                  </button>
                ))}
              </div>

              {userRating > 0 && (
                <div className="space-y-4 text-left">
                  <textarea
                    rows={3}
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    placeholder={userRating >= business.min_stars_for_google ? 'Kas jums patiko?' : 'Ką galėtume pataisyti?'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  <button onClick={handleReviewSubmit} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition text-sm shadow-lg shadow-blue-600/20">
                    Siųsti įvertinimą
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {userRating >= business.min_stars_for_google ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <ThumbsUp size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ačiū už puikų įvertinimą!</h3>
                  <p className="text-xs text-slate-400">Padėkite kitiems mus rasti – įkelkite šį atsiliepimą ir į Google Maps!</p>
                  {userComment && (
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 flex justify-between items-center gap-2">
                      <span className="truncate italic">"{userComment}"</span>
                      <button onClick={copyToClipboard} className="text-blue-400 flex items-center gap-1 shrink-0 font-semibold">
                        <Copy size={12} /> {copied ? 'Nukopijuota!' : 'Kopijuoti'}
                      </button>
                    </div>
                  )}
                  
                  <a 
                    href={business.google_review_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl transition text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/5 border border-slate-200"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Paskelbti Google Review</span>
                    <ExternalLink size={16} className="text-slate-500 ml-auto" />
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ačiū už jūsų pastabas</h3>
                  <p className="text-xs text-slate-400">Jūsų atsiliepimas išsiųstas tiesiogiai vadovui. Dėsime visas pastangas pasitaisyti!</p>
                </div>
              )}
              <button onClick={() => { setReviewSubmitted(false); setUserRating(0); setUserComment(''); }} className="text-xs text-slate-500 underline pt-4">
                Bandyti dar kartą (Demo)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Valdymo panelė (SaaS App)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-white"><Sparkles size={16} /></span>
              <span className="font-bold">Review<span className="text-blue-500">Flow</span></span>
            </div>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenu(false)}><X size={20} /></button>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-xl flex items-center gap-3 mb-6 border border-slate-700/50">
            <span className="w-8 h-8 rounded-lg bg-blue-600 font-bold flex items-center justify-center text-white">{business.name[0]}</span>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">{business.name}</div>
              <div className="text-xs text-slate-400 truncate">{business.category}</div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'overview', label: 'Apžvalga', icon: LayoutDashboard },
              { id: 'feedback', label: 'Atsiliepimai', icon: MessageSquare },
              { id: 'qr', label: 'QR Kodai', icon: QrCode },
              { id: 'analytics', label: 'Analitika', icon: BarChart3 },
              { id: 'locations', label: 'Vietos', icon: MapPin },
              { id: 'settings', label: 'Nustatymai', icon: Settings },
              { id: 'billing', label: 'Mokėjimai', icon: Zap },
            ].map(item => (
              <button key={item.id} onClick={() => { setPage(item.id as any); setMobileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button onClick={() => setPage('public_review')} className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
            <Eye size={14} /> Testuoti QR puslapį
          </button>
          <button onClick={() => setPage('landing')} className="hover:text-white flex items-center gap-1"><LogOut size={16} /> Atsijungti</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur sticky top-0 z-30">
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
          <div className="text-sm font-medium text-slate-400">SaaS Valdymas</div>
          <button onClick={() => setPage('public_review')} className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-600/20 transition flex items-center gap-1.5">
            <Eye size={14} /> Išbandyti QR vertinimą
          </button>
        </header>

        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {page === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">APŽVALGA</span>
                  <h1 className="text-3xl font-extrabold text-white mt-1">Sveiki grįžę, {business.name}</h1>
                  <p className="text-sm text-slate-400 mt-1">Štai kas vyksta jūsų klientų atsiliepimų sistemoje.</p>
                </div>
                <button onClick={() => setPage('qr')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 self-start md:self-auto">
                  <Plus size={16} /> Naujas QR kodas
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'QR nuskaitymai', value: '1,248', change: '+14.2% šį mėnesį', icon: ScanLine },
                  { label: 'Gauti atsiliepimai', value: feedbacks.length.toString(), change: '+8.1% šį mėnesį', icon: MessageSquare },
                  { label: 'Vid. įvertinimas', value: '4.9 / 5', change: '+0.2 šį mėnesį', icon: Star },
                  { label: 'Google paspaudimai', value: feedbacks.filter(f => f.sentToGoogle).length.toString(), change: '+22.5% šį mėnesį', icon: Globe2 }
                ].map((s, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-slate-400 font-medium">{s.label}</span>
                      <span className="p-2 rounded-xl bg-slate-800 text-blue-400"><s.icon size={18} /></span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                    <div className="text-xs text-emerald-400 font-medium">{s.change}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {page === 'qr' && (
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">QR Kodų Generavimas</h1>
              <p className="text-sm text-slate-400 mb-8">Nuskenavęs šį QR kodą klientas pateks tiesiai į jūsų įmonės vertinimo puslapį.</p>

              <div className="grid md:grid-cols-2 gap-8 items-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-xl">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl font-bold text-xl flex items-center justify-center mb-3">
                    {business.name[0]}
                  </div>
                  <h3 className="font-bold text-lg text-white mb-1">{business.name}</h3>
                  <p className="text-xs text-slate-400 mb-6">Įvertinkite mūsų paslaugas!</p>

                  <div className="bg-white p-4 rounded-2xl border-4 border-slate-800 shadow-inner">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}?biz=${business.id}`}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-4">Skenuokite kameros programėle</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                    <h4 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Išmanus filtravimas aktyvus
                    </h4>
                    <ul className="text-xs text-slate-400 space-y-2">
                      <li>• <b>{business.min_stars_for_google}–5 ★★★★★</b> : Klientas nukreipiamas į <b>Google Review</b>.</li>
                      <li>• <b>1–{business.min_stars_for_google - 1} ★☆☆☆☆</b> : Atsiliepimas nukreipiamas <b>privačiai vadovui</b>.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <label className="block text-xs font-semibold text-slate-400 mb-2">Kliento vertinimo nuoroda (Link):</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}?biz=${business.id}`}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                      />
                      <button
                        onClick={() => setPage('public_review')}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl font-semibold shrink-0 transition"
                      >
                        Išbandyti
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {page === 'feedback' && (
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Atsiliepimai</h1>
              <p className="text-sm text-slate-400 mb-6">Visi gauti klientų vertinimai ir jų filtravimo būsena.</p>
              <div className="space-y-3">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <span className="flex items-center text-amber-400 text-xs gap-1"><Star size={14} fill="currentColor" /> {item.rating}.0</span>
                        {item.sentToGoogle ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">Nukreipta į Google</span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">Privatu vadovui</span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm">{item.comment}</p>
                    </div>
                    <span className="text-xs text-slate-500">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 'settings' && (
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Nustatymai</h1>
              <p className="text-sm text-slate-400 mb-8">Valdykite Google Review filtravimo taisykles ir profilio informaciją.</p>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl space-y-6">
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">Atsiliepimų Filtravimo Riba (Review Gating)</h3>
                  <p className="text-xs text-slate-400 mb-4">Pasirinkite, nuo kiek žvaigždučių klientui bus rodomas tiesioginis mygtukas į Google Review.</p>
                  
                  <select
                    value={business.min_stars_for_google}
                    onChange={(e) => setBusiness({ ...business, min_stars_for_google: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={5}>Tik 5 ★★★★★ (Maksimali apsauga)</option>
                    <option value={4}>Nuo 4 ★★★★☆ (Rekomenduojama)</option>
                    <option value={3}>Nuo 3 ★★★☆☆</option>
                    <option value={1}>Rodyti visiems (Be filtravimo)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Jūsų Google Review puslapio nuoroda (URL)</label>
                  <input
                    type="text"
                    value={business.google_review_url}
                    onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {page === 'billing' && (
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Mokėjimai ir Stripe</h1>
              <p className="text-sm text-slate-400 mb-6">Valdykite savo prenumeratą.</p>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400">Dabartinis planas</span>
                    <h3 className="text-xl font-bold text-white">Pro Verslas (€39/mėn)</h3>
                  </div>
                  <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    Tvarkyti prenumeratą (Stripe)
                  </button>
                </div>
              </div>
            </div>
          )}

          {(page === 'analytics' || page === 'locations') && (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-1">Skiltis ruošiama</h3>
              <p className="text-sm text-slate-400">Duomenys bus matomi prijungus Supabase duomenų bazę.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}