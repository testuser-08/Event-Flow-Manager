import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGetAgenda,
  useGetBreakouts,
  useCreateAgendaItem,
  useUpdateAgendaItem,
  useDeleteAgendaItem,
  useCreateBreakoutSession,
  useUpdateBreakoutSession,
  useDeleteBreakoutSession,
  useCreateBreakoutTrack,
  useUpdateBreakoutTrack,
  useDeleteBreakoutTrack,
  getGetAgendaQueryKey,
  getGetBreakoutsQueryKey,
} from '@workspace/api-client-react';
import type { AgendaItem, BreakoutTrack, BreakoutSessionRow } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, List, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeLabel(start: string, end: string): string {
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

// ── Agenda editor ─────────────────────────────────────────────────────────────

interface AgendaFormData {
  sort_order: string;
  start_time: string;
  end_time: string;
  label: string;
  title: string;
  location: string;
  is_breakout: boolean;
}

const emptyAgendaForm = (): AgendaFormData => ({
  sort_order: '',
  start_time: '',
  end_time: '',
  label: '',
  title: '',
  location: '',
  is_breakout: false,
});

function itemToForm(item: AgendaItem): AgendaFormData {
  return {
    sort_order: String(item.sort_order),
    start_time: item.start_time,
    end_time: item.end_time,
    label: item.label,
    title: item.title,
    location: item.location,
    is_breakout: item.is_breakout,
  };
}

function AgendaEditor() {
  const queryClient = useQueryClient();
  const { data: agenda, isLoading } = useGetAgenda();
  const createItem = useCreateAgendaItem();
  const updateItem = useUpdateAgendaItem();
  const deleteItem = useDeleteAgendaItem();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AgendaFormData>(emptyAgendaForm());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AgendaFormData>(emptyAgendaForm());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAgendaQueryKey() });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.start_time || !addForm.end_time || !addForm.title) {
      toast.error('Start time, end time, and title are required.');
      return;
    }
    const label = addForm.label || makeLabel(addForm.start_time, addForm.end_time);
    try {
      await createItem.mutateAsync({
        data: {
          sort_order: addForm.sort_order ? parseInt(addForm.sort_order) : 0,
          start_time: addForm.start_time,
          end_time: addForm.end_time,
          label,
          title: addForm.title,
          location: addForm.location,
          is_breakout: addForm.is_breakout,
        },
      });
      toast.success('Agenda item added.');
      setAddForm(emptyAgendaForm());
      setShowAddForm(false);
      invalidate();
    } catch {
      toast.error('Failed to add agenda item.');
    }
  };

  const startEdit = (item: AgendaItem) => {
    setEditingId(item.id);
    setEditForm(itemToForm(item));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.start_time || !editForm.end_time || !editForm.title) {
      toast.error('Start time, end time, and title are required.');
      return;
    }
    const label = editForm.label || makeLabel(editForm.start_time, editForm.end_time);
    try {
      await updateItem.mutateAsync({
        id,
        data: {
          sort_order: editForm.sort_order ? parseInt(editForm.sort_order) : 0,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          label,
          title: editForm.title,
          location: editForm.location,
          is_breakout: editForm.is_breakout,
        },
      });
      toast.success('Agenda item updated.');
      setEditingId(null);
      invalidate();
    } catch {
      toast.error('Failed to update agenda item.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ id });
      toast.success('Agenda item deleted.');
      setDeletingId(null);
      invalidate();
    } catch {
      toast.error('Failed to delete agenda item.');
    }
  };

  if (isLoading) return <div className="text-muted-foreground font-mono text-sm p-4">Loading agenda…</div>;

  return (
    <div className="space-y-3">
      {/* Existing items */}
      {(agenda ?? []).map((item) => (
        <div key={item.id} className="bg-card border-2 border-border">
          {editingId === item.id ? (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">Order</label>
                  <Input value={editForm.sort_order} onChange={(e) => setEditForm(f => ({ ...f, sort_order: e.target.value }))} placeholder="0" className="h-8 rounded-none border-2 text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">Start (HH:MM)</label>
                  <Input value={editForm.start_time} onChange={(e) => setEditForm(f => ({ ...f, start_time: e.target.value }))} placeholder="09:00" className="h-8 rounded-none border-2 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">End (HH:MM)</label>
                  <Input value={editForm.end_time} onChange={(e) => setEditForm(f => ({ ...f, end_time: e.target.value }))} placeholder="10:00" className="h-8 rounded-none border-2 text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">Label (auto if blank)</label>
                  <Input value={editForm.label} onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="09:00 AM – 10:00 AM" className="h-8 rounded-none border-2 text-xs" />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Title</label>
                <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} className="h-8 rounded-none border-2 text-xs" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Location</label>
                <Input value={editForm.location} onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))} className="h-8 rounded-none border-2 text-xs" />
              </div>
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                <input type="checkbox" checked={editForm.is_breakout} onChange={(e) => setEditForm(f => ({ ...f, is_breakout: e.target.checked }))} className="w-3.5 h-3.5" />
                Is breakout row (links to Breakouts page)
              </label>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={() => handleSaveEdit(item.id)} disabled={updateItem.isPending}>
                  <Check className="w-3 h-3 mr-1" /> Save
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setEditingId(null)}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : deletingId === item.id ? (
            <div className="p-3 flex items-center gap-3">
              <span className="text-xs font-mono flex-1 text-destructive">Delete "{item.title}"?</span>
              <Button size="sm" variant="destructive" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={() => handleDelete(item.id)} disabled={deleteItem.isPending}>
                Yes, Delete
              </Button>
              <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] text-muted-foreground">{item.label} {item.is_breakout && <span className="text-primary font-bold">· BREAKOUT</span>}</p>
                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                {item.location && <p className="text-[10px] font-mono text-muted-foreground">{item.location}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(item)} className="p-1 hover:text-primary transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeletingId(item.id)} className="p-1 hover:text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new item */}
      {showAddForm ? (
        <form onSubmit={handleAdd} className="bg-card border-2 border-primary p-3 space-y-2">
          <p className="font-mono text-xs font-black uppercase text-primary">New Agenda Item</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Order</label>
              <Input value={addForm.sort_order} onChange={(e) => setAddForm(f => ({ ...f, sort_order: e.target.value }))} placeholder="0" className="h-8 rounded-none border-2 text-xs" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Start (HH:MM) *</label>
              <Input value={addForm.start_time} onChange={(e) => setAddForm(f => ({ ...f, start_time: e.target.value }))} placeholder="09:00" className="h-8 rounded-none border-2 text-xs" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">End (HH:MM) *</label>
              <Input value={addForm.end_time} onChange={(e) => setAddForm(f => ({ ...f, end_time: e.target.value }))} placeholder="10:00" className="h-8 rounded-none border-2 text-xs" required />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Label (auto if blank)</label>
              <Input value={addForm.label} onChange={(e) => setAddForm(f => ({ ...f, label: e.target.value }))} placeholder="09:00 AM – 10:00 AM" className="h-8 rounded-none border-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Title *</label>
            <Input value={addForm.title} onChange={(e) => setAddForm(f => ({ ...f, title: e.target.value }))} className="h-8 rounded-none border-2 text-xs" required />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Location</label>
            <Input value={addForm.location} onChange={(e) => setAddForm(f => ({ ...f, location: e.target.value }))} className="h-8 rounded-none border-2 text-xs" />
          </div>
          <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
            <input type="checkbox" checked={addForm.is_breakout} onChange={(e) => setAddForm(f => ({ ...f, is_breakout: e.target.checked }))} className="w-3.5 h-3.5" />
            Is breakout row (links to Breakouts page)
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" disabled={createItem.isPending}>
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => { setShowAddForm(false); setAddForm(emptyAgendaForm()); }}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-9 rounded-none border-2 border-dashed text-xs font-bold uppercase gap-2" onClick={() => setShowAddForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Agenda Item
        </Button>
      )}
    </div>
  );
}

