import { Sparkles, ArrowRight } from 'lucide-react';

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
          <a 
            href="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white transition"
          >
            Prisijungti
          </a>
          <a 
            href="/register" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            Išbandyti nemokamai
          </a>
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
            <a 
              href="/register" 
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
            >
              Pradėti nemokamai <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}