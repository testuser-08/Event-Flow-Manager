/**
 * InstallPrompt — shows a one-time "Add to Home Screen" banner on mobile.
 * Detects iOS vs Android/Chrome and shows platform-appropriate instructions.
 * Dismissed flag is stored in localStorage so it never shows again.
 */
import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, MoreVertical } from 'lucide-react';

const STORAGE_KEY = 'vhub_install_dismissed';

function getPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Don't show if already installed, already dismissed, or on desktop
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const p = getPlatform();
    if (p === 'other') return;
    setPlatform(p);
    // Slight delay so the page feels loaded before the banner pops
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 rounded-none relative">
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 hover:bg-muted rounded-none transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* App icon */}
          <img src="/icon-192.png" alt="App icon" className="w-12 h-12 rounded-xl border-2 border-border shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm uppercase tracking-tight">Install the app</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add to your home screen for the best experience — opens full-screen, no browser bar.
            </p>

            <div className="mt-3 bg-muted border border-border p-3 space-y-2">
              {platform === 'ios' ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">On iPhone / iPad (Safari):</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Share className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Tap the <strong>Share</strong> button in the Safari toolbar</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PlusSquare className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Then tap <strong>"Add to Home Screen"</strong></span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">On Android (Chrome):</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MoreVertical className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Tap the <strong>⋮ menu</strong> in Chrome's top-right corner</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PlusSquare className="w-4 h-4 shrink-0 text-blue-500" />
                    <span>Then tap <strong>"Add to Home screen"</strong></span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={dismiss}
              className="mt-3 text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Don't show this again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
