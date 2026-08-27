'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_EMAIL = 'mindaugas2027@gmail.com'

const withTimeout = <T,>(promise: PromiseLike<T>, milliseconds = 10000) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Užklausa užtruko per ilgai. Patikrinkite interneto ryšį ir bandykite dar kartą.')), milliseconds)
    })
  ])

export default function LoginPage() {
  const [companyName, setCompanyName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)
  const router = useRouter()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- skaitome URL parametrą po mount, kad išvengtume hydration neatitikimo
    setIsSignUp(new URLSearchParams(window.location.search).get('mode') === 'signup')
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await withTimeout(supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: companyName.trim(),
              first_name: firstName.trim(),
              phone: phone.trim(),
              trial_started_at: new Date().toISOString(),
            },
          },
        }))
        if (error) {
          setMessage({ text: error.message, type: 'error' })
        } else if (data.session) {
          window.location.assign('/dashboard')
          return
        } else {
          setMessage({ text: 'Paskyra sukurta. Patikrinkite el. paštą ir patvirtinkite paskyrą, kad galėtumėte patekti į valdymo panelę.', type: 'success' })
        }
      } else {
        const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }))
        if (error) {
          setMessage({ text: error.message, type: 'error' })
        } else {
          router.push(email.trim().toLowerCase() === ADMIN_EMAIL ? '/admin' : '/dashboard')
        }
      }
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Įvyko netikėta klaida. Bandykite dar kartą.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafd',
      color: '#202124',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <Link href="/" aria-label="Grįžti į Getreview pradžios puslapį" style={{
        position: 'absolute',
        top: '24px',
        left: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        color: '#202124',
        textDecoration: 'none',
        fontSize: '20px',
        fontWeight: '700'
      }}>
        <span style={{
          display: 'grid',
          placeItems: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: '#1a73e8',
          color: 'white'
        }}>
          <Sparkles size={19} />
        </span>
        <span><span style={{ color: '#1a73e8' }}>Get</span>review</span>
      </Link>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 8px 24px rgba(60, 64, 67, 0.12)',
        border: '1px solid #dadce0'
      }}>
        {/* Antraštė */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0', color: '#202124' }}>
            {isSignUp ? 'Sukurti paskyrą' : 'Sveiki sugrįžę'}
          </h1>
          <p style={{ fontSize: '14px', color: '#5f6368', margin: 0 }}>
            {isSignUp ? 'Įveskite duomenis naujai paskyrai' : 'Prisijunkite prie savo valdymo panelės'}
          </p>
        </div>

        {/* Pranešimas apie klaidą arba sėkmę */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            border: `1px solid ${message.type === 'error' ? '#ea4335' : '#34a853'}`,
            color: message.type === 'error' ? '#c5221f' : '#137333'
          }}>
            {message.text}
          </div>
        )}

        {/* Forma */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3c4043', marginBottom: '6px' }}>
                  Įmonės pavadinimas*
                </label>
                <input
                  type="text"
                  placeholder="Jūsų įmonė"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  autoComplete="organization"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ffffff',
                    border: '1px solid #dadce0', color: '#202124', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3c4043', marginBottom: '6px' }}>
                  Vardas*
                </label>
                <input
                  type="text"
                  placeholder="Jūsų vardas"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ffffff',
                    border: '1px solid #dadce0', color: '#202124', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3c4043', marginBottom: '6px' }}>
                  Tel. nr.
                </label>
                <input
                  type="tel"
                  placeholder="+370 600 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#ffffff',
                    border: '1px solid #dadce0', color: '#202124', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            </>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3c4043', marginBottom: '6px' }}>
              El. paštas
            </label>
            <input
              type="email"
              placeholder="vardenis@pavyzdys.lt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #dadce0',
                color: '#202124',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3c4043', marginBottom: '6px' }}>
              Slaptažodis
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #dadce0',
                color: '#202124',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              marginTop: '8px'
            }}
          >
            {loading ? 'Kraunama...' : isSignUp ? 'Užsiregistruoti' : 'Prisijungti'}
          </button>
        </form>

        {/* Perjungimas tarp Prisijungti / Registruotis */}
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #dadce0' }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setMessage(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a73e8',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {isSignUp ? 'Jau turite paskyrą? Prisijunkite' : 'Neturite paskyros? Užsiregistruokite'}
          </button>
        </div>
      </div>
    </div>
  )
}