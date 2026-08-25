'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Globe2, LayoutDashboard, LogOut, MapPin, 
  Menu, MessageSquare, Plus, QrCode, ScanLine, Settings, Sparkles, Star, X, Zap, Loader2 
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState<'overview' | 'feedback' | 'qr' | 'analytics' | 'locations' | 'settings' | 'billing'>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [business, setBusiness] = useState({
    id: 'demo-id',
    name: 'Mano Verslas',
    category: 'Grožio paslaugos',
    address: 'Gedimino pr. 1, Vilnius',
    brand_color: '#2563eb',
    google_review_url: 'https://g.page/r/example/review',
    min_stars_for_google: 4,
  });

  const [feedbacks, setFeedbacks] = useState([
    { id: 1, name: 'Tomas A.', rating: 5, comment: 'Puikus aptarnavimas ir labai greitas darbas!', date: 'Prieš 2 val.', sentToGoogle: true },
    { id: 2, name: 'Rūta M.', rating: 4, comment: 'Viskas patiko, tik reikėjo šiek tiek palaukti.', date: 'Prieš 1 d.', sentToGoogle: true },
    { id: 3, name: 'Anonimas', rating: 2, comment: 'Ilgas laukimo laikas.', date: 'Prieš 3 d.', sentToGoogle: false }
  ]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

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
            <span className="w-8 h-8 rounded-lg bg-blue-600 font-bold flex items-center justify-center text-white">
              {user?.email?.[0].toUpperCase() || 'V'}
            </span>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">{user?.email || business.name}</div>
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
              <button 
                key={item.id} 
                onClick={() => { setPage(item.id as any); setMobileMenu(false); }} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
              >
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button onClick={handleLogout} className="hover:text-white flex items-center gap-1.5 text-rose-400 font-semibold">
            <LogOut size={16} /> Atsijungti
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur sticky top-0 z-30">
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
          <div className="text-sm font-medium text-slate-400">Valdymo panelė</div>
        </header>

        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {page === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">APŽVALGA</span>
                  <h1 className="text-3xl font-extrabold text-white mt-1">Sveiki grįžę!</h1>
                  <p className="text-sm text-slate-400 mt-1">Prijungta paskyra: {user?.email}</p>
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

          {page === 'feedback' && (
            <div>
              <h1 className="text-3xl font-extrabold text-white mb-2">Atsiliepimai</h1>
              <p className="text-sm text-slate-400 mb-6">Visi gauti klientų vertinimai.</p>
              <div className="space-y-3">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-sm">{item.name}</span>
                        <span className="flex items-center text-amber-400 text-xs gap-1"><Star size={14} fill="currentColor" /> {item.rating}.0</span>
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl">
                <label className="block text-xs font-semibold text-slate-400 mb-2">Google Review URL</label>
                <input
                  type="text"
                  value={business.google_review_url}
                  onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}