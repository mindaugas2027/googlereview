'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EMPTY_STATS, FEEDBACK_PAGE_SIZE, normalizeStats, ratingCount, type BusinessStats } from '@/lib/stats';
import {
  BarChart3, Download, Eye, Globe2, LayoutDashboard, LogOut, MapPin,
  Menu, MessageSquare, QrCode, ScanLine, Send, Settings, Sparkles, Star, X, Zap, Loader2, ArrowUpRight
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

type FeedbackRow = {
  id: string | number;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  sent_to_google?: boolean | null;
};

type DashboardUser = {
  id: string;
  email?: string;
  user_metadata: {
    company_name?: string;
    first_name?: string;
    phone?: string;
    google_review_url?: string;
    google_min_rating?: number;
    logo_url?: string;
    monthly_goal?: number;
    facebook_url?: string;
    instagram_url?: string;
    linkedin_url?: string;
    trial_started_at?: string;
    trial_end?: string;
    trial_days?: number;
    [key: string]: unknown;
  };
};

type DashboardPageId = 'overview' | 'feedback' | 'qr' | 'analytics' | 'locations' | 'settings' | 'billing';

const DASHBOARD_NAV_ITEMS: Array<{ id: DashboardPageId; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: 'Apžvalga', icon: LayoutDashboard },
  { id: 'feedback', label: 'Atsiliepimai', icon: MessageSquare },
  { id: 'qr', label: 'QR Kodai', icon: QrCode },
  { id: 'analytics', label: 'Analitika', icon: BarChart3 },
  { id: 'locations', label: 'Vietos', icon: MapPin },
  { id: 'settings', label: 'Nustatymai', icon: Settings },
  { id: 'billing', label: 'Mokėjimai', icon: Zap },
];

const getTrialDaysLeft = (meta?: { trial_end?: string; trial_started_at?: string; trial_days?: number }) => {
  if (!meta) return 14;
  const DAY = 24 * 60 * 60 * 1000;
  if (meta.trial_end) {
    const end = new Date(meta.trial_end).getTime();
    if (!Number.isNaN(end)) return Math.max(0, Math.ceil((end - Date.now()) / DAY));
  }
  const start = meta.trial_started_at ? new Date(meta.trial_started_at).getTime() : Date.now();
  const days = Number(meta.trial_days) || 14;
  return Math.max(0, Math.ceil((start + days * DAY - Date.now()) / DAY));
};

const normalizeGoogleReviewUrl = (value: string) => {
  const trimmedValue = value.trim();
  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
};

const ADMIN_EMAIL = 'mindaugas2027@gmail.com';