// ── Breakout session form ─────────────────────────────────────────────────────

interface SessionFormData {
  sort_order: string;
  zone: string;
  title: string;
  start_time: string;
  end_time: string;
  time_label: string;
}

const emptySessionForm = (): SessionFormData => ({
  sort_order: '',
  zone: '',
  title: '',
  start_time: '',
  end_time: '',
  time_label: '',
});

function sessionToForm(s: BreakoutSessionRow): SessionFormData {
  return {
    sort_order: String(s.sort_order),
    zone: s.zone ?? '',
    title: s.title,
    start_time: s.start_time,
    end_time: s.end_time,
    time_label: s.time_label,
  };
}

// ── Breakout track card ───────────────────────────────────────────────────────

function BreakoutTrackCard({ track }: { track: BreakoutTrack }) {
  const queryClient = useQueryClient();
  const createSession = useCreateBreakoutSession();
  const updateSession = useUpdateBreakoutSession();
  const deleteSession = useDeleteBreakoutSession();
  const updateTrack = useUpdateBreakoutTrack();
  const deleteTrack = useDeleteBreakoutTrack();

  const [expanded, setExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionEditForm, setSessionEditForm] = useState<SessionFormData>(emptySessionForm());
  const [showAddSession, setShowAddSession] = useState(false);
  const [addSessionForm, setAddSessionForm] = useState<SessionFormData>(emptySessionForm());
  const [editingTrack, setEditingTrack] = useState(false);
  const [trackName, setTrackName] = useState(track.name);
  const [trackLocation, setTrackLocation] = useState(track.location);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [confirmDeleteTrack, setConfirmDeleteTrack] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetBreakoutsQueryKey() });

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSessionForm.title || !addSessionForm.start_time || !addSessionForm.end_time) {
      toast.error('Title, start time, and end time are required.');
      return;
    }
    const time_label = addSessionForm.time_label || makeLabel(addSessionForm.start_time, addSessionForm.end_time);
    try {
      await createSession.mutateAsync({
        data: {
          track_id: track.id,
          sort_order: addSessionForm.sort_order ? parseInt(addSessionForm.sort_order) : 0,
          zone: addSessionForm.zone || undefined,
          title: addSessionForm.title,
          start_time: addSessionForm.start_time,
          end_time: addSessionForm.end_time,
          time_label,
        },
      });
      toast.success('Session added.');
      setAddSessionForm(emptySessionForm());
      setShowAddSession(false);
      invalidate();
    } catch {
      toast.error('Failed to add session.');
    }
  };

  const handleSaveSession = async (id: string) => {
    if (!sessionEditForm.title || !sessionEditForm.start_time || !sessionEditForm.end_time) {
      toast.error('Title, start time, and end time are required.');
      return;
    }
    const time_label = sessionEditForm.time_label || makeLabel(sessionEditForm.start_time, sessionEditForm.end_time);
    try {
      await updateSession.mutateAsync({
        id,
        data: {
          sort_order: sessionEditForm.sort_order ? parseInt(sessionEditForm.sort_order) : 0,
          zone: sessionEditForm.zone || null,
          title: sessionEditForm.title,
          start_time: sessionEditForm.start_time,
          end_time: sessionEditForm.end_time,
          time_label,
        },
      });
      toast.success('Session updated.');
      setEditingSessionId(null);
      invalidate();
    } catch {
      toast.error('Failed to update session.');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession.mutateAsync({ id });
      toast.success('Session deleted.');
      setDeletingSessionId(null);
      invalidate();
    } catch {
      toast.error('Failed to delete session.');
    }
  };

  const handleSaveTrack = async () => {
    try {
      await updateTrack.mutateAsync({ id: track.id, data: { name: trackName, location: trackLocation } });
      toast.success('Track updated.');
      setEditingTrack(false);
      invalidate();
    } catch {
      toast.error('Failed to update track.');
    }
  };

  const handleDeleteTrack = async () => {
    try {
      await deleteTrack.mutateAsync({ id: track.id });
      toast.success('Track deleted.');
      invalidate();
    } catch {
      toast.error('Failed to delete track.');
    }
  };

  return (
    <div className="bg-card border-2 border-border">
      {/* Track header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${track.color} text-white`}>
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
          <span className="font-mono text-xs font-black uppercase truncate">{track.name}</span>
          <span className="font-mono text-[10px] opacity-75 truncate">{track.location}</span>
          <span className="ml-auto font-mono text-[10px] opacity-75 shrink-0">{track.sessions.length} sessions</span>
        </button>
        <button onClick={() => setEditingTrack(v => !v)} className="shrink-0 p-1 bg-white/20 hover:bg-white/30 transition-colors" title="Edit track">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={() => setConfirmDeleteTrack(true)} className="shrink-0 p-1 bg-white/20 hover:bg-red-500/60 transition-colors" title="Delete track">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Confirm delete track */}
      {confirmDeleteTrack && (
        <div className="px-3 py-2 bg-destructive/10 border-b-2 border-border flex items-center gap-3">
          <span className="text-xs font-mono flex-1 text-destructive font-bold">Delete this entire track and all its sessions?</span>
          <Button size="sm" variant="destructive" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={handleDeleteTrack} disabled={deleteTrack.isPending}>
            Delete
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setConfirmDeleteTrack(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Edit track form */}
      {editingTrack && (
        <div className="px-3 py-2 border-b-2 border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Track Name</label>
              <Input value={trackName} onChange={(e) => setTrackName(e.target.value)} className="h-8 rounded-none border-2 text-xs" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Location</label>
              <Input value={trackLocation} onChange={(e) => setTrackLocation(e.target.value)} className="h-8 rounded-none border-2 text-xs" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={handleSaveTrack} disabled={updateTrack.isPending}>
              <Check className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => { setEditingTrack(false); setTrackName(track.name); setTrackLocation(track.location); }}>
              <X className="w-3 h-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {expanded && (
        <div className="divide-y-2 divide-border">
          {track.sessions.map((session) => (
            <div key={session.id}>
              {editingSessionId === session.id ? (
                <div className="p-3 space-y-2 bg-muted/30">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">Zone</label>
                      <Input value={sessionEditForm.zone} onChange={(e) => setSessionEditForm(f => ({ ...f, zone: e.target.value }))} placeholder="Zone 1" className="h-7 rounded-none border-2 text-xs" />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">Start (HH:MM)</label>
                      <Input value={sessionEditForm.start_time} onChange={(e) => setSessionEditForm(f => ({ ...f, start_time: e.target.value }))} placeholder="13:30" className="h-7 rounded-none border-2 text-xs" />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">End (HH:MM)</label>
                      <Input value={sessionEditForm.end_time} onChange={(e) => setSessionEditForm(f => ({ ...f, end_time: e.target.value }))} placeholder="14:00" className="h-7 rounded-none border-2 text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">Title</label>
                    <Input value={sessionEditForm.title} onChange={(e) => setSessionEditForm(f => ({ ...f, title: e.target.value }))} className="h-7 rounded-none border-2 text-xs" />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase text-muted-foreground">Time Label (auto if blank)</label>
                    <Input value={sessionEditForm.time_label} onChange={(e) => setSessionEditForm(f => ({ ...f, time_label: e.target.value }))} placeholder="1:30 PM – 2:00 PM" className="h-7 rounded-none border-2 text-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={() => handleSaveSession(session.id)} disabled={updateSession.isPending}>
                      <Check className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setEditingSessionId(null)}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : deletingSessionId === session.id ? (
                <div className="p-3 flex items-center gap-3 bg-destructive/5">
                  <span className="text-xs font-mono flex-1 text-destructive">Delete "{session.title}"?</span>
                  <Button size="sm" variant="destructive" className="h-7 px-3 rounded-none text-xs font-bold uppercase" onClick={() => handleDeleteSession(session.id)} disabled={deleteSession.isPending}>
                    Delete
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setDeletingSessionId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="px-3 py-2 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {session.zone && <p className={`font-mono text-[10px] font-bold uppercase ${track.text_color}`}>{session.zone}</p>}
                    <p className="text-xs font-semibold leading-snug">{session.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{session.time_label}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingSessionId(session.id); setSessionEditForm(sessionToForm(session)); }} className="p-1 hover:text-primary transition-colors">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeletingSessionId(session.id)} className="p-1 hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add session form */}
          {showAddSession ? (
            <form onSubmit={handleAddSession} className="p-3 space-y-2 bg-primary/5">
              <p className="font-mono text-[10px] font-black uppercase text-primary">New Session</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">Zone</label>
                  <Input value={addSessionForm.zone} onChange={(e) => setAddSessionForm(f => ({ ...f, zone: e.target.value }))} placeholder="Zone 1" className="h-7 rounded-none border-2 text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">Start (HH:MM) *</label>
                  <Input value={addSessionForm.start_time} onChange={(e) => setAddSessionForm(f => ({ ...f, start_time: e.target.value }))} placeholder="13:30" className="h-7 rounded-none border-2 text-xs" required />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase text-muted-foreground">End (HH:MM) *</label>
                  <Input value={addSessionForm.end_time} onChange={(e) => setAddSessionForm(f => ({ ...f, end_time: e.target.value }))} placeholder="14:00" className="h-7 rounded-none border-2 text-xs" required />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Title *</label>
                <Input value={addSessionForm.title} onChange={(e) => setAddSessionForm(f => ({ ...f, title: e.target.value }))} className="h-7 rounded-none border-2 text-xs" required />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase text-muted-foreground">Time Label (auto if blank)</label>
                <Input value={addSessionForm.time_label} onChange={(e) => setAddSessionForm(f => ({ ...f, time_label: e.target.value }))} placeholder="1:30 PM – 2:00 PM" className="h-7 rounded-none border-2 text-xs" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" disabled={createSession.isPending}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => { setShowAddSession(false); setAddSessionForm(emptySessionForm()); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-2">
              <button onClick={() => setShowAddSession(true)} className="w-full py-1.5 border-2 border-dashed border-border text-[10px] font-mono font-bold uppercase text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                <Plus className="w-3 h-3" /> Add Session
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add track form ────────────────────────────────────────────────────────────

const TRACK_COLOR_OPTIONS = [
  { label: 'Blue',    color: 'bg-blue-600',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-600 dark:border-blue-400' },
  { label: 'Cyan',    color: 'bg-cyan-600',    text: 'text-cyan-600 dark:text-cyan-400',    border: 'border-cyan-600 dark:border-cyan-400' },
  { label: 'Violet',  color: 'bg-violet-600',  text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-600 dark:border-violet-400' },
  { label: 'Emerald', color: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-600 dark:border-emerald-400' },
  { label: 'Orange',  color: 'bg-orange-500',  text: 'text-orange-500 dark:text-orange-400', border: 'border-orange-500 dark:border-orange-400' },
  { label: 'Rose',    color: 'bg-rose-600',    text: 'text-rose-600 dark:text-rose-400',    border: 'border-rose-600 dark:border-rose-400' },
  { label: 'Amber',   color: 'bg-amber-500',   text: 'text-amber-500 dark:text-amber-400',  border: 'border-amber-500 dark:border-amber-400' },
];

function BreakoutsEditor() {
  const queryClient = useQueryClient();
  const { data: tracks, isLoading } = useGetBreakouts();
  const createTrack = useCreateBreakoutTrack();

  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackSlug, setNewTrackSlug] = useState('');
  const [newTrackLocation, setNewTrackLocation] = useState('');
  const [newTrackColorIdx, setNewTrackColorIdx] = useState(0);
  const [newTrackOrder, setNewTrackOrder] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetBreakoutsQueryKey() });

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName || !newTrackSlug) {
      toast.error('Name and slug are required.');
      return;
    }
    const col = TRACK_COLOR_OPTIONS[newTrackColorIdx];
    try {
      await createTrack.mutateAsync({
        data: {
          slug: newTrackSlug,
          sort_order: newTrackOrder ? parseInt(newTrackOrder) : 0,
          name: newTrackName,
          location: newTrackLocation,
          color: col.color,
          text_color: col.text,
          border_color: col.border,
        },
      });
      toast.success('Track created.');
      setShowAddTrack(false);
      setNewTrackName(''); setNewTrackSlug(''); setNewTrackLocation(''); setNewTrackOrder('');
      invalidate();
    } catch {
      toast.error('Failed to create track.');
    }
  };

  if (isLoading) return <div className="text-muted-foreground font-mono text-sm p-4">Loading breakout tracks…</div>;

  return (
    <div className="space-y-3">
      {(tracks ?? []).map((track) => (
        <BreakoutTrackCard key={track.id} track={track} />
      ))}

      {showAddTrack ? (
        <form onSubmit={handleAddTrack} className="bg-card border-2 border-primary p-3 space-y-2">
          <p className="font-mono text-xs font-black uppercase text-primary">New Track</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Name *</label>
              <Input value={newTrackName} onChange={(e) => setNewTrackName(e.target.value)} placeholder="Tech Talk" className="h-8 rounded-none border-2 text-xs" required />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Slug (unique) *</label>
              <Input value={newTrackSlug} onChange={(e) => setNewTrackSlug(e.target.value)} placeholder="tech-talk" className="h-8 rounded-none border-2 text-xs" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Location</label>
              <Input value={newTrackLocation} onChange={(e) => setNewTrackLocation(e.target.value)} placeholder="Hive Space" className="h-8 rounded-none border-2 text-xs" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">Sort Order</label>
              <Input value={newTrackOrder} onChange={(e) => setNewTrackOrder(e.target.value)} placeholder="0" className="h-8 rounded-none border-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase text-muted-foreground block mb-1">Color</label>
            <div className="flex gap-1.5 flex-wrap">
              {TRACK_COLOR_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setNewTrackColorIdx(idx)}
                  className={`w-6 h-6 ${opt.color} border-2 ${newTrackColorIdx === idx ? 'border-foreground scale-110' : 'border-transparent'} transition-all`}
                  title={opt.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="h-7 px-3 rounded-none text-xs font-bold uppercase" disabled={createTrack.isPending}>
              <Plus className="w-3 h-3 mr-1" /> Create Track
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 px-3 rounded-none border-2 text-xs font-bold uppercase" onClick={() => setShowAddTrack(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="w-full h-9 rounded-none border-2 border-dashed text-xs font-bold uppercase gap-2" onClick={() => setShowAddTrack(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Track
        </Button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleEditor() {
  const { volunteer } = useAuth();
  const [activeTab, setActiveTab] = useState<'agenda' | 'breakouts'>('agenda');

  if (!volunteer?.isAdmin) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-mono text-xs font-black uppercase text-muted-foreground">Event Schedule</h2>
        <div className="flex border-2 border-border overflow-hidden">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase transition-colors ${
              activeTab === 'agenda' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-3 h-3" /> Agenda
          </button>
          <button
            onClick={() => setActiveTab('breakouts')}
            className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase transition-colors border-l-2 border-border ${
              activeTab === 'breakouts' ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3 h-3" /> Breakouts
          </button>
        </div>
      </div>

      {activeTab === 'agenda' ? <AgendaEditor /> : <BreakoutsEditor />}
    </section>
  );
}
