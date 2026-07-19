import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function WelcomeModal() {
  const { volunteer, showWelcome, dismissWelcome } = useAuth();

  if (!showWelcome || !volunteer) return null;

  // First name only — feels more personal
  const firstName = volunteer.name.split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">
        {/* Gradient header band */}
        <div
          className="px-6 pt-8 pb-6 text-white"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
          }}
        >
          {/* Confetti-style emoji cluster */}
          <div className="text-3xl mb-4 leading-none select-none">🎉</div>
          <h2 className="text-2xl font-black leading-snug tracking-tight">
            Thank You for Being<br />Part of This!
          </h2>
          {firstName && (
            <p className="mt-1.5 text-blue-200 font-mono text-sm font-semibold">
              Hey, {firstName} 👋
            </p>
          )}
        </div>

        {/* Body */}
        <div className="bg-card px-6 py-6 space-y-4">
          <p className="text-sm leading-relaxed text-foreground">
            You're one of the people making the <span className="font-semibold">Customer Support Summit</span> actually
            happen. Whether you're at the registration desk, running a demo pod, capturing feedback, or keeping
            everything on track behind the scenes — none of this works without you.
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            This app is here to make your day easier: talk to your team, flag anything urgent, and check the
            schedule, all in one place.
          </p>
          <p className="text-sm leading-relaxed text-foreground font-medium">
            Let's make this summit one to remember. Thank you for showing up for it.{' '}
            <span className="select-none">💙</span>
          </p>

          <Button
            onClick={dismissWelcome}
            className="w-full h-11 text-base font-bold mt-2"
          >
            Let's go
          </Button>
        </div>
      </div>
    </div>
  );
}
