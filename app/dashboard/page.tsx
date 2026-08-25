'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Globe2, LayoutDashboard, LogOut, MapPin, 
  Menu, MessageSquare, Plus, QrCode, ScanLine, Settings, Sparkles, Star, X, Zap, Loader2 
} from 'lucide-react';

type Feedback = {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  sentToGoogle: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [page, setPage] = useState<'overview' | 'feedback' | 'qr' | 'analytics' | 'locations' | 'settings' | 'billing'>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);

  const [business, setBusiness] = useState({
    name: '',
    brand_color: '#2563eb',
    google_review_url: '',
  });

  const [feedbacks] = useState<Feedback[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const savedBusinessName = session.user.user_metadata?.company_name;
        if (savedBusinessName) {
          setBusiness((currentBusiness) => ({ ...currentBusiness, name: savedBusinessName }));
        }
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const saveBusinessName = async () => {
    if (!user || !business.name.trim()) {
      setProfileMessage('Įrašykite įmonės pavadinimą.');
      return;
    }

    const companyName = business.name.trim();
    const { error } = await supabase.auth.updateUser({ data: { company_name: companyName } });
    setProfileMessage(error ? error.message : 'Įmonės pavadinimas išsaugotas.');
    if (!error) setBusiness({ ...business, name: companyName });
  };

  const changePassword = async () => {
    if (password.length < 6) {
      setProfileMessage('Naujas slaptažodis turi būti bent 6 simbolių.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setProfileMessage(error ? error.message : 'Slaptažodis pakeistas.');
    if (!error) setPassword('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center text-[#202124]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#202124] flex font-sans">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#dadce0] p-6 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1a73e8] text-white"><Sparkles size={16} /></span>
              <span className="font-bold">Review<span className="text-[#1a73e8]">Flow</span></span>
            </div>
            <button className="md:hidden text-[#5f6368]" onClick={() => setMobileMenu(false)}><X size={20} /></button>
          </div>

          <div className="bg-[#f1f3f4] p-3 rounded-xl flex items-center gap-3 mb-6 border border-[#dadce0]">
            <span className="w-8 h-8 rounded-lg bg-[#1a73e8] font-bold flex items-center justify-center text-white">
              {user?.email?.[0].toUpperCase() || 'V'}
            </span>
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate">{user?.email || 'Profilis'}</div>
              <div className="text-xs text-[#5f6368] truncate">{business.name || 'Nustatykite įmonės pavadinimą'}</div>
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4]'}`}
              >
                <item.icon size={18} /> {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#dadce0] flex items-center justify-between text-xs text-[#5f6368]">
          <button onClick={handleLogout} className="hover:text-[#c5221f] flex items-center gap-1.5 text-[#ea4335] font-semibold">
            <LogOut size={16} /> Atsijungti
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-[#dadce0] px-6 flex items-center justify-between bg-white/90 backdrop-blur sticky top-0 z-30">
          <button className="md:hidden text-[#5f6368]" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
          <div className="text-sm font-medium text-[#5f6368]">Valdymo panelė</div>
        </header>

        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {page === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">APŽVALGA</span>
                  <h1 className="text-3xl font-extrabold text-[#202124] mt-1">{business.name || 'Sveiki grįžę!'}</h1>
                  <p className="text-sm text-[#5f6368] mt-1">Prijungta paskyra: {user?.email}</p>
                </div>
                <button onClick={() => setPage('qr')} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 self-start md:self-auto">
                  <Plus size={16} /> Naujas QR kodas
                </button>
              </div>

              {!business.name && (
                <div className="bg-[#e8f0fe] border border-[#c6dafc] rounded-2xl p-5 mb-8">
                  <h2 className="font-bold text-[#202124] mb-1">Pradėkite nuo įmonės profilio</h2>
                  <p className="text-sm text-[#5f6368] mb-4">Įrašykite įmonės pavadinimą, kad galėtumėte pradėti rinkti atsiliepimus.</p>
                  <button onClick={() => setPage('settings')} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 py-2 rounded-xl text-sm font-semibold">Nustatyti įmonės pavadinimą</button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'QR nuskaitymai', value: '1,248', change: '+14.2% šį mėnesį', icon: ScanLine },
                  { label: 'Gauti atsiliepimai', value: feedbacks.length.toString(), change: '+8.1% šį mėnesį', icon: MessageSquare },
                  { label: 'Vid. įvertinimas', value: '4.9 / 5', change: '+0.2 šį mėnesį', icon: Star },
                  { label: 'Google paspaudimai', value: feedbacks.filter(f => f.sentToGoogle).length.toString(), change: '+22.5% šį mėnesį', icon: Globe2 }
                ].map((s, i) => (
                  <div key={i} className="bg-white border border-[#dadce0] p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[#5f6368] font-medium">{s.label}</span>
                      <span className="p-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8]"><s.icon size={18} /></span>
                    </div>
                    <div className="text-2xl font-bold text-[#202124] mb-1">{s.value}</div>
                    <div className="text-xs text-[#137333] font-medium">{s.change}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {page === 'feedback' && (
            <div>
              <h1 className="text-3xl font-extrabold text-[#202124] mb-2">Atsiliepimai</h1>
              <p className="text-sm text-[#5f6368] mb-6">Visi gauti klientų vertinimai.</p>
              <div className="space-y-3">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 bg-white border border-[#dadce0] rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[#202124] text-sm">{item.name}</span>
                        <span className="flex items-center text-[#fbbc04] text-xs gap-1"><Star size={14} fill="currentColor" /> {item.rating}.0</span>
                      </div>
                      <p className="text-[#3c4043] text-sm">{item.comment}</p>
                    </div>
                    <span className="text-xs text-[#5f6368]">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 'settings' && (
            <div>
              <h1 className="text-3xl font-extrabold text-[#202124] mb-2">Profilis ir nustatymai</h1>
              <p className="text-sm text-[#5f6368] mb-6">Tvarkykite paskyros ir įmonės informaciją.</p>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 max-w-xl space-y-6 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] mb-2">El. paštas</label>
                  <input type="email" value={user?.email || ''} readOnly className="w-full bg-[#f1f3f4] border border-[#dadce0] rounded-xl p-3 text-sm text-[#5f6368]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] mb-2">Įmonės pavadinimas</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Įrašykite įmonės pavadinimą"
                      value={business.name}
                      onChange={(e) => setBusiness({ ...business, name: e.target.value })}
                      className="min-w-0 flex-1 bg-white border border-[#dadce0] rounded-xl p-3 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                    <button onClick={saveBusinessName} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 rounded-xl text-sm font-semibold">Išsaugoti</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5f6368] mb-2">Naujas slaptažodis</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Mažiausiai 6 simboliai"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="min-w-0 flex-1 bg-white border border-[#dadce0] rounded-xl p-3 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                    <button onClick={changePassword} className="bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] px-4 rounded-xl text-sm font-semibold">Pakeisti</button>
                  </div>
                </div>
                {profileMessage && <p className="text-sm text-[#1a73e8]">{profileMessage}</p>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}