'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import { useAuth } from '@/context/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { ShieldCheckIcon, GavelIcon, TruckIcon } from '@/components/ui/Icons';

export default function SignupPage() {
  const { signup, verifySignupOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDetailsSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.email, undefined, form.password, form.fullName);
      setStep('otp'); // backend ne OTP bhej diya (email/phone pe — dev mode me console pe)
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifySignupOtp(form.email, otp);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--color-brand-500)_0%,_transparent_55%)] opacity-15" />
        <Link href="/" aria-label="Heavy Bazar — home" className="relative inline-flex items-center">
          <Logo variant="onDark" className="h-6 w-auto" />
        </Link>

        <div className="relative">
          <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
            Join a trusted marketplace for buying and selling heavy equipment.
          </h2>
          <div className="mt-8 space-y-4">
            {[
              { icon: ShieldCheckIcon, text: 'Verified sellers and secure payments' },
              { icon: GavelIcon, text: 'Live auctions with real-time bidding' },
              { icon: TruckIcon, text: 'Buyers and sellers nationwide' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-slate-500">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-400">&copy; {new Date().getFullYear()} Heavy Bazar</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {step === 'details' ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
              <p className="mt-1 text-sm text-slate-500">
                Sign up as a buyer or seller — you can switch roles later.
              </p>

              <form onSubmit={handleDetailsSubmit} className="mt-8 space-y-4">
                <Input
                  label="Full name"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="At least 8 characters, one capital letter, one number"
                  required
                />

                {error && <Alert tone="error">{error}</Alert>}

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send OTP
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verify OTP</h1>
              <p className="mt-1 text-sm text-slate-500">An OTP has been sent to {form.email}</p>

              <form onSubmit={handleOtpSubmit} className="mt-8 space-y-4">
                <Input
                  label="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />

                {error && <Alert tone="error">{error}</Alert>}

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Verify
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
