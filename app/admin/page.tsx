'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAIL, getTrialDaysLeft } from '@/lib/admin-auth'
import { Eye, ExternalLink, Loader2, LogOut, Search, Settings, Sparkles, Users, X } from 'lucide-react'
type AdminUser = {
  id: string
  email?: string
  company_name: string
  first_name: string
  created_at: string
  last_sign_in_at?: string
  trial_started_at?: string | null
  trial_end?: string | null
  trial_days?: number | null
  monthly_goal?: number
  feedback_count: number
  google_redirects: number
  qr_scans: number
  average_rating: number | null
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'users' | 'settings'>('users')
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
    const [extendDays, setExtendDays] = useState(30)
  const [extendDate, setExtendDate] = useState('')

  const formatDateForInput = (dateStr?: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    // Naudojame vietinį laiką, kad atitiktų tai, ką vartotojas mato kalendoriuje
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email?.toLowerCase() !== ADMIN_EMAIL) { router.replace('/login'); return }
      const response = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.users)) {
        setError(payload?.error || `Serverio klaida (${response.status}). Patikrinkite, ar aplinkoje nustatytas SUPABASE_SERVICE_ROLE_KEY.`)
        return
      }
      setUsers(payload.users)
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- pradinis vartotojų sąrašo įkėlimas prisijungus
  useEffect(() => { loadUsers() }, [])

  // Saugos laikmatis: jei duomenys neatsako per 20 s, rodome klaidą vietoj amžino sukimosi ratuko
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      setError((current) => current || 'Įkeliama užtruko per ilgai. Serveryje gali trūkti SUPABASE_SERVICE_ROLE_KEY aplinkos kintamojo.')
      setLoading(false)
    }, 20000)
    return () => clearTimeout(timer)
  }, [loading])

  const filteredUsers = useMemo(() => users.filter((user) => `${user.company_name} ${user.first_name} ${user.email}`.toLowerCase().includes(query.toLowerCase())), [users, query])

  const runUserAction = async (action: 'extend_trial' | 'expire_trial' | 'delete_user', user: AdminUser, opts?: { days?: number; endDate?: string }) => {
    if (action === 'delete_user' && !window.confirm(`Ar tikrai norite ištrinti ${user.company_name} paskyrą?`)) return
    if (action === 'expire_trial' && !window.confirm(`Ar tikrai norite nutraukti ${user.company_name} prenumeratą? Klientas praras prieigą prie valdymo panelės.`)) return
    if (action === 'extend_trial' && opts?.endDate && !window.confirm(`Ar pratęsti ${user.company_name} prenumeratą iki ${opts.endDate}?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const payload = JSON.stringify({
        userId: user.id,
        action,
        days: action === 'extend_trial' ? (opts?.days ?? 30) : 30,
        ...(action === 'extend_trial' && opts?.endDate ? { endDate: opts.endDate } : {}),
      })
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: payload })
      const res = await response.json().catch(() => null)
      if (!response.ok) { setError(res?.error || `Veiksmas nepavyko (${response.status}).`); return }
      if (action === 'extend_trial') {
        const targetDate = opts?.endDate
          ? new Date(`${opts.endDate}T23:59:59`).toLocaleDateString('lt-LT')
          : new Date(Date.now() + (opts?.days ?? 30) * 24 * 60 * 60 * 1000).toLocaleDateString('lt-LT')
        setActionMessage(`${user.company_name} prenumerata pratęsta iki ${targetDate}.`)
      } else if (action === 'expire_trial') {
        setActionMessage(`${user.company_name} prenumerata nutraukta.`)
      } else {
        setActionMessage('Vartotojas ištrintas.')
      }
      setSelectedUser(null)
      setExtendDays(30)
      setExtendDate('')
      await loadUsers()
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    }
  }

  if (loading) return <div className="min-h-screen bg-[#f8fafd] grid place-items-center"><Loader2 className="animate-spin text-[#1a73e8]" /></div>

  return (
    <div className="min-h-screen bg-[#f8fafd] text-[#202124] flex">
      <aside className="w-64 shrink-0 bg-[#202124] text-white p-6 hidden md:flex flex-col">
        <div className="flex items-center gap-2.5 mb-10">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1a73e8]"><Sparkles size={18} /></span>
          <span className="font-bold"><span className="text-[#8ab4f8]">Get</span>review <span className="text-xs text-[#9aa0a6]">ADMIN</span></span>
        </div>
        <nav className="space-y-2">
          {[
            { id: 'users', label: 'Visi vartotojai', icon: Users },
            { id: 'settings', label: 'Admin nustatymai', icon: Settings },
          ].map((item) => (
            <button key={item.id} onClick={() => setTab(item.id as typeof tab)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left ${tab === item.id ? 'bg-[#1a73e8]' : 'text-[#bdc1c6] hover:bg-[#3c4043]'}`}>
              <item.icon size={18} />{item.label}
            </button>
          ))}
        </nav>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="mt-auto flex items-center gap-2 text-sm text-[#f28b82]">
          <LogOut size={17} /> Atsijungti
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-8">
          <div>
            <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">ADMINISTRATORIUS</span>
            <h1 className="text-3xl font-extrabold mt-1">Valdymo centras</h1>
            <p className="text-sm text-[#5f6368] mt-2">Sveiki, Mindaugai. Čia valdysite visas Getreview paskyras.</p>
          </div>
          {tab === 'users' && (
            <div className="relative">
              <Search size={17} className="absolute left-3 top-3 text-[#80868b]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ieškoti įmonės ar vartotojo" className="bg-white border border-[#dadce0] rounded-xl py-2.5 pl-9 pr-3 text-sm w-full sm:w-80" />
            </div>
          )}
        </div>

        {error && <div className="bg-[#fce8e6] border border-[#f5b7b1] text-[#c5221f] rounded-xl p-3 text-sm mb-5">{error}</div>}
        {actionMessage && <div className="bg-[#e6f4ea] border border-[#b7dfc1] text-[#137333] rounded-xl p-3 text-sm mb-5">{actionMessage}</div>}

        {tab === 'users' && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Registruotų vartotojų</p><strong className="text-3xl block mt-2">{users.length}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Surinktų atsiliepimų</p><strong className="text-3xl block mt-2">{users.reduce((total, user) => total + user.feedback_count, 0)}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Aktyvių QR nuskaitymų</p><strong className="text-3xl block mt-2">{users.reduce((total, user) => total + user.qr_scans, 0)}</strong></div>
            </div>
            <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#dadce0] flex items-center justify-between">
                <h2 className="font-bold">Visi vartotojai</h2>
                <span className="text-xs text-[#5f6368]">{filteredUsers.length} rodomi</span>
              </div>
              <div className="divide-y divide-[#dadce0]">
                {filteredUsers.map((user) => {
                  const daysLeft = getTrialDaysLeft(user)
                  return (
                    <div key={user.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <span className="h-10 w-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center font-bold">{user.first_name[0] || user.company_name[0]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">{user.company_name}</div>
                        <div className="text-sm text-[#5f6368]">{user.first_name} · {user.email}</div>
                      </div>
                      <span className={`text-xs font-bold rounded-full px-3 py-1.5 w-fit ${daysLeft > 0 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'}`}>{daysLeft > 0 ? `Liko ${daysLeft} d.` : 'Pasibaigusi'}</span>
                      <div className="grid grid-cols-3 gap-4 text-xs text-[#5f6368] min-w-[260px]">
                        <span>QR<strong className="block text-base text-[#202124]">{user.qr_scans}</strong></span>
                        <span>Atsiliepimai<strong className="block text-base text-[#202124]">{user.feedback_count}</strong></span>
                        <span>Vidurkis<strong className="block text-base text-[#202124]">{user.average_rating ?? '—'}</strong></span>
                      </div>
                                            <div className="flex flex-wrap gap-2">
                        <button onClick={() => router.push(`/dashboard?view_as=${user.id}`)} className="border border-[#c6dafc] bg-[#e8f0fe] text-[#1967d2] hover:bg-[#dbe7fb] rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><ExternalLink size={15} /> Dashboard</button>
                        <button onClick={() => { setSelectedUser(user); setExtendDate(formatDateForInput(user.trial_end)); setExtendDays(0); }} className="bg-[#1a73e8] text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><Eye size={16} /> Peržiūrėti</button>
                      </div>
                    </div>
                  )
                })}
                {filteredUsers.length === 0 && <div className="p-10 text-center text-sm text-[#5f6368]">Vartotojų nerasta.</div>}
              </div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Aktyvios prenumeratos</p><strong className="text-3xl block mt-2">{users.filter((user) => getTrialDaysLeft(user) > 0).length}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Pasibaigusios prenumeratos</p><strong className="text-3xl block mt-2">{users.filter((user) => getTrialDaysLeft(user) === 0).length}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Mokėjimai (Stripe)</p><strong className="text-xs block mt-3 text-[#b06000]">Stripe dar neprijungtas — kol kas valdomi bandomieji laikotarpiai.</strong></div>
            </div>
            <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#dadce0] flex items-center justify-between">
                <h2 className="font-bold">Prenumeratų valdymas</h2>
                <span className="text-xs text-[#5f6368]">{filteredUsers.length} rodomi</span>
              </div>
              <div className="divide-y divide-[#dadce0]">
                {filteredUsers.map((user) => {
                  const daysLeft = getTrialDaysLeft(user)
                  return (
                    <div key={user.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <span className="h-10 w-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center font-bold">{user.first_name[0] || user.company_name[0]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">{user.company_name}</div>
                        <div className="text-sm text-[#5f6368]">{user.first_name} · {user.email}</div>
                      </div>
                      <span className={`text-xs font-bold rounded-full px-3 py-1.5 w-fit ${daysLeft > 0 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'}`}>{daysLeft > 0 ? `Liko ${daysLeft} d.` : 'Pasibaigusi'}</span>
                                            <div className="flex flex-wrap gap-2">
                        <button onClick={() => { setSelectedUser(user); setExtendDate(formatDateForInput(user.trial_end)); setExtendDays(0); }} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl px-3 py-2 text-sm font-semibold">Pratęsti</button>
                        <button onClick={() => runUserAction('expire_trial', user)} disabled={daysLeft === 0} className="border border-[#f9df96] text-[#b06000] hover:bg-[#fef7e0] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2 text-sm font-semibold">Nutraukti</button>
                        <button onClick={() => router.push(`/dashboard?view_as=${user.id}`)} className="border border-[#c6dafc] bg-[#e8f0fe] text-[#1967d2] hover:bg-[#dbe7fb] rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><ExternalLink size={15} /> Dashboard</button>
                      </div>
                    </div>
                  )
                })}
                {filteredUsers.length === 0 && <div className="p-10 text-center text-sm text-[#5f6368]">Vartotojų nerasta.</div>}
              </div>
            </div>
          </>
        )}

        {tab === 'settings' && (
          <div className="bg-white border border-[#dadce0] rounded-2xl p-8">
            <Settings className="text-[#1a73e8] mb-5" size={28} />
            <h2 className="text-xl font-bold">Admin nustatymai</h2>
            <p className="text-sm text-[#5f6368] mt-2">Admin paskyra: {ADMIN_EMAIL}</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl bg-[#e8f0fe] p-4 text-sm text-[#3c4043]">Administratorius gali peržiūrėti vartotojų statistiką, peržiūrėti kliento dashboard jo akimis, pratęsti ar nutraukti bandomąjį laikotarpį bei ištrinti paskyras.</div>
              <div className="rounded-xl bg-[#fef7e0] border border-[#f9df96] p-4 text-sm text-[#b06000]">Stripe mokėjimams prireiks `STRIPE_SECRET_KEY` ir webhook konfigūracijos.</div>
            </div>
          </div>
        )}

                {selectedUser && (
          <div className="fixed inset-0 z-50 bg-[#202124]/40 grid place-items-center p-5">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-auto">
              <div className="p-6 border-b border-[#dadce0] flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#5f6368] uppercase font-bold">Prenumeratos valdymas</p>
                  <h2 className="text-2xl font-extrabold mt-1">{selectedUser.company_name}</h2>
                  <p className="text-sm text-[#5f6368] mt-1">{selectedUser.first_name} · {selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)}><X /></button>
              </div>
              <div className="p-6">
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <div className="bg-[#f8fafd] rounded-xl p-4">
                    <span className="text-xs text-[#5f6368]">Prenumeratos būsena</span>
                    <strong className={`block text-xl mt-1 ${getTrialDaysLeft(selectedUser) > 0 ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                      {getTrialDaysLeft(selectedUser) > 0 ? `Aktyvi (liko ${getTrialDaysLeft(selectedUser)} d.)` : 'Pasibaigusi'}
                    </strong>
                  </div>
                  <div className="bg-[#f8fafd] rounded-xl p-4">
                    <span className="text-xs text-[#5f6368]">Užsiregistravo</span>
                    <strong className="block text-xl mt-1">{new Date(selectedUser.created_at).toLocaleDateString('lt-LT')}</strong>
                  </div>
                </div>

                <div className="rounded-xl border border-[#dadce0] p-4 bg-[#f8fafd]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-bold text-sm text-[#1a73e8]">Keisti galiojimo laiką</p>
                    {selectedUser.trial_end && (
                      <span className="text-xs bg-white px-2 py-1 rounded border border-[#dadce0] text-[#5f6368]">
                        Dabartinė pabaiga: <strong>{new Date(selectedUser.trial_end).toLocaleDateString('lt-LT')}</strong>
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-[#dadce0] shadow-sm">
                      <label className="block text-xs font-bold text-[#5f6368] mb-2 uppercase tracking-wide">Pasirinkite pabaigos datą</label>
                      <input 
                        type="date" 
                        value={extendDate} 
                        onChange={(e) => {
                          setExtendDate(e.target.value)
                          setExtendDays(0)
                        }} 
                        className="w-full border border-[#dadce0] rounded-xl p-3 text-base font-medium focus:ring-2 focus:ring-[#1a73e8] outline-none transition-all" 
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-px bg-[#dadce0] flex-1" />
                      <span className="text-[10px] font-bold text-[#9aa0a6] uppercase">arba</span>
                      <div className="h-px bg-[#dadce0] flex-1" />
                    </div>

                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-[#5f6368] mb-1 font-medium">Pridėti dienų</label>
                        <input 
                          type="number" 
                          min={1} 
                          max={3650} 
                          value={extendDays || ''} 
                          onChange={(e) => { 
                            const val = Number(e.target.value)
                            setExtendDays(val)
                            if (val > 0) setExtendDate('') 
                          }} 
                          placeholder="pvz. 30"
                          className="w-full bg-white border border-[#dadce0] rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#1a73e8] outline-none" 
                        />
                      </div>
                      <div className="flex gap-1">
                        {[30, 90, 365].map((d) => (
                          <button 
                            key={d} 
                            onClick={() => { setExtendDays(d); setExtendDate(''); }} 
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${extendDays === d && !extendDate ? 'bg-[#1a73e8] text-white' : 'bg-white border border-[#dadce0] text-[#3c4043] hover:bg-[#f1f3f4]'}`}
                          >
                            +{d} d.
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => runUserAction('extend_trial', selectedUser, extendDate ? { endDate: extendDate } : { days: extendDays || 30 })} 
                      disabled={!extendDate && !extendDays}
                      className="w-full bg-[#1a73e8] hover:bg-[#1769d1] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-bold shadow-md transition-all active:scale-[0.98]"
                    >
                      Išsaugoti prenumeratą
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-[#dadce0]">
                  <button onClick={() => runUserAction('expire_trial', selectedUser)} className="flex-1 border border-[#f9df96] text-[#b06000] hover:bg-[#fef7e0] rounded-xl px-4 py-2.5 text-sm font-semibold">Nutraukti dabar</button>
                  <button onClick={() => runUserAction('delete_user', selectedUser)} className="flex-1 border border-[#f5b7b1] text-[#c5221f] hover:bg-[#fce8e6] rounded-xl px-4 py-2.5 text-sm font-semibold">Ištrinti paskyrą</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}