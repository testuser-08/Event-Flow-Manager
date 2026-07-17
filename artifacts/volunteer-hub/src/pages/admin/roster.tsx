import { useState, useRef } from 'react';
import { useListVolunteers, useUpdateVolunteer, useDeleteVolunteer } from '@workspace/api-client-react';
import { getListVolunteersQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { ArrowLeft, Upload, Trash2, Search, UserCog, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function AdminRoster() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: volunteers, isLoading } = useListVolunteers();
  const updateVolunteer = useUpdateVolunteer();
  const deleteVolunteer = useDeleteVolunteer();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/admin/roster`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const result = await res.json();
      toast({
        title: 'Roster Updated',
        description: `Added: ${result.inserted}. Skipped: ${result.skipped}. Errors: ${result.errors.length}`,
      });
      
      queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Upload Failed',
        description: 'Could not process the CSV file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateRole = (id: string, is_admin: boolean) => {
    updateVolunteer.mutate({ id, data: { is_admin } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
      }
    });
  };

  const handleUpdateWorkstream = (id: string, workstream: string) => {
    updateVolunteer.mutate({ id, data: { workstream: workstream || null } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this volunteer from the system?')) return;
    
    deleteVolunteer.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVolunteersQueryKey() });
      }
    });
  };

  const filteredVolunteers = volunteers?.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.workstream && v.workstream.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20">
      {/* Header */}
      <div className="bg-card border-b-2 border-border p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 -ml-2 hover:bg-muted rounded-none transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
            <UserCog className="w-5 h-5" /> Roster
          </h1>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-none border-2 font-bold uppercase text-xs cursor-pointer"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'CSV Upload'}
        </Button>
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleUpload} 
        />
      </div>

      <div className="p-4 flex-1 flex flex-col min-h-0">
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search volunteers..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 border-2 rounded-none font-mono focus-visible:ring-0 focus-visible:border-primary h-12"
          />
        </div>

        <div className="flex-1 overflow-y-auto border-2 border-border bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          {isLoading ? (
            <div className="p-8 text-center font-mono text-muted-foreground">Loading roster...</div>
          ) : filteredVolunteers.length === 0 ? (
            <div className="p-8 text-center font-mono text-muted-foreground">No volunteers found.</div>
          ) : (
            <div className="divide-y-2 divide-border">
              {filteredVolunteers.map((vol) => (
                <div key={vol.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold uppercase tracking-tight truncate">{vol.name}</h3>
                      {vol.is_admin && (
                        <Shield className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{vol.email}</div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-2 bg-muted px-2 py-1 border-2 border-border">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Admin</span>
                      <Switch 
                        checked={vol.is_admin}
                        onCheckedChange={(checked) => handleUpdateRole(vol.id, checked)}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input 
                        defaultValue={vol.workstream || ''}
                        placeholder="Workstream..."
                        className="h-8 w-32 sm:w-40 text-xs font-mono rounded-none border-2 px-2"
                        onBlur={(e) => {
                          if (e.target.value !== vol.workstream) {
                            handleUpdateWorkstream(vol.id, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8 rounded-none border-2 shrink-0"
                        onClick={() => handleDelete(vol.id)}
                        title="Remove Volunteer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
