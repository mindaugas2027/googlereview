'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // JEI NEPRISIJUNGĘS -> Metame į login puslapį
        router.push('/login');
      } else {
        // JEI PRISIJUNGĘS -> Įleidžiame
        setUser(session.user);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold">Užrakintas Valdymo Skydelis</h1>
      <p className="mt-2 text-slate-400">Prisijungta kaip: {user?.email}</p>
      
      <button 
        onClick={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
        className="mt-4 bg-rose-600 hover:bg-rose-500 px-4 py-2 rounded-xl text-sm font-semibold transition"
      >
        Atsijungti
      </button>
    </div>
  );
}