import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'email' | 'verify' | 'error';

export default function Login() {
  const { session, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('email');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (isLoading) return null;
  if (session) return <Redirect to="/channels" />;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith('@sap.com')) {
      setErrorMsg('Only @sap.com email addresses are allowed.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setStep('verify');
    } catch (err: any) {
      console.error('[Login] signInWithOtp error:', err);
      setErrorMsg(err.message || 'Could not send login email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const code = otp.trim();
    if (code.length !== 6) {
      setErrorMsg('Enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: 'email',
      });
      if (error) throw error;
      // onAuthStateChange in AuthContext will pick up the new session automatically
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired code. Try requesting a new one.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12">
      {/* Logo / header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-primary-foreground" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground mb-1">Volunteer Hub</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">SAP Summit Ops Center</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">

        {/* Step 1 — Enter email */}
        {step === 'email' && (
          <form onSubmit={handleSend} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-sm">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@sap.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-base"
                required
                autoFocus
                data-testid="input-email"
              />
            </div>

            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={sending}
              data-testid="button-submit"
            >
              {sending ? 'Sending…' : 'Send login code'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Only @sap.com addresses are accepted</p>
          </form>
        )}

        {/* Step 2 — Enter OTP code */}
        {step === 'verify' && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-md border border-primary/20">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Email sent to {email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Check your inbox for a 6-digit code <strong>or</strong> click the magic link in the email — either works.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="font-semibold text-sm">Enter 6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="h-11 text-xl tracking-[0.4em] font-mono text-center"
                  autoFocus
                  data-testid="input-otp"
                />
              </div>

              {errorMsg && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{errorMsg}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold"
                disabled={verifying}
                data-testid="button-verify"
              >
                {verifying ? 'Verifying…' : 'Sign in'}
              </Button>
            </form>

            <button
              onClick={() => { setStep('email'); setOtp(''); setErrorMsg(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
              data-testid="button-back"
            >
              <ArrowLeft className="w-3 h-3" /> Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