const mapFeedback = (feedback: FeedbackRow): Feedback => ({
  ...feedback,
  date: new Date(feedback.created_at).toLocaleDateString('lt-LT'),
  createdAt: feedback.created_at,
  sentToGoogle: feedback.sent_to_google || feedback.comment === 'Klientas nukreiptas į Google Review.',
});

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [password, setPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [page, setPage] = useState<DashboardPageId>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [viewAsId, setViewAsId] = useState<string | null>(null);
  const [viewAsEmail, setViewAsEmail] = useState('');
  const [feedbackSort, setFeedbackSort] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<number | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState(60);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [business, setBusiness] = useState({
    name: '',
    brand_color: '#2563eb',
    google_review_url: '',
    google_min_rating: 4,
    logo_url: '',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
  });

  const [stats, setStats] = useState<BusinessStats>(EMPTY_STATS);
  const [pagedFeedbacks, setPagedFeedbacks] = useState<Feedback[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPageLoading, setFeedbackPageLoading] = useState(false);
  const [recentFeedbackDates, setRecentFeedbackDates] = useState<string[]>([]);
  const [monthlyFeedbackCount, setMonthlyFeedbackCount] = useState(0);

  // Viso laikotarpio agregatai iš inkrementinių skaitiklių (business_stats lentelės,
  // kurią palaiko Supabase trigger'iai) — frontend'e jokių pilnų sąrašų skaičiavimų.
  const statsTotal = stats.total_feedbacks;
  const averageRating = statsTotal ? (stats.rating_sum / statsTotal).toFixed(1) : '—';
  const googleRedirects = stats.google_redirects;
  const reviewConversion = stats.total_qr_scans ? Math.round((statsTotal / stats.total_qr_scans) * 100) : 0;
  const safeMinRating = Math.min(5, Math.max(1, Math.round(Number(business.google_min_rating)) || 4));
  const positiveFeedbacks = [5, 4, 3, 2, 1].filter((rating) => rating >= safeMinRating).reduce((total, rating) => total + ratingCount(stats, rating), 0);
  const positiveRate = statsTotal ? Math.round((positiveFeedbacks / statsTotal) * 100) : 0;
  const monthlyFeedbacks = monthlyFeedbackCount;
  const monthlyGoalProgress = Math.min(Math.round((monthlyFeedbacks / monthlyGoal) * 100), 100);
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratingCount(stats, rating),
  }));
  const maxRatingCount = Math.max(...ratingDistribution.map((item) => item.count), 1);
  const totalFeedbackPages = Math.max(1, Math.ceil(feedbackTotal / FEEDBACK_PAGE_SIZE));
  const feedbackPageNumbers = Array.from(new Set(
    [1, feedbackPage - 1, feedbackPage, feedbackPage + 1, totalFeedbackPages]
      .filter((value) => value >= 1 && value <= totalFeedbackPages),
  )).sort((first, second) => first - second);
  const feedbacksByWeek = Array.from({ length: 7 }, (_, index) => {
    const weekAge = 6 - index;
    // eslint-disable-next-line react-hooks/purity -- savaitės laiko langas skaičiuojamas renderio metu pagal dabartinę datą
    const intervalEnd = Date.now() - weekAge * 7 * 24 * 60 * 60 * 1000;
    const intervalStart = intervalEnd - 7 * 24 * 60 * 60 * 1000;
    return recentFeedbackDates.filter((createdAt) => {
      const createdAtTime = new Date(createdAt).getTime();
      return createdAtTime >= intervalStart && createdAtTime < intervalEnd;
    }).length;
  });
  const feedbackChartMax = Math.max(...feedbacksByWeek, 1);

  const trialDaysLeft = getTrialDaysLeft(user?.user_metadata);
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
        return;
      }

      // Admin peržiūros režimas: /dashboard?view_as=<userId>
      const viewAsParam = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('view_as')
        : null;

      // Administratorius be peržiūros parametro nukreipiamas į admin panelę
      if (!viewAsParam && session.user.email?.toLowerCase() === ADMIN_EMAIL) {
        router.replace('/admin');
        return;
      }

      if (viewAsParam && session.user.email?.toLowerCase() === ADMIN_EMAIL) {
        const response = await fetch(`/api/admin/users/${viewAsParam}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.user) {
          router.replace('/admin');
          return;
        }
        const metadata = payload.user.user_metadata || {};
        setViewAsId(payload.user.id);
        setViewAsEmail(payload.user.email || '');
        setUser({ id: payload.user.id, email: payload.user.email, user_metadata: metadata });
        setBusiness((currentBusiness) => ({
          ...currentBusiness,
          name: metadata.company_name || currentBusiness.name,
          google_review_url: metadata.google_review_url ? normalizeGoogleReviewUrl(metadata.google_review_url) : currentBusiness.google_review_url,
          google_min_rating: Number(metadata.google_min_rating) || 4,
          logo_url: metadata.logo_url || '',
          facebook_url: metadata.facebook_url || '',
          instagram_url: metadata.instagram_url || '',
          linkedin_url: metadata.linkedin_url || '',
        }));
        setMonthlyGoal(Math.max(1, Number(metadata.monthly_goal) || 60));
        setStats(normalizeStats(payload.stats));
        setRecentFeedbackDates(Array.isArray(payload.recent_feedback_dates) ? payload.recent_feedback_dates.map(String) : []);
        setMonthlyFeedbackCount(Number(payload.monthly_feedback_count) || 0);
        setLoading(false);
        return;
      }

      setUser(session.user);
      const savedBusinessName = session.user.user_metadata?.company_name;
      const savedGoogleReviewUrl = session.user.user_metadata?.google_review_url;
      const savedGoogleMinRating = Number(session.user.user_metadata?.google_min_rating) || 4;
      const savedLogoUrl = session.user.user_metadata?.logo_url || '';
      const savedMonthlyGoal = Number(session.user.user_metadata?.monthly_goal) || 60;
      const savedFacebookUrl = session.user.user_metadata?.facebook_url || '';
      const savedInstagramUrl = session.user.user_metadata?.instagram_url || '';
      const savedLinkedinUrl = session.user.user_metadata?.linkedin_url || '';
      setBusiness((currentBusiness) => ({
        ...currentBusiness,
        name: savedBusinessName || currentBusiness.name,
        google_review_url: savedGoogleReviewUrl ? normalizeGoogleReviewUrl(savedGoogleReviewUrl) : currentBusiness.google_review_url,
        google_min_rating: savedGoogleMinRating,
        logo_url: savedLogoUrl,
        facebook_url: savedFacebookUrl,
        instagram_url: savedInstagramUrl,
        linkedin_url: savedLinkedinUrl,
      }));
      setMonthlyGoal(Math.max(1, savedMonthlyGoal));
      // Lengvi duomenys apžvalgai: paskutinių 49 d. dati (grafikui) ir šio mėnesio
      // atsiliepimų kiekis — skaičiuojama Supabase pusėje, eilučių negrąžina
      const sinceIso = new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentRows } = await supabase
        .from('feedbacks')
        .select('created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', sinceIso)
        .order('created_at');
      setRecentFeedbackDates((recentRows || []).map((row) => row.created_at));
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: monthCount } = await supabase
        .from('feedbacks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', monthStart.toISOString());
      setMonthlyFeedbackCount(monthCount ?? 0);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  // Admin API užklausos, kai peržiūrimas kliento dashboard
  const adminApiRequest = async (
    method: 'PATCH' | 'POST',
    body: Record<string, unknown> | FormData,
  ): Promise<{ error: { message: string } | null; payload?: { ok?: boolean; error?: string; logo_url?: string; user_metadata?: Record<string, unknown> } }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !viewAsId) return { error: { message: 'Administratoriaus sesija nerasta.' } };
    const options: RequestInit = { method };
    if (body instanceof FormData) {
      options.headers = { Authorization: `Bearer ${session.access_token}` };
      options.body = body;
    } else {
      options.headers = { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
      options.body = JSON.stringify(body);
    }
    const response = await fetch(`/api/admin/users/${viewAsId}`, options);
    const payload = await response.json().catch(() => ({}));
    return response.ok
      ? { error: null, payload }
      : { error: { message: payload.error || 'Veiksmas nepavyko.' }, payload };
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const saveBusinessName = async () => {
    if (!business.name.trim()) {
      setProfileMessage('Įrašykite įmonės pavadinimą.');
      return;
    }

    const companyName = business.name.trim();
    if (viewAsId) {
      const result = await adminApiRequest('PATCH', { action: 'update_metadata', metadata: { company_name: companyName } });
      setProfileMessage(result.error ? result.error.message : 'Įmonės pavadinimas išsaugotas.');
      if (!result.error) setBusiness({ ...business, name: companyName });
      return;
    }
    if (!user) return;

    const { error } = await supabase.auth.updateUser({ data: { company_name: companyName } });
    setProfileMessage(error ? error.message : 'Įmonės pavadinimas išsaugotas.');
    if (!error) setBusiness({ ...business, name: companyName });
  };

  const changePassword = async () => {
    if (password.length < 6) {
      setProfileMessage('Naujas slaptažodis turi būti bent 6 simbolių.');
      return;
    }

    if (viewAsId) {
      const result = await adminApiRequest('PATCH', { action: 'change_password', password });
      setProfileMessage(result.error ? result.error.message : 'Slaptažodis pakeistas.');
      if (!result.error) setPassword('');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setProfileMessage(error ? error.message : 'Slaptažodis pakeistas.');
    if (!error) setPassword('');
  };

  const saveGoogleReviewUrl = async () => {
    if (!business.google_review_url.trim()) {
      setProfileMessage('Įrašykite Google atsiliepimų nuorodą.');
      return;
    }

    const googleReviewUrl = normalizeGoogleReviewUrl(business.google_review_url);
    try {
      const parsedUrl = new URL(googleReviewUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setProfileMessage('Įrašykite galiojančią Google Review nuorodą.');
      return;
    }
    if (viewAsId) {
      const result = await adminApiRequest('PATCH', { action: 'update_metadata', metadata: { google_review_url: googleReviewUrl } });
      setProfileMessage(result.error ? result.error.message : 'Google atsiliepimų nuoroda išsaugota.');
      if (!result.error) setBusiness({ ...business, google_review_url: googleReviewUrl });
      return;
    }

    const { error } = await supabase.auth.updateUser({ data: { google_review_url: googleReviewUrl } });
    setProfileMessage(error ? error.message : 'Google atsiliepimų nuoroda išsaugota.');
    if (!error) setBusiness({ ...business, google_review_url: googleReviewUrl });
  };

  const saveGoogleMinRating = async (value: number) => {
    setBusiness((currentBusiness) => ({ ...currentBusiness, google_min_rating: value }));
    if (viewAsId) {
      await adminApiRequest('PATCH', { action: 'update_metadata', metadata: { google_min_rating: value } });
      return;
    }
    await supabase.auth.updateUser({ data: { google_min_rating: value } });
  };

  const saveMonthlyGoal = async (value: number) => {
    const safeValue = Math.max(1, Math.min(10000, value || 1));
    setMonthlyGoal(safeValue);
    if (viewAsId) {
      await adminApiRequest('PATCH', { action: 'update_metadata', metadata: { monthly_goal: safeValue } });
      return;
    }
    await supabase.auth.updateUser({ data: { monthly_goal: safeValue } });
  };

  const deleteAllFeedback = async () => {
    if (!viewAsId && !user) return;
    if (statsTotal === 0) return;
    const confirmed = window.confirm('Ar tikrai norite ištrinti visus atsiliepimus? Šio veiksmo atšaukti nebus galima.');
    if (!confirmed) return;

    const resetList = () => {
      setPagedFeedbacks([]);
      setFeedbackTotal(0);
      setFeedbackPage(1);
    };

    if (viewAsId) {
      const result = await adminApiRequest('PATCH', { action: 'delete_feedbacks' });
      if (result.error) {
        setProfileMessage(`Atsiliepimų ištrinti nepavyko: ${result.error.message}`);
        return;
      }
      resetList();
      await fetchStats(viewAsId);
      return;
    }

    if (!user) return;
    const { error } = await supabase.from('feedbacks').delete().eq('user_id', user.id);
    if (error) {
      setProfileMessage(`Atsiliepimų ištrinti nepavyko: ${error.message}`);
      return;
    }
    resetList();
    await fetchStats(user.id);
  };

  const uploadLogo = async (file: File) => {
    if (!viewAsId && !user) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage('Įkelkite paveikslėlį.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileMessage('Logotipas turi būti mažesnis nei 2 MB.');
      return;
    }

    if (viewAsId) {
      const formData = new FormData();
      formData.append('file', file);
      const result = await adminApiRequest('POST', formData);
      if (result.error) {
        setProfileMessage(result.error.message);
        return;
      }
      setBusiness((currentBusiness) => ({ ...currentBusiness, logo_url: result.payload?.logo_url || currentBusiness.logo_url }));
      setProfileMessage('Logotipas įkeltas.');
      return;
    }

    if (!user) return;
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
    if (viewAsId) {
      const result = await adminApiRequest('PATCH', { action: 'renew_trial', days: 14 });
      if (result.error) {
        setProfileMessage(result.error.message);
        return;
      }
            setUser((currentUser) => currentUser
        ? { ...currentUser, user_metadata: { ...currentUser.user_metadata, trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), trial_days: 14 } }
        : currentUser);
      setPage('billing');
      setProfileMessage('Prenumerata pratęsta 14 dienų.');
      return;
    }
    if (!user) return;
    const { data, error } = await supabase.auth.updateUser({
      data: { trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
    });
    if (error) {
      setProfileMessage(error.message);
      return;
    }
        if (data.user) setUser(data.user);
    setPage('billing');
    setProfileMessage('Prenumerata pratęsta 14 dienų.');
  };

  const reviewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/review?business=${encodeURIComponent(user?.id || '')}&google=${encodeURIComponent(business.google_review_url)}&threshold=${business.google_min_rating}&logo=${encodeURIComponent(business.logo_url)}`
    : '';

  const shareReviewLink = async () => {
    if (!reviewUrl) return;
    if (navigator.share) {
      await navigator.share({ title: `${business.name || 'Įmonės'} atsiliepimas`, text: 'Pasidalinkite savo patirtimi.', url: reviewUrl });
      return;
    }
    await navigator.clipboard?.writeText(reviewUrl);
  };

  /** Inkrementinių skaitiklių atnaujinimas iš backend'o (viso laikotarpio statistika). */
  const fetchStats = async (businessId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const params = new URLSearchParams();
    if (businessId) params.set('business', businessId);
    const query = params.toString();
    try {
      const response = await fetch(`/api/stats${query ? `?${query}` : ''}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.stats) setStats(normalizeStats(payload.stats));
    } catch {
      // skaitiklius taip pat atnaujins Realtime — tyliai praleidžiame
    }
  };

  // Pirminis skaitiklių užkrovimas prisijungus (admino view_as tai jau padaryta checkUser'e)
  useEffect(() => {
    if (!user?.id || viewAsId) return;
    void fetchStats(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kraunama kai pasikeičia vartotojas
  }, [user?.id, viewAsId]);

  /** Lengvų apžvalgos duomenų (savaitės grafiko dati + mėnesio kiekis) atnaujinimas. */
  const refreshLightData = async (businessId: string) => {
    if (viewAsId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const response = await fetch(`/api/admin/users/${businessId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload) return;
        setStats(normalizeStats(payload.stats));
        setRecentFeedbackDates(Array.isArray(payload.recent_feedback_dates) ? payload.recent_feedback_dates.map(String) : []);
        setMonthlyFeedbackCount(Number(payload.monthly_feedback_count) || 0);
      } catch {
        // tyliai praleidžiame
      }
      return;
    }
    const sinceIso = new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRows } = await supabase
      .from('feedbacks')
      .select('created_at')
      .eq('user_id', businessId)
      .gte('created_at', sinceIso)
      .order('created_at');
    setRecentFeedbackDates((recentRows || []).map((row) => row.created_at));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('feedbacks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', businessId)
      .gte('created_at', monthStart.toISOString());
    setMonthlyFeedbackCount(count ?? 0);
  };

  /** Krauna TIK vieno puslapio (21) atsiliepimus iš serverio — ne visą sąrašą. */
  const loadFeedbackPage = async (
    pageNumber: number = feedbackPage,
    sort: typeof feedbackSort = feedbackSort,
    ratingFilter: number | null = feedbackRatingFilter,
  ) => {
    const businessId = viewAsId || user?.id;
    if (!businessId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setFeedbackPageLoading(true);
    try {
      const params = new URLSearchParams({ business: businessId, page: String(pageNumber), sort });
      if (ratingFilter !== null) params.set('rating', String(ratingFilter));
      const response = await fetch(`/api/feedbacks?${params.toString()}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `Nepavyko įkelti atsiliepimų (${response.status}).`);
      const rows = Array.isArray(payload?.feedbacks) ? payload.feedbacks : [];
      setPagedFeedbacks(rows.map(mapFeedback));
      setFeedbackTotal(Number(payload?.total) || 0);
      setFeedbackPage(Math.max(1, Number(payload?.page) || pageNumber));
    } catch (cause) {
      setPagedFeedbacks([]);
      setFeedbackTotal(0);
      setProfileMessage(cause instanceof Error ? cause.message : 'Nepavyko įkelti atsiliepimų.');
    } finally {
      setFeedbackPageLoading(false);
    }
  };

  // Naujausios loader'io ir puslapio versijos nuorodos Realtime atnaujinimams —
  // refs atnaujinami efektuose, kad negalėtų react-hooks/refs taisyklė
  const loadFeedbackPageRef = useRef(loadFeedbackPage);
  const pageRef = useRef(page);
  useEffect(() => {
    loadFeedbackPageRef.current = loadFeedbackPage;
  });
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // „Atsiliepimai" skiltis kraunama tik atidaryus ją — perjungus puslapį,
  // pakeitus rikiavimą ar filtrą iš serverio kraunamos tik 21 eilutės
  useEffect(() => {
    if (page !== 'feedback') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sąmoningai krauname šio tab'o puslapį tik atidarius jį
    void loadFeedbackPage(feedbackPage, feedbackSort, feedbackRatingFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kraunama reaguojant į puslapio/rikiavimo/filtro pasikeitimus
  }, [page, feedbackPage, feedbackSort, feedbackRatingFilter]);

  // Inkrementinis atnaujinimas: Supabase trigger'is pakeičia business_stats eilutę,
  // o Realtime momentaliai perduoda naujus skaitiklius į frontend'ą (be perkrovimo)
  useEffect(() => {
    if (!user?.id || viewAsId) return;
    const channel = supabase
      .channel(`business-stats-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'business_stats', filter: `user_id=eq.${user.id}` }, (payload) => {
        setStats(normalizeStats(payload.new));
        void refreshLightData(user.id);
        if (pageRef.current === 'feedback') loadFeedbackPageRef.current();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prenumerata priklauso tik nuo vartotojo
  }, [user?.id, viewAsId]);

  const downloadPrintPdf = async () => {
    if (!reviewUrl || pdfDownloading) return;
    setPdfDownloading(true);
    setPdfError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }
      const response = await fetch(`/api/qr/pdf${viewAsId ? `?business=${encodeURIComponent(viewAsId)}` : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Nepavyko sugeneruoti PDF (${response.status}).`);
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'getreview-qr-spaudai.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : 'Nepavyko atsisiųsti PDF.');
    } finally {
      setPdfDownloading(false);
    }
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
            {DASHBOARD_NAV_ITEMS
              .filter(item => !subscriptionExpired || item.id === 'billing')
              .map(item => (
                <button 
                  key={item.id} 
                  onClick={() => { setPage(item.id); setMobileMenu(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${page === item.id ? 'bg-[#1a73e8] text-white' : 'text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4]'}`}
                >
                  <item.icon size={18} /> {item.label}
                </button>
              ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#dadce0] flex items-center justify-between text-xs text-[#5f6368]">
          {viewAsId ? (
            <button onClick={() => router.push('/admin')} className="hover:text-[#1a73e8] flex items-center gap-1.5 font-semibold">
              <LogOut size={16} /> Grįžti į admin
            </button>
          ) : (
            <button onClick={handleLogout} className="hover:text-[#c5221f] flex items-center gap-1.5 text-[#ea4335] font-semibold">
              <LogOut size={16} /> Atsijungti
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-[#dadce0] px-6 flex items-center justify-between bg-white/90 backdrop-blur sticky top-0 z-30">
          <button className="md:hidden text-[#5f6368]" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
          <div className="text-sm font-medium text-[#5f6368]">{viewAsId ? 'Valdymo panelė · administratoriaus peržiūra' : 'Valdymo panelė'}</div>
        </header>

        <div className="p-6 md:p-8 flex-1 max-w-6xl w-full mx-auto">
          {viewAsId && (
            <div className="mb-8 bg-[#202124] text-white rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="h-10 w-10 shrink-0 rounded-xl bg-[#1a73e8] grid place-items-center"><Eye size={19} /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#8ab4f8]">Administratoriaus peržiūra</p>
                  <p className="text-sm font-semibold truncate">{business.name || viewAsEmail} · matote taip, kaip mato klientas</p>
                </div>
              </div>
              <button onClick={() => router.push('/admin')} className="bg-white text-[#202124] hover:bg-[#f1f3f4] px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap">Grįžti į admin panelę</button>
            </div>
          )}

                    {subscriptionExpired && page !== 'billing' && (
            <div className="max-w-2xl mx-auto mt-10 bg-white border border-[#f5b7b1] rounded-2xl p-8 text-center shadow-sm">
              <span className="h-14 w-14 rounded-2xl bg-[#fce8e6] text-[#c5221f] grid place-items-center mx-auto mb-5"><Zap size={25} /></span>
              <h1 className="text-2xl font-extrabold mb-3">Prenumerata baigėsi</h1>
              <p className="text-sm text-[#5f6368] leading-relaxed max-w-md mx-auto">Pratęskite prenumeratą mokėjimų skiltyje, kad galėtumėte toliau naudotis sistema.</p>
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
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm grid md:grid-cols-[240px_1fr] gap-7 items-center">
                {business.google_review_url ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white border border-[#dadce0] rounded-xl p-3 w-fit"><QRCodeSVG value={reviewUrl} size={150} includeMargin /></div>
                    <button onClick={downloadPrintPdf} disabled={pdfDownloading} className="mt-3 w-full bg-[#1a73e8] hover:bg-[#1769d1] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-2.5 px-3 text-sm font-semibold flex items-center justify-center gap-2">
                      {pdfDownloading ? (<><Loader2 size={15} className="animate-spin" /> Generuojama…</>) : (<><Download size={15} /> Atsisiųsti spaudai (PDF)</>)}
                    </button>
                    {pdfError && <p className="text-xs text-[#c5221f] mt-2 text-center">{pdfError}</p>}
                  </div>
                ) : <div className="h-[180px] w-[180px] rounded-xl border border-dashed border-[#b7bdc4] bg-[#f8fafd] grid place-items-center text-center p-4"><span className="text-xs font-semibold text-[#80868b]">QR kodas atsiras čia</span></div>}
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
                  { label: 'QR nuskaitymai', value: stats.total_qr_scans.toString(), change: 'viso nuskaitymų', icon: ScanLine },
                  { label: 'Gauti atsiliepimai', value: statsTotal.toString(), change: `${reviewConversion}% konversija`, icon: MessageSquare },
                  { label: 'Vid. įvertinimas', value: statsTotal ? `${averageRating} / 5` : '—', change: 'viso laikotarpio', icon: Star },
                  { label: 'Google paspaudimai', value: googleRedirects.toString(), change: 'viso nukreipimų', icon: Globe2 }
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
                  <div className="flex items-end gap-3 h-44 border-b border-l border-[#dadce0] px-3 pb-0">{feedbacksByWeek.map((count, index) => { const height = count ? Math.max(8, Math.round((count / feedbackChartMax) * 140)) : 3; return <div key={index} className="flex-1 flex flex-col justify-end gap-2"><div className="text-center text-[10px] text-[#80868b]">{count}</div><div className="bg-[#1a73e8] rounded-t-md min-h-1" style={{ height: `${height}px` }} /></div> })}</div>
                  <div className="flex justify-between text-xs text-[#80868b] mt-3 px-1"><span>Prieš 6 sav.</span><span>Prieš 3 sav.</span><span>Ši savaitė</span></div>
                </div>
                <div className="bg-[#202124] rounded-2xl p-6 text-white shadow-sm"><div className="flex items-center justify-between mb-5"><div><p className="text-xs uppercase tracking-wider text-[#9aa0a6]">ŠIO MĖNESIO TIKSLAS</p><h2 className="font-bold text-lg mt-1">Gauti {monthlyGoal} atsiliepimų</h2></div><span className="text-[#81c995] text-sm font-bold">{monthlyGoalProgress}%</span></div><div className="h-2 bg-[#5f6368] rounded-full overflow-hidden mb-3"><div className="h-full bg-[#81c995] rounded-full" style={{ width: `${monthlyGoalProgress}%` }} /></div><p className="text-sm text-[#bdc1c6]">{monthlyFeedbacks} iš {monthlyGoal} šio mėnesio atsiliepimų</p><button onClick={shareReviewLink} className="mt-6 w-full bg-white text-[#202124] hover:bg-[#f1f3f4] rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"><Send size={16} /> Dalintis QR nuoroda</button></div>
              </div>

                            <div className="grid lg:grid-cols-1 gap-5">
                <div className="bg-[#e8f0fe] border border-[#c6dafc] rounded-2xl p-6"><span className="h-10 w-10 rounded-xl bg-white text-[#1a73e8] grid place-items-center mb-5"><Sparkles size={19} /></span><h2 className="font-bold text-lg mb-2">Jūsų reputacija auga</h2><p className="text-sm text-[#3c4043] leading-relaxed">Šį mėnesį klientai dažniau renkasi jus dėl aukšto įvertinimo. Tęskite QR kampaniją, kad išlaikytumėte tempą.</p><button onClick={() => setPage('analytics')} className="mt-5 text-sm font-bold text-[#1a73e8] flex items-center gap-1">Sužinoti daugiau <ArrowUpRight size={15} /></button></div>
              </div>
            </>
          )}

          {page === 'feedback' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"><div><h1 className="text-3xl font-extrabold text-[#202124]">Atsiliepimai</h1><p className="text-sm text-[#5f6368] mt-2">Klientų įvertinimai, žinutės ir nukreipimai į Google vienoje vietoje.</p></div><div className="flex items-center gap-2"><select value={feedbackSort} onChange={(event) => { setFeedbackSort(event.target.value as 'newest' | 'oldest' | 'rating-high' | 'rating-low'); setFeedbackPage(1); }} className="bg-white border border-[#dadce0] rounded-xl px-3 py-2.5 text-sm text-[#3c4043]"><option value="newest">Naujausi pirmi</option><option value="oldest">Seniausi pirmi</option><option value="rating-high">Daugiausia žvaigždučių</option><option value="rating-low">Mažiausiai žvaigždučių</option></select><button type="button" onClick={deleteAllFeedback} disabled={statsTotal === 0} className="border border-[#f5b7b1] text-[#c5221f] hover:bg-[#fce8e6] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-sm font-semibold">Ištrinti visus</button></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"><div className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><div className="text-xs text-[#5f6368]">Gauti atsiliepimai</div><div className="text-2xl font-extrabold mt-2">{statsTotal}</div></div><div className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><div className="text-xs text-[#5f6368]">Vidutinis įvertinimas</div><div className="flex items-center gap-2 mt-2"><span className="text-2xl font-extrabold">{averageRating}</span>{statsTotal > 0 && <span className="flex text-[#f29900]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= Math.round(Number(averageRating)) ? 'currentColor' : 'none'} />)}</span>}</div></div><div className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><div className="text-xs text-[#5f6368]">Nukreipta į Google</div><div className="text-2xl font-extrabold mt-2">{googleRedirects}</div></div></div>
              <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#34a853]" /><h2 className="text-sm font-bold uppercase tracking-wider text-[#5f6368]">Klientų atsiliepimai</h2></div>
              <div className="flex flex-wrap items-center gap-2 mb-4"><button type="button" onClick={() => { setFeedbackRatingFilter(null); setFeedbackPage(1); }} className={`px-3 py-2 rounded-xl text-sm font-semibold ${feedbackRatingFilter === null ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#5f6368]'}`}>Visi</button>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-label={`Rodyti ${rating} žvaigždučių atsiliepimus`} onClick={() => { setFeedbackRatingFilter(rating); setFeedbackPage(1); }} className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold ${feedbackRatingFilter === rating ? 'bg-[#f29900] text-white' : 'bg-white border border-[#dadce0] text-[#f29900]'}`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= rating ? 'currentColor' : 'none'} />)}</button>)}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {statsTotal === 0 && <div className="sm:col-span-2 xl:col-span-3 bg-white border border-[#dadce0] rounded-2xl p-6 sm:p-8 shadow-sm"><div className="flex items-start gap-4"><span className="h-12 w-12 shrink-0 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center"><MessageSquare size={23} /></span><div><h2 className="font-bold text-lg">Atsiliepimų dar nėra</h2><p className="text-sm text-[#5f6368] mt-1 max-w-lg">Kai klientai įvertins jūsų paslaugą, jų vardai, žvaigždutės ir žinutės bus rodomi šioje skiltyje.</p></div></div></div>}
                {!feedbackPageLoading && statsTotal > 0 && pagedFeedbacks.length === 0 && <div className="sm:col-span-2 xl:col-span-3 bg-white border border-dashed border-[#b7bdc4] rounded-2xl p-8 text-center text-sm text-[#5f6368]">Šiame puslapyje atsiliepimų nėra.</div>}
                {feedbackPageLoading && <div className="sm:col-span-2 xl:col-span-3 bg-white border border-[#dadce0] rounded-2xl p-6 text-center text-sm text-[#5f6368]">Įkeliama…</div>}
                {!feedbackPageLoading && pagedFeedbacks.map((item) => (
                  <div key={item.id} className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><div className="flex items-start gap-4"><span className={`h-11 w-11 shrink-0 rounded-full grid place-items-center text-sm font-bold ${item.sentToGoogle ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>{item.name[0]?.toUpperCase() || '?'}</span><div className="min-w-0 flex-1"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div className="flex flex-wrap items-center gap-3"><span className="font-bold text-[#202124]">{item.name}</span><span className="flex items-center text-[#f29900] text-sm gap-1">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill={star <= item.rating ? 'currentColor' : 'none'} />)} <span className="text-[#5f6368] ml-1">{item.rating}/5</span></span></div><span className="text-xs text-[#80868b]">{item.date}</span></div><div className={`inline-flex text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-1 mt-3 ${item.sentToGoogle ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>{item.sentToGoogle ? 'Nukreipta į Google' : 'Privati žinutė vadovui'}</div><p className="text-[#3c4043] text-sm leading-relaxed mt-3">{item.comment}</p></div></div></div>
                ))}
              </div>
              {statsTotal > 0 && totalFeedbackPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                  <span className="text-xs text-[#5f6368]">Rodoma {Math.min((feedbackPage - 1) * FEEDBACK_PAGE_SIZE + 1, feedbackTotal)}–{Math.min(feedbackPage * FEEDBACK_PAGE_SIZE, feedbackTotal)} iš {feedbackTotal}</span>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setFeedbackPage(Math.max(1, feedbackPage - 1))} disabled={feedbackPage <= 1 || feedbackPageLoading} className="border border-[#dadce0] bg-white hover:bg-[#f1f3f4] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-sm font-semibold text-[#3c4043]">Ankstesnis</button>
                    {feedbackPageNumbers.map((value, index) => {
                      const previous = feedbackPageNumbers[index - 1];
                      return (
                        <span key={value} className="flex items-center gap-1.5">
                          {previous !== undefined && value - previous > 1 && <span className="px-0.5 text-[#80868b]">…</span>}
                          <button type="button" onClick={() => setFeedbackPage(value)} disabled={feedbackPageLoading} className={`rounded-xl px-3 py-2 text-sm font-semibold ${value === feedbackPage ? 'bg-[#1a73e8] text-white' : 'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f1f3f4]'}`}>{value}</button>
                        </span>
                      );
                    })}
                    <button type="button" onClick={() => setFeedbackPage(Math.min(totalFeedbackPages, feedbackPage + 1))} disabled={feedbackPage >= totalFeedbackPages || feedbackPageLoading} className="border border-[#dadce0] bg-white hover:bg-[#f1f3f4] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-sm font-semibold text-[#3c4043]">Tolesnis</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'analytics' && (
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8"><div><span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">DUOMENYS</span><h1 className="text-3xl font-extrabold mt-1">Analitika</h1><p className="text-sm text-[#5f6368] mt-1">Viso laikotarpio statistika, skaičiuojama duomenų bazėje.</p></div><span className="inline-flex items-center rounded-full border border-[#b7dfc1] bg-[#e6f4ea] px-3 py-1.5 text-xs font-bold text-[#137333]">Visas laikotarpis</span></div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[{ label: 'Konversija į atsiliepimą', value: `${reviewConversion}%`, change: `${statsTotal} iš ${stats.total_qr_scans} nuskaitymų` }, { label: 'Teigiami vertinimai', value: `${positiveRate}%`, change: `${positiveFeedbacks} atsiliepimai virš slenksčio` }, { label: 'Atsiliepimų vidurkis', value: averageRating === '—' ? '—' : `${averageRating} / 5`, change: `${statsTotal} įvertinimai` }, { label: 'Nukreipta į Google', value: googleRedirects.toString(), change: 'realūs paspaudimai' }].map((stat) => <div key={stat.label} className="bg-white border border-[#dadce0] rounded-2xl p-5 shadow-sm"><p className="text-xs text-[#5f6368]">{stat.label}</p><div className="flex items-end justify-between mt-3"><span className="text-2xl font-extrabold">{stat.value}</span><span className="text-xs font-bold text-[#137333]">{stat.change}</span></div></div>)}</div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 shadow-sm"><h2 className="font-bold text-lg">Vertinimų pasiskirstymas</h2><p className="text-sm text-[#5f6368] mt-1 mb-6">Viso laikotarpio gautas realus klientų įvertinimų skaičius</p>{ratingDistribution.map((row) => <div key={row.rating} className="flex items-center gap-3 mb-4 text-sm"><span className="w-28 text-[#5f6368]">{row.rating} žvaigždutės</span><div className="flex-1 h-2 bg-[#f1f3f4] rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.rating >= 4 ? 'bg-[#34a853]' : row.rating === 3 ? 'bg-[#fbbc04]' : 'bg-[#ea4335]'}`} style={{ width: `${(row.count / maxRatingCount) * 100}%` }} /></div><span className="w-16 text-right font-semibold">{row.count} vnt.</span></div>)}</div>
            </div>
          )}

          {page === 'locations' && (
            <div>
              <h1 className="text-3xl font-extrabold text-[#202124] mb-2">Vietos</h1>
              <p className="text-sm text-[#5f6368] mb-6">Nustatykite, kur klientai bus nukreipiami po gero įvertinimo.</p>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-6 max-w-2xl shadow-sm">
                <div className="flex items-center gap-3 mb-5"><span className="h-10 w-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center"><Globe2 size={19} /></span><div><h2 className="font-bold">Nukreipimo nuoroda</h2><p className="text-xs text-[#5f6368] mt-1">Po gero įvertinimo klientas bus nukreiptas į šią nuorodą.</p></div></div>
                <label className="block text-xs font-semibold text-[#5f6368] mb-2" htmlFor="google-review-url">Google Review URL</label>
                <input id="google-review-url" type="url" placeholder="https://g.page/r/.../review" value={business.google_review_url} onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })} className="w-full bg-white border border-[#dadce0] rounded-xl p-3 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]" />
                <p className="text-xs text-[#80868b] mt-2">Naudokite pilną viešą nuorodą, pavyzdžiui: https://jusu-svetaine.lt</p>
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
                <div>
                  <div className="block text-xs font-semibold text-[#5f6368] mb-2">Mėnesio atsiliepimų tikslas</div>
                  <p className="text-xs text-[#80868b] mb-3">Nustatykite, kiek atsiliepimų norite surinkti per mėnesį.</p>
                  <div className="flex items-center gap-3">
                    <input type="number" min="1" max="10000" value={monthlyGoal} onChange={(event) => saveMonthlyGoal(Number(event.target.value))} className="w-32 bg-white border border-[#dadce0] rounded-xl p-3 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]" />
                    <span className="text-sm text-[#5f6368]">atsiliepimų per mėnesį</span>
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