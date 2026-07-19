import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/hooks/use-dark-mode';
import { Link } from 'wouter';
import { LogOut, ShieldAlert, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { volunteer, isAdmin, signOut } = useAuth();
  const { isDark, toggle } = useDarkMode();

  return (
    <header className="sticky top-0 z-10 bg-background border-b-2 border-border flex items-center justify-between px-4 py-3 shrink-0">
      <div className="flex flex-col">
        <Link href="/channels" className="text-xl font-bold tracking-tight uppercase">
          Volunteer Hub
        </Link>
        {volunteer && (
          <span className="text-xs font-mono text-muted-foreground">
            {volunteer.name} • {volunteer.workstreams.length > 0 ? volunteer.workstreams.join(', ') : 'No workstream'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link href="/admin" className="flex items-center justify-center w-10 h-10 border-2 border-border rounded hover:bg-secondary transition-colors cursor-pointer text-foreground">
            <ShieldAlert className="w-5 h-5" />
          </Link>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="w-10 h-10 border-2 border-border rounded-none"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button variant="outline" size="icon" onClick={signOut} className="w-10 h-10 border-2 border-border rounded-none" title="Log out">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
