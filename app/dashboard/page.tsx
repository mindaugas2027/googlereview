'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Globe2, LayoutDashboard, LogOut, MapPin,
  Menu, MessageSquare, Plus, QrCode, ScanLine, Settings, Sparkles, Star, X, Zap, Loader2, ArrowUpRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Feedback = {
  id: string | number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  createdAt?: string;
  sentToGoogle: boolean;
};

const getTrialDaysLeft = (startedAt?: string) => {
  if (!startedAt) return 14;
  const elapsedDays = Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 14 - elapsedDays);
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [page, setPage] = useState<'overview' | 'feedback' | 'qr' | 'analytics' | 'locations' | 'settings' | 'billing'>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [feedbackSort, setFeedbackSort] = useState<'newest' | 'oldest'>('newest');

  const [business, setBusiness] = useState({
    name: '',
    brand_color: '#2563eb',
    google_review_url: '',
    google_min_rating: 4,
    logo_url: '',
  });

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const trialDaysLeft = getTrialDaysLeft(user?.user_metadata?.trial_started_at);
  const subscriptionExpired = trialDaysLeft === 0;
  const trialTone = trialDaysLeft >= 8
    ? { text: '#137333', background: '#e6f4ea', border: '#b7dfc1' }
    : trialDaysLeft >= 4
      ? { text: '#b06000', background: '#fef7e0', border: '#f9df96' }
      : { text: '#c5221f', background: '#fce8e6', border: '#f5b7b1' };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
      } else {
        setUser(session.user);
        const savedBusinessName = session.user.user_metadata?.company_name;
        const savedGoogleReviewUrl = session.user.user_metadata?.google_review_url;
        const savedGoogleMinRating = Number(session.user.user_metadata?.google_min_rating) || 4;
        const savedLogoUrl = session.user.user_metadata?.logo_url || '';
        setBusiness((currentBusiness) => ({
          ...currentBusiness,
          name: savedBusinessName || currentBusiness.name,
          google_review_url: savedGoogleReviewUrl || currentBusiness.google_review_url,
          google_min_rating: savedGoogleMinRating,
          logo_url: savedLogoUrl,
        }));
        const { data: savedFeedbacks } = await supabase
          .from('feedbacks')
          .select('id, name, rating, comment, created_at, sent_to_google')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (savedFeedbacks) {
          setFeedbacks(savedFeedbacks.map((feedback) => ({
            ...feedback,
            date: new Date(feedback.created_at).toLocaleDateString('lt-LT'),
            createdAt: feedback.created_at,
            sentToGoogle: feedback.sent_to_google,
          })));
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

  const saveGoogleReviewUrl = async () => {
    if (!user || !business.google_review_url.trim()) {
      setProfileMessage('Įrašykite Google atsiliepimų nuorodą.');
      return;
    }

    const googleReviewUrl = business.google_review_url.trim();
    try {
      const parsedUrl = new URL(googleReviewUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setProfileMessage('Įrašykite galiojančią Google Review nuorodą.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ data: { google_review_url: googleReviewUrl } });
    setProfileMessage(error ? error.message : 'Google atsiliepimų nuoroda išsaugota.');
    if (!error) setBusiness({ ...business, google_review_url: googleReviewUrl });
  };

  const saveGoogleMinRating = async (value: number) => {
    setBusiness((currentBusiness) => ({ ...currentBusiness, google_min_rating: value }));
    await supabase.auth.updateUser({ data: { google_min_rating: value } });
  };

  const uploadLogo = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Įkelkite paveikslėlį.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage('Logotipas turi būti mažesnis nei 2 MB.');
      return;
    }
    const extension = file.name.split('.').pop() || 'png';
    const path = `${user.id}/logo-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setProfileMessage(`Logotipo įkelti nepavyko: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from('logos').getPublicUrl(path);
    const { error: saveError } = await supabase.auth.updateUser({ data: { logo_url: data.publicUrl } });
    if (saveError) {
      setProfileMessage(saveError.message);
      return;
    }
    setBusiness((currentBusiness) => ({ ...currentBusiness, logo_url: data.publicUrl }));
    setProfileMessage('Logotipas įkeltas.');
  };

  const renewSubscription = async () => {
    if (!user) return;
    const renewedAt = new Date().toISOString();
    const { data, error } = await supabase.auth.updateUser({
      data: { trial_started_at: renewedAt },
    });
    if (error) {
      setProfileMessage(error.message);
      return;
    }
    if (data.user) setUser(data.user);
    setPage('overview');
    setProfileMessage('Prenumerata pratęsta 14 dienų.');
  };

  const reviewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/review?business=${encodeURIComponent(user?.id || '')}&google=${encodeURIComponent(business.google_review_url)}&threshold=${business.google_min_rating}&logo=${encodeURIComponent(business.logo_url)}`
    : '';

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
              <span className="font-bold"><span className="text-[#1a73e8]">Get</span>review</span>
            </div>
            <button className="md:hidden text-[#5f6368]" onClick={() => setMobileMenu(false)}><X size={20} /></button>
          </div>

          <div className="bg-[#f1f3f4] p-3 rounded-xl mb-6 border border-[#dadce0]">
            <div className="font-semibold text-sm truncate mb-3">{business.name || 'Nustatykite įmonės pavadinimą'}</div>
            <div className="rounded-lg px-3 py-2" style={{ color: trialTone.text, backgroundColor: trialTone.background, border: `1px solid ${trialTone.border}` }}>
              <div className="text-[11px] font-bold uppercase tracking-wide">Nemokamas planas</div>
              <div className="text-sm font-bold mt-0.5">{trialDaysLeft > 0 ? `Liko ${trialDaysLeft} d.` : 'Bandomasis laikotarpis baigėsi'}</div>
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
                onClick={() => { if (!subscriptionExpired || item.id === 'billing') { setPage(item.id as any); setMobileMenu(false); } }}
                disabled={subscriptionExpired && item.id !== 'billing'}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? 'bg-[#1a73e8] text-white' : subscriptionExpired && item.id !== 'billing' ? 'text-[#bdc1c6] cursor-not-allowed' : 'text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4]'}`}
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
          {subscriptionExpired && page !== 'billing' && (
            <div className="max-w-2xl mx-auto mt-10 bg-white border border-[#f5b7b1] rounded-2xl p-8 text-center shadow-sm">
              <span className="h-14 w-14 rounded-2xl bg-[#fce8e6] text-[#c5221f] grid place-items-center mx-auto mb-5"><Zap size={25} /></span>
              <h1 className="text-2xl font-extrabold mb-3">Apgailestaujame, prenumerata baigėsi</h1>
              <p className="text-sm text-[#5f6368] leading-relaxed max-w-md mx-auto">Norėdami toliau naudotis analitika, atsiliepimais ir kitomis funkcijomis, pratęskite prenumeratą mokėjimų skiltyje.</p>
              <button onClick={() => setPage('billing')} className="mt-6 bg-[#1a73e8] hover:bg-[#1769d1] text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Pratęsti prenumeratą</button>
            </div>
          )}

          {page === 'billing' && (
            <div className="max-w-2xl">
              <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">PRENUMERATA</span>
              <h1 className="text-3xl font-extrabold mt-1 mb-2">Mokėjimai</h1>
              <p className="text-sm text-[#5f6368] mb-6">Valdykite savo Getreview prenumeratą.</p>
              <div className={`rounded-2xl p-6 border ${subscriptionExpired ? 'bg-[#fce8e6] border-[#f5b7b1]' : 'bg-[#e6f4ea] border-[#b7dfc1]'}`}>
                <div className="flex items-center justify-between gap-4 mb-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#5f6368]">Dabartinis planas</p><h2 className="text-xl font-extrabold mt-1">Nemokamas planas</h2></div><span className={`text-sm font-bold ${subscriptionExpired ? 'text-[#c5221f]' : 'text-[#137333]'}`}>{subscriptionExpired ? 'Baigėsi' : `Liko ${trialDaysLeft} d.`}</span></div>
                <p className="text-sm text-[#3c4043]">{subscriptionExpired ? 'Pratęskite prenumeratą ir vėl gaukite prieigą prie visų savo įmonės duomenų.' : 'Jūsų bandomasis laikotarpis galioja. Pasibaigus laikotarpiui čia galėsite jį pratęsti.'}</p>
                <button onClick={renewSubscription} className="mt-6 w-full bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl py-3 text-sm font-semibold">{subscriptionExpired ? 'Pratęsti 14 dienų' : 'Pratęsti prenumeratą'}</button>
              </div>
              {profileMessage && <p className="text-sm text-[#137333] mt-4">{profileMessage}</p>}
            </div>
          )}

          {!subscriptionExpired && page === 'qr' && (
            <div className="max-w-3xl">
              <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">KLIENTŲ SRAUTAS</span>
              <h1 className="text-3xl font-extrabold mt-1 mb-2">QR Kodai</h1>
              <p className="text-sm text-[#5f6368] mb-6">Leiskite klientams greitai įvertinti jūsų paslaugą telefonu.</p>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm grid md:grid-cols-[180px_1fr] gap-7 items-center">
                {business.google_review_url ? <div className="bg-white border border-[#dadce0] rounded-xl p-3 w-fit"><QRCodeSVG value={reviewUrl} size={150} includeMargin /></div> : <div className="h-[180px] w-[180px] rounded-xl border border-dashed border-[#b7bdc4] bg-[#f8fafd] grid place-items-center text-center p-4"><span className="text-xs font-semibold text-[#80868b]">QR kodas atsiras čia</span></div>}
                <div><h2 className="font-bold text-lg mb-2">Jūsų klientų vertinimo QR kodas</h2><p className="text-sm text-[#5f6368] leading-relaxed mb-4">Šis QR kodas priklauso jūsų įmonei ir naudoja jūsų „Vietos“ skiltyje įvestą Google Review URL. Klientas nuskenuoja kodą, pasirenka žvaigždutes ir gauna atitinkamą pasiūlymą.</p>{!business.google_review_url ? <p className="text-sm text-[#b06000] bg-[#fef7e0] border border-[#f9df96] rounded-lg p-3">Pirmiausia pridėkite Google Review URL skiltyje „Vietos“.</p> : <button onClick={() => navigator.clipboard?.writeText(reviewUrl)} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 py-2.5 rounded-xl text-sm font-semibold">Kopijuoti kliento nuorodą</button>}</div>
              </div>
            </div>
          )}

          {!subscriptionExpired && page !== 'billing' && (
            <div>
          {page === 'overview' && (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">APŽVALGA</span>
                  <h1 className="text-3xl font-extrabold text-[#202124] mt-1">{user?.user_metadata?.first_name ? `Sveiki, ${user.user_metadata.first_name}` : 'Sveiki grįžę!'}</h1>
                </div>
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

              <div className="grid lg:grid-cols-[1.45fr_0.85fr] gap-5 mb-8">
                <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-6"><div><h2 className="font-bold text-lg">Atsiliepimų dinamika</h2><p className="text-sm text-[#5f6368] mt-1">Augimas per paskutines 6 savaites</p></div><button onClick={() => setPage('analytics')} className="text-xs font-semibold text-[#1a73e8] flex items-center gap-1">Visa analitika <ArrowUpRight size={14} /></button></div>
                  <div className="flex items-end gap-3 h-44 border-b border-l border-[#dadce0] px-3 pb-0">{[34, 47, 42, 62, 58, 76, 91].map((height, index) => <div key={index} className="flex-1 flex flex-col justify-end gap-2"><div className="text-center text-[10px] text-[#80868b]">{[18, 24, 21, 32, 29, 41, 48][index]}</div><div className="bg-[#1a73e8] rounded-t-md min-h-2" style={{ height: `${height}%` }} /></div>)}</div>
                  <div className="flex justify-between text-xs text-[#80868b] mt-3 px-1"><span>Lie 08</span><span>Lie 15</span><span>Lie 22</span><span>Lie 29</span><span>Rgp 05</span><span>Rgp 12</span><span>Dabar</span></div>
                </div>
                <div className="bg-[#202124] rounded-2xl p-6 text-white shadow-sm"><div className="flex items-center justify-between mb-5"><div><p className="text-xs uppercase tracking-wider text-[#9aa0a6]">ŠIO MĖNESIO TIKSLAS</p><h2 className="font-bold text-lg mt-1">Gauti 60 atsiliepimų</h2></div><span className="text-[#81c995] text-sm font-bold">80%</span></div><div className="h-2 bg-[#5f6368] rounded-full overflow-hidden mb-3"><div className="h-full w-4/5 bg-[#81c995] rounded-full" /></div><p className="text-sm text-[#bdc1c6]">48 iš 60 atsiliepimų surinkta</p><button onClick={() => setPage('qr')} className="mt-6 w-full bg-white text-[#202124] hover:bg-[#f1f3f4] rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"><QrCode size={16} /> Dalintis QR kodu</button></div>
              </div>

              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
                <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm"><div className="flex items-center justify-between mb-5"><div><h2 className="font-bold text-lg">Naujausi atsiliepimai</h2><p className="text-sm text-[#5f6368] mt-1">Sekite klientų nuotaiką realiu laiku</p></div><button onClick={() => setPage('feedback')} className="text-xs font-semibold text-[#1a73e8]">Peržiūrėti visus</button></div><div className="space-y-4"><div className="flex gap-3"><span className="h-9 w-9 rounded-full bg-[#e6f4ea] text-[#137333] grid place-items-center text-sm font-bold">A</span><div className="flex-1"><div className="flex justify-between gap-3"><span className="font-semibold text-sm">Aistė P.</span><span className="text-xs text-[#80868b]">prieš 2 val.</span></div><div className="flex items-center gap-1 text-[#fbbc04] text-xs mt-1"><Star size={13} fill="currentColor" /> 5.0</div><p className="text-sm text-[#3c4043] mt-1">„Puikus aptarnavimas, tikrai sugrįšiu!“</p></div></div><div className="flex gap-3"><span className="h-9 w-9 rounded-full bg-[#e8f0fe] text-[#1a73e8] grid place-items-center text-sm font-bold">M</span><div className="flex-1"><div className="flex justify-between gap-3"><span className="font-semibold text-sm">Mantas J.</span><span className="text-xs text-[#80868b]">vakar</span></div><div className="flex items-center gap-1 text-[#fbbc04] text-xs mt-1"><Star size={13} fill="currentColor" /> 5.0</div><p className="text-sm text-[#3c4043] mt-1">„Greita, paprasta ir profesionalu.“</p></div></div></div></div>
                <div className="bg-[#e8f0fe] border border-[#c6dafc] rounded-2xl p-6"><span className="h-10 w-10 rounded-xl bg-white text-[#1a73e8] grid place-items-center mb-5"><Sparkles size={19} /></span><h2 className="font-bold text-lg mb-2">Jūsų reputacija auga</h2><p className="text-sm text-[#3c4043] leading-relaxed">Šį mėnesį klientai dažniau renkasi jus dėl aukšto įvertinimo. Tęskite QR kampaniją, kad išlaikytumėte tempą.</p><button onClick={() => setPage('analytics')} className="mt-5 text-sm font-bold text-[#1a73e8] flex items-center gap-1">Sužinoti daugiau <ArrowUpRight size={15} /></button></div>
              </div>
            </>
          )}

          {page === 'feedback' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"><h1 className="text-3xl font-extrabold text-[#202124]">Atsiliepimai</h1><select value={feedbackSort} onChange={(event) => setFeedbackSort(event.target.value as 'newest' | 'oldest')} className="bg-white border border-[#dadce0] rounded-xl px-3 py-2.5 text-sm text-[#3c4043]"><option value="newest">Naujausi pirmi</option><option value="oldest">Seniausi pirmi</option></select></div>
              <div className="space-y-3">
                {feedbacks.length === 0 && <div className="bg-white border border-[#dadce0] rounded-2xl p-6 sm:p-8 shadow-sm"><div className="flex items-start gap-4 mb-7"><span className="h-12 w-12 shrink-0 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center"><MessageSquare size={23} /></span><div><h2 className="font-bold text-lg">Atsiliepimai atsiras čia</h2><p className="text-sm text-[#5f6368] mt-1 max-w-lg">Kai klientai įvertins jūsų paslaugą, čia matysite jų vardus, žvaigždutes ir parašytas žinutes.</p></div></div><div className="grid sm:grid-cols-3 gap-3"><div className="rounded-xl bg-[#f8fafd] border border-[#dadce0] p-4"><div className="text-xs text-[#5f6368]">Gauti atsiliepimai</div><div className="text-2xl font-extrabold mt-2">0</div></div><div className="rounded-xl bg-[#f8fafd] border border-[#dadce0] p-4"><div className="text-xs text-[#5f6368]">Vidutinis įvertinimas</div><div className="text-2xl font-extrabold mt-2">—</div></div><div className="rounded-xl bg-[#f8fafd] border border-[#dadce0] p-4"><div className="text-xs text-[#5f6368]">Nukreipta į Google</div><div className="text-2xl font-extrabold mt-2">0</div></div></div><div className="mt-5 rounded-xl bg-[#f1f3f4] px-4 py-3 text-sm text-[#5f6368] flex items-center gap-2"><Star size={16} className="text-[#f29900]" /> Geri įvertinimai bus pažymėti kaip nukreipti į Google, o pastabos liks privačios vadovui.</div></div>}
                {[...feedbacks].sort((first, second) => feedbackSort === 'newest' ? new Date(second.createdAt || second.date).getTime() - new Date(first.createdAt || first.date).getTime() : new Date(first.createdAt || first.date).getTime() - new Date(second.createdAt || second.date).getTime()).map((item) => (
                  <div key={item.id} className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><div className="flex items-start gap-4"><span className={`h-11 w-11 shrink-0 rounded-full grid place-items-center text-sm font-bold ${item.sentToGoogle ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>{item.name[0]?.toUpperCase() || '?'}</span><div className="min-w-0 flex-1"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div className="flex flex-wrap items-center gap-3"><span className="font-bold text-[#202124]">{item.name}</span><span className="flex items-center text-[#f29900] text-sm gap-1">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= item.rating ? 'currentColor' : 'none'} />)} <span className="text-[#5f6368] ml-1">{item.rating}/5</span></span></div><span className="text-xs text-[#80868b]">{item.date}</span></div><div className={`inline-flex text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-1 mt-3 ${item.sentToGoogle ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>{item.sentToGoogle ? 'Nukreipta į Google' : 'Privati žinutė vadovui'}</div><p className="text-[#3c4043] text-sm leading-relaxed mt-3">{item.comment}</p></div></div></div>
                ))}
              </div>
            </div>
          )}

          {page === 'analytics' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8"><div><span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">DUOMENYS</span><h1 className="text-3xl font-extrabold mt-1">Analitika</h1><p className="text-sm text-[#5f6368] mt-1">Supraskite, kas labiausiai veikia jūsų reputaciją.</p></div><select className="bg-white border border-[#dadce0] rounded-xl px-3 py-2 text-sm text-[#3c4043]"><option>Šis mėnuo</option><option>Praėjęs mėnuo</option></select></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[{ label: 'Konversija į atsiliepimą', value: '18.6%', change: '+4.2%' }, { label: 'Teigiami vertinimai', value: '92%', change: '+6.8%' }, { label: 'Atsakas į problemas', value: '2.4 val.', change: '-31%' }, { label: 'Nukreipta į Google', value: feedbacks.filter((feedback) => feedback.sentToGoogle).length.toString(), change: 'realūs paspaudimai' }].map((stat) => <div key={stat.label} className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><p className="text-xs text-[#5f6368]">{stat.label}</p><div className="flex items-end justify-between mt-3"><span className="text-2xl font-extrabold">{stat.value}</span><span className="text-xs font-bold text-[#137333]">{stat.change}</span></div></div>)}</div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm"><h2 className="font-bold text-lg">Vertinimų pasiskirstymas</h2><p className="text-sm text-[#5f6368] mt-1 mb-6">Šio mėnesio gautų atsiliepimų kokybė</p>{[{ stars: '5 žvaigždutės', value: 78, color: 'bg-[#34a853]' }, { stars: '4 žvaigždutės', value: 14, color: 'bg-[#8ab4f8]' }, { stars: '3 žvaigždutės', value: 5, color: 'bg-[#fbbc04]' }, { stars: '1–2 žvaigždutės', value: 3, color: 'bg-[#ea4335]' }].map((row) => <div key={row.stars} className="flex items-center gap-3 mb-4 text-sm"><span className="w-28 text-[#5f6368]">{row.stars}</span><div className="flex-1 h-2 bg-[#f1f3f4] rounded-full overflow-hidden"><div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.value}%` }} /></div><span className="w-10 text-right font-semibold">{row.value}%</span></div>)}</div>
            </div>
          )}

          {page === 'locations' && (
            <div>
              <h1 className="text-3xl font-extrabold text-[#202124] mb-2">Vietos</h1>
              <p className="text-sm text-[#5f6368] mb-6">Nustatykite, kur klientai bus nukreipiami po gero įvertinimo.</p>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 max-w-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-5"><span className="h-10 w-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center"><Globe2 size={19} /></span><div><h2 className="font-bold">Google Business Profile</h2><p className="text-xs text-[#5f6368] mt-1">Pridėkite savo Google atsiliepimų nuorodą.</p></div></div>
                <label className="block text-xs font-semibold text-[#5f6368] mb-2" htmlFor="google-review-url">Google Review URL</label>
                <input id="google-review-url" type="url" placeholder="https://g.page/r/.../review" value={business.google_review_url} onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })} className="w-full bg-white border border-[#dadce0] rounded-xl p-3 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]" />
                <p className="text-xs text-[#80868b] mt-2">Šią nuorodą rasite savo Google Business Profile paskyroje.</p>
                <button onClick={saveGoogleReviewUrl} className="mt-5 bg-[#1a73e8] hover:bg-[#1769d1] text-white px-4 py-2.5 rounded-xl text-sm font-semibold">Išsaugoti nuorodą</button>
                {profileMessage && <p className="text-sm text-[#137333] mt-4">{profileMessage}</p>}
              </div>
            </div>
          )}

          {page === 'settings' && (
            <div>
              <h1 className="text-3xl font-extrabold text-[#202124] mb-2">Profilis ir nustatymai</h1>
              <p className="text-sm text-[#5f6368] mb-6">Tvarkykite paskyros ir įmonės informaciją.</p>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 max-w-xl space-y-6 shadow-sm">
                <div>
                  <div className="block text-xs font-semibold text-[#5f6368] mb-2">Įmonės logotipas</div>
                  <p className="text-xs text-[#80868b] mb-4">Įkelkite logotipą, kuris bus rodomas klientų vertinimo puslapyje.</p>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center overflow-hidden border border-[#c6dafc]">{business.logo_url ? <img src={business.logo_url} alt="Įmonės logotipas" className="h-full w-full object-contain" /> : <Sparkles size={24} />}</div>
                    <label className="cursor-pointer bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#3c4043] px-4 py-2.5 rounded-xl text-sm font-semibold">Įkelti logotipą<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadLogo(file); event.target.value = ''; }} /></label>
                  </div>
                </div>
                <div>
                  <div className="block text-xs font-semibold text-[#5f6368] mb-2">Google Review pasiūlymo slenkstis</div>
                  <p className="text-xs text-[#80868b] mb-4">Pasirinkite, nuo kiek žvaigždučių klientui rodyti Google Review pasiūlymą.</p>
                  <div className="rounded-xl bg-[#f8fafd] border border-[#dadce0] p-4">
                    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3" aria-label="Pasirinkite Google Review slenkstį">
                      {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`Nuo ${value} žvaigždučių`} onClick={() => saveGoogleMinRating(value)} className="p-1.5 rounded-lg hover:bg-[#e8f0fe] transition"><Star size={30} className={value <= business.google_min_rating ? 'text-[#f29900]' : 'text-[#dadce0]'} fill={value <= business.google_min_rating ? 'currentColor' : 'none'} /></button>)}
                    </div>
                    <div className="text-center text-sm font-bold text-[#b06000]">Nuo {business.google_min_rating} žvaigždučių</div>
                  </div>
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
          )}
        </div>
      </main>
    </div>
  );
}