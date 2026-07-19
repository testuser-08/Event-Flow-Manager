import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDarkMode } from '@/hooks/use-dark-mode';
import { Link } from 'wouter';
import { LogOut, ShieldAlert, Moon, Sun, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Avatar from './Avatar';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function Header() {
  const { volunteer, isAdmin, signOut, updateAvatar } = useAuth();
  const { isDark, toggle } = useDarkMode();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !volunteer) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('vhub_token');
      const form = new FormData();
      form.append('avatar', file);
      const res = await fetch(`${BASE}/api/profile/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.avatar_url) updateAvatar(data.avatar_url);
      else alert(data.error ?? 'Upload failed');
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-10 bg-background border-b-2 border-border flex items-center justify-between px-4 py-3 shrink-0">
      <div className="flex items-center gap-3">
        {/* Clickable avatar */}
        {volunteer && (
          <div className="relative group cursor-pointer" onClick={handleAvatarClick} title="Click to change profile photo">
            <Avatar name={volunteer.name} avatarUrl={volunteer.avatarUrl} size={40} />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-3.5 h-3.5 text-white" />}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        <div className="flex flex-col">
          <Link href="/channels" className="text-xl font-bold tracking-tight uppercase leading-tight">
            Customer Support Summit
          </Link>
          {volunteer && (
            <span className="text-xs font-mono text-muted-foreground leading-tight">
              {volunteer.name} • {volunteer.workstreams.length > 0 ? volunteer.workstreams.join(', ') : 'No workstream'}
            </span>
          )}
        </div>
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
