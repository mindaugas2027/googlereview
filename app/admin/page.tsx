'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CreditCard, Eye, ExternalLink, Loader2, LogOut, Search, Settings, Sparkles, Users, X } from 'lucide-react'

const ADMIN_EMAIL = 'mindaugas2027@gmail.com'
type AdminUser = {
  id: string
  email?: string
  company_name: string
  first_name: string
  created_at: string
  last_sign_in_at?: string
  trial_started_at?: string | null
  monthly_goal?: number
  feedback_count: number
  google_redirects: number
  qr_scans: number
  average_rating: number | null
  recent_feedbacks: Array<{ name: string; rating: number; comment: string; created_at: string }>
}

const getTrialDaysLeft = (startedAt?: string | null) => {
  if (!startedAt) return 14
  const elapsedDays = Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 14 - elapsedDays)
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'users' | 'payments' | 'settings'>('users')
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  const loadUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.email?.toLowerCase() !== ADMIN_EMAIL) { router.replace('/login'); return }
    const response = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
    const payload = await response.json()
    if (!response.ok) { setError(payload.error || 'Vartotojų įkelti nepavyko.'); setLoading(false); return }
    setUsers(payload.users)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- pradinis vartotojų sąrašo įkėlimas prisijungus
  useEffect(() => { loadUsers() }, [])

  const filteredUsers = useMemo(() => users.filter((user) => `${user.company_name} ${user.first_name} ${user.email}`.toLowerCase().includes(query.toLowerCase())), [users, query])

  const runUserAction = async (action: 'extend_trial' | 'expire_trial' | 'delete_user', user: AdminUser) => {
    if (action === 'delete_user' && !window.confirm(`Ar tikrai norite ištrinti ${user.company_name} paskyrą?`)) return
    if (action === 'expire_trial' && !window.confirm(`Ar tikrai norite nutraukti ${user.company_name} prenumeratą? Klientas praras prieigą prie valdymo panelės.`)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, action, days: 14 }) })
    const payload = await response.json()
    if (!response.ok) { setError(payload.error || 'Veiksmas nepavyko.'); return }
    setActionMessage(action === 'delete_user' ? 'Vartotojas ištrintas.' : action === 'expire_trial' ? `${user.company_name} prenumerata nutraukta.` : `${user.company_name} prenumerata pratęsta 14 dienų.`)
    setSelectedUser(null)
    await loadUsers()
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
            { id: 'payments', label: 'Prenumeratos / Stripe', icon: CreditCard },
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
          {(tab === 'users' || tab === 'payments') && (
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
                  const daysLeft = getTrialDaysLeft(user.trial_started_at)
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
                        <button onClick={() => setSelectedUser(user)} className="bg-[#1a73e8] text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><Eye size={16} /> Peržiūrėti</button>
                      </div>
                    </div>
                  )
                })}
                {filteredUsers.length === 0 && <div className="p-10 text-center text-sm text-[#5f6368]">Vartotojų nerasta.</div>}
              </div>
            </div>
          </>
        )}

        {tab === 'payments' && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Aktyvios prenumeratos</p><strong className="text-3xl block mt-2">{users.filter((user) => getTrialDaysLeft(user.trial_started_at) > 0).length}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Pasibaigusios prenumeratos</p><strong className="text-3xl block mt-2">{users.filter((user) => getTrialDaysLeft(user.trial_started_at) === 0).length}</strong></div>
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Mokėjimai (Stripe)</p><strong className="text-xs block mt-3 text-[#b06000]">Stripe dar neprijungtas — kol kas valdomi bandomieji laikotarpiai.</strong></div>
            </div>
            <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#dadce0] flex items-center justify-between">
                <h2 className="font-bold">Prenumeratų valdymas</h2>
                <span className="text-xs text-[#5f6368]">{filteredUsers.length} rodomi</span>
              </div>
              <div className="divide-y divide-[#dadce0]">
                {filteredUsers.map((user) => {
                  const daysLeft = getTrialDaysLeft(user.trial_started_at)
                  return (
                    <div key={user.id} className="p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                      <span className="h-10 w-10 rounded-xl bg-[#e8f0fe] text-[#1a73e8] grid place-items-center font-bold">{user.first_name[0] || user.company_name[0]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold">{user.company_name}</div>
                        <div className="text-sm text-[#5f6368]">{user.first_name} · {user.email}</div>
                      </div>
                      <span className={`text-xs font-bold rounded-full px-3 py-1.5 w-fit ${daysLeft > 0 ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fce8e6] text-[#c5221f]'}`}>{daysLeft > 0 ? `Liko ${daysLeft} d.` : 'Pasibaigusi'}</span>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => runUserAction('extend_trial', user)} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl px-3 py-2 text-sm font-semibold">Pratęsti 14 d.</button>
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
                  <p className="text-xs text-[#5f6368] uppercase font-bold">Kliento peržiūra</p>
                  <h2 className="text-2xl font-extrabold mt-1">{selectedUser.company_name}</h2>
                  <p className="text-sm text-[#5f6368] mt-1">{selectedUser.first_name} · {selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)}><X /></button>
              </div>
              <div className="p-6">
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  <div className="bg-[#f8fafd] rounded-xl p-4"><span className="text-xs text-[#5f6368]">QR nuskaitymai</span><strong className="block text-2xl mt-1">{selectedUser.qr_scans}</strong></div>
                  <div className="bg-[#f8fafd] rounded-xl p-4"><span className="text-xs text-[#5f6368]">Atsiliepimai</span><strong className="block text-2xl mt-1">{selectedUser.feedback_count}</strong></div>
                  <div className="bg-[#f8fafd] rounded-xl p-4"><span className="text-xs text-[#5f6368]">Google</span><strong className="block text-2xl mt-1">{selectedUser.google_redirects}</strong></div>
                </div>
                <h3 className="font-bold mb-3">Naujausi atsiliepimai</h3>
                <div className="space-y-3">
                  {selectedUser.recent_feedbacks.map((feedback, index) => (
                    <div key={`${feedback.created_at}-${index}`} className="border border-[#dadce0] rounded-xl p-4">
                      <div className="flex justify-between gap-3"><strong className="text-sm">{feedback.name}</strong><span className="text-[#f29900]">{'★'.repeat(feedback.rating)}</span></div>
                      <p className="text-sm text-[#3c4043] mt-2">{feedback.comment}</p>
                    </div>
                  ))}
                  {selectedUser.recent_feedbacks.length === 0 && <p className="text-sm text-[#5f6368]">Atsiliepimų dar nėra.</p>}
                </div>
                <div className="flex flex-wrap gap-3 mt-7">
                  <button onClick={() => router.push(`/dashboard?view_as=${selectedUser.id}`)} className="bg-[#202124] text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"><ExternalLink size={16} /> Peržiūrėti kliento dashboard</button>
                  <button onClick={() => runUserAction('extend_trial', selectedUser)} className="bg-[#1a73e8] text-white rounded-xl px-4 py-2.5 text-sm font-semibold">Pratęsti 14 dienų</button>
                  <button onClick={() => runUserAction('expire_trial', selectedUser)} className="border border-[#f9df96] text-[#b06000] hover:bg-[#fef7e0] rounded-xl px-4 py-2.5 text-sm font-semibold">Nutraukti prenumeratą</button>
                  <button onClick={() => runUserAction('delete_user', selectedUser)} className="border border-[#f5b7b1] text-[#c5221f] rounded-xl px-4 py-2.5 text-sm font-semibold">Ištrinti vartotoją</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}