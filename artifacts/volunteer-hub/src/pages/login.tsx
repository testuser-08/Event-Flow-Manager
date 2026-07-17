import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const { session, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (isLoading) return null;
  if (session) return <Redirect to="/channels" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    if (!email.endsWith('@sap.com')) {
      setStatus('error');
      setErrorMsg('Must use an @sap.com email address.');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      
      setStatus('success');
    } catch (error: any) {
      console.error('Login error:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Failed to send magic link. Please try again.');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Volunteer Hub</h1>
        <p className="text-muted-foreground font-mono text-sm uppercase">Ops Center Authorization</p>
      </div>

      <div className="bg-card border-2 border-border p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        {status === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="text-muted-foreground mb-6">We sent a magic link to {email}</p>
            <Button variant="outline" className="w-full border-2" onClick={() => setStatus('idle')}>
              Try another email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-xs">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="volunteer@sap.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-mono border-2 h-12 text-base rounded-none focus-visible:ring-0 focus-visible:border-primary"
                required
                data-testid="input-email"
              />
            </div>

            {status === 'error' && (
              <Alert variant="destructive" className="border-2 rounded-none bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs font-bold uppercase">{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-bold uppercase tracking-wider rounded-none border-2 border-primary hover:bg-secondary hover:text-foreground transition-all"
              disabled={status === 'loading'}
              data-testid="button-submit"
            >
              {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
