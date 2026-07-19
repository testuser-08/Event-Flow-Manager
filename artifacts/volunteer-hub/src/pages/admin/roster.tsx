import { useState, useRef } from 'react';
import { useListVolunteers, useDeleteVolunteer } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListVolunteersQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft, Upload, Trash2, ShieldCheck, Shield } from 'lucide-react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function AdminRoster() {
  const queryClient = useQueryClient();
  const { data: volunteers, isLoading } = useListVolunteers();
  const { mutate: deleteVolunteer } = useDeleteVolunteer();

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted?: number; errors?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const form = new FormData();
    form.append('file', file);

    const token = localStorage.getItem('vhub_token');
    try {
      const res = await fetch(`${BASE}/api/admin/roster`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const result = await res.json();
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
    } catch {
      setUploadResult({ errors: ['Upload failed. Please try again.'] });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the roster?`)) return;
    deleteVolunteer({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() }),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20 overflow-y-auto">
      <div className="bg-card border-b-2 border-border p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 -ml-2 hover:bg-muted rounded-none transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-black text-xl uppercase tracking-tighter">Team Roster</h1>
        </div>

        <div>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="border-2 rounded-none font-bold uppercase gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Upload CSV'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Upload result feedback */}
        {uploadResult && (
          <div className={`border-2 p-3 font-mono text-sm ${uploadResult.errors?.length ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'}`}>
            {uploadResult.inserted !== undefined && (
              <p className="font-bold mb-1">{uploadResult.inserted} team member{uploadResult.inserted !== 1 ? 's' : ''} imported (roster fully replaced).</p>
            )}
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                {uploadResult.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground font-mono">
          CSV format: <code>name, email, workstream, is_admin</code>. Multiple rows per email = multiple workstreams. Uploading replaces the entire roster.
        </p>

        {isLoading ? (
          <div className="font-mono text-sm text-muted-foreground">Loading roster...</div>
        ) : !volunteers?.length ? (
          <div className="bg-card border-2 border-dashed border-border p-8 text-center text-muted-foreground font-mono text-sm">
            No team members yet. Upload a CSV to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {volunteers.map((v: any) => (
              <div key={v.id} className="bg-card border-2 border-border p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm truncate">{v.name}</span>
                    {v.is_admin && <ShieldCheck className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate">{v.email}</p>
                  {(v.workstreams ?? []).length > 0 && (
                    <p className="text-xs font-mono text-primary mt-0.5">
                      <Shield className="w-3 h-3 inline mr-1" />
                      {(v.workstreams ?? []).join(', ')}
                    </p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(v.id, v.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
