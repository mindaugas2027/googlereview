'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAIL, getTrialDaysLeft } from '@/lib/admin-auth'
import { PLAN_LIST } from '@/lib/plans'
import { DEFAULT_PLAN_PRICES, getPlanWithPrice, type PlanPrices } from '@/lib/plan-pricing'
import { CheckCircle2, CreditCard, ExternalLink, ImagePlus, Loader2, LogOut, Mail, MapPin, Package, Search, Settings, ShoppingBag, Sparkles, Users, X } from 'lucide-react'
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
  plan_id?: string | null
  subscription_status?: string | null
  is_paid: boolean
  monthly_goal?: number
  feedback_count: number
  google_redirects: number
  qr_scans: number
  average_rating: number | null
}

type StoreProduct = {
  id: string
  name: string
  description: string
  image_url: string | null
  price_cents: number
  active: boolean
  sort_order: number
}

type StoreOrder = {
  id: string
  product_name: string
  quantity: number
  amount_cents: number
  customer_email: string | null
  shipping_name: string | null
  shipping_address: Record<string, string> | null
  status: string
  created_at: string
}

const formatOrderAddress = (address: StoreOrder['shipping_address']) => {
  if (!address) return 'Adresas nepateiktas'
  return [address.line1, address.line2, address.postal_code, address.city, address.state, address.country].filter(Boolean).join(', ') || 'Adresas nepateiktas'
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [query, setQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [tab, setTab] = useState<'users' | 'store' | 'orders' | 'settings'>('users')
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [extendDays, setExtendDays] = useState(30)
  const [extendDate, setExtendDate] = useState('')
  const [planSaving, setPlanSaving] = useState(false)
  const [planPrices, setPlanPrices] = useState<PlanPrices>(DEFAULT_PLAN_PRICES)
  const [pricesSaving, setPricesSaving] = useState(false)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [productSaving, setProductSaving] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productSortOrder, setProductSortOrder] = useState('0')
  const [productActive, setProductActive] = useState(true)
  const [productImage, setProductImage] = useState<File | null>(null)
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const changePlan = async (user: AdminUser, planId: string) => {
    setPlanSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, action: 'set_plan', planId }) })
      const res = await response.json().catch(() => null)
      if (!response.ok) { setError(res?.error || `Plano pakeisti nepavyko (${response.status}).`); return }
      const plan = PLAN_LIST.find((item) => item.id === planId)
      setActionMessage(`${user.company_name} planas pakeistas į „${plan?.name}“ (${plan?.priceLabel}).`)
      await loadUsers()
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    } finally {
      setPlanSaving(false)
    }
  }

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
      const productsResponse = await fetch('/api/admin/products', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const productsPayload = await productsResponse.json().catch(() => null)
      if (productsResponse.ok && Array.isArray(productsPayload?.products)) setProducts(productsPayload.products)
      const pricesResponse = await fetch('/api/admin/plans', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const pricesPayload = await pricesResponse.json().catch(() => null)
      if (pricesResponse.ok && pricesPayload?.prices) setPlanPrices(pricesPayload.prices)
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.orders)) {
        setError(payload?.error || `Užsakymų įkelti nepavyko (${response.status}).`)
        return
      }
      setOrders(payload.orders)
    } catch {
      setError('Nepavyko pasiekti užsakymų serverio.')
    } finally {
      setOrdersLoading(false)
    }
  }

  const savePlanPrices = async () => {
    setPricesSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const response = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: planPrices }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) { setError(payload?.error || 'Kainų išsaugoti nepavyko.'); return }
      setPlanPrices(payload.prices)
      setActionMessage('Planų kainos išsaugotos. Nauji užsakymai naudos šias kainas, esamos prenumeratos nepasikeis.')
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    } finally {
      setPricesSaving(false)
    }
  }

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductName('')
    setProductDescription('')
    setProductPrice('')
    setProductSortOrder('0')
    setProductActive(true)
    setProductImage(null)
  }

  const editProduct = (product: StoreProduct) => {
    setEditingProductId(product.id)
    setProductName(product.name)
    setProductDescription(product.description)
    setProductPrice((product.price_cents / 100).toFixed(2))
    setProductSortOrder(String(product.sort_order))
    setProductActive(product.active)
    setProductImage(null)
  }

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault()
    setProductSaving(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const formData = new FormData()
      if (editingProductId) formData.append('id', editingProductId)
      formData.append('name', productName)
      formData.append('description', productDescription)
      formData.append('price', productPrice)
      formData.append('sortOrder', productSortOrder)
      formData.append('active', String(productActive))
      if (productImage) formData.append('image', productImage)
      const response = await fetch('/api/admin/products', { method: editingProductId ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData })
      const payload = await response.json().catch(() => null)
      if (!response.ok) { setError(payload?.error || 'Produkto išsaugoti nepavyko.'); return }
      setProducts((current) => editingProductId ? current.map((item) => item.id === editingProductId ? payload.product : item) : [...current, payload.product])
      setActionMessage(editingProductId ? 'Produktas atnaujintas.' : 'Produktas pridėtas. Jis rodomas landing puslapio apačioje.')
      resetProductForm()
    } catch {
      setError('Nepavyko pasiekti serverio. Patikrinkite interneto ryšį.')
    } finally {
      setProductSaving(false)
    }
  }

  const deleteProduct = async (product: StoreProduct) => {
    if (!window.confirm(`Ar tikrai norite ištrinti „${product.name}“?`)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const response = await fetch('/api/admin/products', { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: product.id }) })
    const payload = await response.json().catch(() => null)
    if (!response.ok) { setError(payload?.error || 'Produkto ištrinti nepavyko.'); return }
    setProducts((current) => current.filter((item) => item.id !== product.id))
    setActionMessage('Produktas ištrintas.')
    if (editingProductId === product.id) resetProductForm()
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- pradinis vartotojų sąrašo įkėlimas prisijungus
  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    if (tab !== 'orders') return
    // Užsakymus krauname tik atidarius jų tabą.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders()
  }, [tab])

  // Saugos laikmatis: jei duomenys neatsako per 20 s, rodome klaidą vietoj amžino sukimosi ratuko
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      setError((current) => current || 'Įkeliama užtruko per ilgai. Serveryje gali trūkti SUPABASE_SERVICE_ROLE_KEY aplinkos kintamojo.')
      setLoading(false)
    }, 20000)
    return () => clearTimeout(timer)
  }, [loading])

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.company_name} ${user.first_name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? user.is_paid : !user.is_paid)
    return matchesQuery && matchesPayment
  }), [users, query, paymentFilter])
  const paidUsersCount = users.filter((user) => user.is_paid).length

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
            { id: 'store', label: 'Parduotuvė', icon: ShoppingBag },
            { id: 'orders', label: 'Užsakymai', icon: Package },
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
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search size={17} className="absolute left-3 top-3 text-[#80868b]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ieškoti įmonės ar vartotojo" className="bg-white border border-[#dadce0] rounded-xl py-2.5 pl-9 pr-3 text-sm w-full sm:w-80" />
              </div>
              <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)} aria-label="Mokėjimo filtras" className="bg-white border border-[#dadce0] rounded-xl py-2.5 px-3 text-sm">
                <option value="all">Visi vartotojai</option>
                <option value="paid">Tik susimokėję</option>
                <option value="unpaid">Nesusimokėję / bandomieji</option>
              </select>
            </div>
          )}
        </div>

        {error && <div className="bg-[#fce8e6] border border-[#f5b7b1] text-[#c5221f] rounded-xl p-3 text-sm mb-5">{error}</div>}
        {actionMessage && <div className="bg-[#e6f4ea] border border-[#b7dfc1] text-[#137333] rounded-xl p-3 text-sm mb-5">{actionMessage}</div>}

        {tab === 'users' && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white border border-[#dadce0] rounded-2xl p-5"><p className="text-xs text-[#5f6368]">Registruotų vartotojų</p><strong className="text-3xl block mt-2">{users.length}</strong></div>
              <div className="bg-white border border-[#b7dfc1] rounded-2xl p-5"><p className="text-xs text-[#137333]">Susimokėjusių</p><strong className="text-3xl block mt-2 text-[#137333]">{paidUsersCount}</strong></div>
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
                      <span className={`text-xs font-bold rounded-full px-3 py-1.5 w-fit ${user.is_paid ? 'bg-[#e6f4ea] text-[#137333]' : daysLeft > 0 ? 'bg-[#fef7e0] text-[#b06000]' : 'bg-[#fce8e6] text-[#c5221f]'}`}>{user.is_paid ? 'Susimokėjęs' : daysLeft > 0 ? `Bandomasis: liko ${daysLeft} d.` : 'Nesusimokėjęs'}</span>
                      <div className="grid grid-cols-3 gap-4 text-xs text-[#5f6368] min-w-[260px]">
                        <span>QR<strong className="block text-base text-[#202124]">{user.qr_scans}</strong></span>
                        <span>Atsiliepimai<strong className="block text-base text-[#202124]">{user.feedback_count}</strong></span>
                        <span>Vidurkis<strong className="block text-base text-[#202124]">{user.average_rating ?? '—'}</strong></span>
                      </div>
                                            <div className="flex flex-wrap gap-2">
                        <button onClick={() => router.push(`/dashboard?view_as=${user.id}`)} className="border border-[#c6dafc] bg-[#e8f0fe] text-[#1967d2] hover:bg-[#dbe7fb] rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><ExternalLink size={15} /> Dashboard</button>
                        <button onClick={() => { setSelectedUser(user); setExtendDate(formatDateForInput(user.trial_end)); setExtendDays(0); }} className="bg-[#1a73e8] text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2"><CreditCard size={16} /> Prenumeratos</button>
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
              <div className="rounded-xl border border-[#dadce0] p-4">
                <h3 className="font-bold text-sm text-[#1a73e8] mb-3">Planų kainos</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {PLAN_LIST.map((item) => (
                    <label key={item.id} className="text-xs font-semibold text-[#5f6368]">
                      {item.name} / mėn.
                      <div className="flex items-center gap-2 mt-1">
                        <input type="number" min="0.01" max="10000" step="0.01" value={planPrices[item.id]} onChange={(event) => setPlanPrices((current) => ({ ...current, [item.id]: Number(event.target.value) }))} className="w-full border border-[#dadce0] rounded-xl p-2.5 text-sm text-[#202124]" />
                        <span className="text-sm">€</span>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="button" onClick={savePlanPrices} disabled={pricesSaving} className="mt-4 bg-[#1a73e8] hover:bg-[#1769d1] disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">{pricesSaving ? 'Saugoma…' : 'Išsaugoti kainas'}</button>
                <p className="text-xs text-[#80868b] mt-3">Naujiems klientams kaina pasikeis iškart. Jau aktyvių prenumeratų kaina nepasikeis.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'store' && (
          <div className="space-y-6">
            <form onSubmit={saveProduct} className="bg-white border border-[#dadce0] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5"><ShoppingBag className="text-[#1a73e8]" size={24} /><div><h2 className="text-xl font-bold">{editingProductId ? 'Redaguoti produktą' : 'Pridėti produktą'}</h2><p className="text-sm text-[#5f6368]">Kortelė, NFC kortelė ar stovelis su vienkartiniu mokėjimu.</p></div></div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm font-semibold">Pavadinimas<input required value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="NFC stovelis" className="mt-1 w-full border border-[#dadce0] rounded-xl p-3 font-normal" /></label>
                <label className="text-sm font-semibold">Kaina (€)<input required type="number" min="0.01" step="0.01" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} placeholder="19.90" className="mt-1 w-full border border-[#dadce0] rounded-xl p-3 font-normal" /></label>
                <label className="text-sm font-semibold md:col-span-2">Aprašymas<textarea value={productDescription} onChange={(event) => setProductDescription(event.target.value)} rows={3} placeholder="Trumpas produkto aprašymas" className="mt-1 w-full border border-[#dadce0] rounded-xl p-3 font-normal" /></label>
                <label className="text-sm font-semibold">Nuotrauka<input type="file" accept="image/*" onChange={(event) => setProductImage(event.target.files?.[0] || null)} className="mt-1 w-full border border-[#dadce0] rounded-xl p-2.5 font-normal" /></label>
                <label className="text-sm font-semibold">Rodomas eiliškumas<input type="number" value={productSortOrder} onChange={(event) => setProductSortOrder(event.target.value)} className="mt-1 w-full border border-[#dadce0] rounded-xl p-3 font-normal" /></label>
              </div>
              <label className="flex items-center gap-2 text-sm mt-4"><input type="checkbox" checked={productActive} onChange={(event) => setProductActive(event.target.checked)} /> Rodyti landing puslapio apačioje</label>
              <p className="text-xs text-[#80868b] mt-2">Užpildykite laukus, palikite pažymėtą šį pasirinkimą ir spauskite „Pridėti produktą“. Aktyvus produktas iškart bus rodomas viešo puslapio apačioje.</p>
              <div className="flex gap-3 mt-5"><button type="submit" disabled={productSaving} className="bg-[#1a73e8] hover:bg-[#1769d1] disabled:opacity-60 text-white rounded-xl px-5 py-2.5 text-sm font-semibold flex items-center gap-2">{productSaving ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}{editingProductId ? 'Išsaugoti pakeitimus' : 'Pridėti produktą'}</button>{editingProductId && <button type="button" onClick={resetProductForm} className="border border-[#dadce0] rounded-xl px-5 py-2.5 text-sm font-semibold">Atšaukti</button>}</div>
            </form>
            <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden"><div className="p-5 border-b border-[#dadce0] flex justify-between"><h2 className="font-bold">Parduotuvės produktai</h2><span className="text-xs text-[#5f6368]">{products.length} produktai</span></div><div className="divide-y divide-[#dadce0]">{products.map((product) => <div key={product.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"><div className="w-16 h-16 rounded-xl bg-[#eef3f8] overflow-hidden shrink-0">{product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="h-full grid place-items-center text-[#1a73e8]"><ShoppingBag size={22} /></div>}</div><div className="flex-1"><h3 className="font-bold">{product.name}</h3><p className="text-sm text-[#5f6368]">{(product.price_cents / 100).toFixed(2).replace('.', ',')} € · {product.active ? 'Rodomas landing puslapyje' : 'Paslėptas'}</p></div><div className="flex gap-2"><button type="button" onClick={() => editProduct(product)} className="border border-[#dadce0] rounded-xl px-3 py-2 text-sm font-semibold">Redaguoti</button><button type="button" onClick={() => deleteProduct(product)} className="border border-[#f5b7b1] text-[#c5221f] rounded-xl px-3 py-2 text-sm font-semibold">Ištrinti</button></div></div>)}{products.length === 0 && <div className="p-10 text-center text-sm text-[#5f6368]">Produktų dar nėra. Pridėkite pirmą produktą ir jis atsiras landing puslapio apačioje.</div>}</div></div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider">PARDUOTUVĖ</span>
                <h2 className="text-2xl font-extrabold mt-1">Užsakymai</h2>
                <p className="text-sm text-[#5f6368] mt-1">Čia matysite klientų apmokėtus produktų užsakymus ir pristatymo duomenis.</p>
              </div>
              <button type="button" onClick={loadOrders} disabled={ordersLoading} className="border border-[#dadce0] bg-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
                <Loader2 size={16} className={ordersLoading ? 'animate-spin' : ''} />
                Atnaujinti
              </button>
            </div>

            <div className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[#dadce0] flex items-center justify-between">
                <h3 className="font-bold">Gauti užsakymai</h3>
                <span className="text-xs text-[#5f6368]">{orders.length} užsakymai</span>
              </div>
              {ordersLoading && orders.length === 0 ? (
                <div className="p-12 grid place-items-center text-[#5f6368]"><Loader2 size={24} className="animate-spin" /></div>
              ) : orders.length === 0 ? (
                <div className="p-12 text-center text-sm text-[#5f6368]">Užsakymų dar nėra. Kai klientas apmokės parduotuvės pirkinį, jis atsiras čia.</div>
              ) : (
                <div className="divide-y divide-[#dadce0]">
                  {orders.map((order) => {
                    const isPaid = order.status === 'paid'
                    return (
                      <article key={order.id} className="p-5 grid lg:grid-cols-[1.2fr_1fr_auto] gap-5 items-start">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-lg">{order.product_name}</h4>
                            <span className={`text-xs font-bold rounded-full px-2.5 py-1 inline-flex items-center gap-1 ${isPaid ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'}`}>
                              <CheckCircle2 size={14} /> {isPaid ? 'Apmokėta' : 'Tikrinama'}
                            </span>
                          </div>
                          <p className="text-sm text-[#5f6368] mt-1">Kiekis: {order.quantity} · {new Date(order.created_at).toLocaleString('lt-LT')}</p>
                          <strong className="block text-xl mt-3">{(order.amount_cents / 100).toFixed(2).replace('.', ',')} €</strong>
                        </div>
                        <div className="space-y-2 text-sm min-w-0">
                          <p className="font-bold">{order.shipping_name || 'Vardas nepateiktas'}</p>
                          {order.customer_email && <p className="text-[#5f6368] flex items-start gap-2 break-all"><Mail size={16} className="mt-0.5 shrink-0" />{order.customer_email}</p>}
                          <p className="text-[#5f6368] flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" />{formatOrderAddress(order.shipping_address)}</p>
                        </div>
                        <span className="text-xs text-[#80868b] lg:text-right">Užsakymas<br />{order.id.slice(0, 8)}</span>
                      </article>
                    )
                  })}
                </div>
              )}
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

                <div className="rounded-xl border border-[#dadce0] p-4 bg-white mb-4">
                  <p className="font-bold text-sm text-[#1a73e8] mb-3">Planas</p>
                  <div className="grid sm:grid-cols-3 gap-2">
                    {PLAN_LIST.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => changePlan(selectedUser, item.id)}
                        disabled={planSaving || (selectedUser.plan_id || 'startas') === item.id}
                        className={`rounded-xl border p-3 text-left transition ${selectedUser.plan_id || 'startas' === item.id ? 'border-[#1a73e8] bg-[#e8f0fe]' : 'border-[#dadce0] hover:border-[#1a73e8]'} disabled:opacity-70 disabled:cursor-default`}
                      >
                        <span className="block text-sm font-bold">{item.name}</span>
                        <span className="block text-xs text-[#5f6368] mt-0.5">{getPlanWithPrice(item, planPrices).priceLabel} / mėn.</span>
                        <span className="block text-[11px] text-[#80868b] mt-1">{item.maxQrCodes === -1 ? 'Neriboti QR' : `${item.maxQrCodes} QR`} · {item.maxLocations === 1 ? '1 vieta' : `iki ${item.maxLocations} vietų`}</span>
                      </button>
                    ))}
                  </div>
                  {planSaving && <p className="text-xs text-[#1a73e8] mt-3">Taikoma…</p>}
                  <p className="text-[11px] text-[#80868b] mt-2">Planas nustato QR kodų ir vietų limitus kliento valdymo panelėje.</p>
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