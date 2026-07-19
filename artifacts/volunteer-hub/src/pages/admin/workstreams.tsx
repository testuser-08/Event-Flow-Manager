import { useState, useMemo } from 'react';
import { useListVolunteers } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { ArrowLeft, ChevronDown, ChevronRight, Search, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Volunteer = { id: string; name: string; email: string; workstreams: string[]; is_admin: boolean };

export default function AdminWorkstreams() {
  const { data: volunteers, isLoading } = useListVolunteers();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Build workstream → members map from live data
  const workstreamMap = useMemo(() => {
    const map = new Map<string, Volunteer[]>();
    for (const v of (volunteers ?? []) as Volunteer[]) {
      for (const ws of v.workstreams ?? []) {
        if (!map.has(ws)) map.set(ws, []);
        map.get(ws)!.push(v);
      }
    }
    // Sort each workstream's members by name
    for (const members of map.values()) {
      members.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Return sorted by workstream name
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [volunteers]);

  // Search mode: find people across all workstreams
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const seen = new Set<string>();
    const hits: { volunteer: Volunteer; workstreams: string[] }[] = [];
    for (const v of (volunteers ?? []) as Volunteer[]) {
      if (seen.has(v.id)) continue;
      if (v.name.toLowerCase().includes(q) || v.email.toLowerCase().includes(q)) {
        seen.add(v.id);
        hits.push({ volunteer: v, workstreams: v.workstreams ?? [] });
      }
    }
    hits.sort((a, b) => a.volunteer.name.localeCompare(b.volunteer.name));
    return hits;
  }, [search, volunteers]);

  const toggle = (ws: string) => setExpanded(prev => prev === ws ? null : ws);

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20 overflow-y-auto">
      {/* Header */}
      <div className="bg-card border-b-2 border-border p-3 flex items-center gap-3 shrink-0">
        <Link href="/admin" className="p-2 -ml-2 hover:bg-muted rounded-none transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-black text-xl uppercase tracking-tighter leading-none">Workstream Members</h1>
          {!isLoading && (
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {workstreamMap.size} workstreams · {(volunteers ?? []).length} people
            </p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 pr-9 border-2 h-11 rounded-none focus-visible:ring-0 focus-visible:border-primary font-mono text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="font-mono text-sm text-muted-foreground">Loading roster…</div>
        ) : workstreamMap.size === 0 ? (
          <div className="bg-card border-2 border-dashed border-border p-8 text-center text-muted-foreground font-mono text-sm">
            No roster data yet. Upload a CSV on the Roster page.
          </div>
        ) : searchResults !== null ? (
          /* ── Search results ── */
          <div className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground uppercase font-bold">
              {searchResults.length === 0
                ? 'No matches'
                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
            </p>
            {searchResults.map(({ volunteer: v, workstreams }) => (
              <div key={v.id} className="bg-card border-2 border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{v.name}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{v.email}</p>
                  </div>
                </div>
                {workstreams.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {workstreams.map(ws => (
                      <span key={ws} className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        {ws}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Workstream accordion ── */
          <div className="space-y-2">
            {[...workstreamMap.entries()].map(([ws, members]) => {
              const isOpen = expanded === ws;
              return (
                <div key={ws} className="bg-card border-2 border-border">
                  {/* Workstream row */}
                  <button
                    onClick={() => toggle(ws)}
                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-bold text-sm uppercase truncate">{ws}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-bold bg-muted px-2 py-0.5 border border-border">
                        {members.length}
                      </span>
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Member list */}
                  {isOpen && (
                    <div className="border-t-2 border-border divide-y-2 divide-border">
                      {members.map(v => (
                        <div key={v.id} className="px-3 py-2.5 flex items-center gap-3">
                          {/* Avatar-style initials */}
                          <div className="w-7 h-7 shrink-0 bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <span className="text-[10px] font-black text-primary uppercase">
                              {v.name.trim().split(/\s+/).map((n: string) => n[0]).slice(0, 2).join('')}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate leading-tight">{v.name}</p>
                            <p className="text-xs font-mono text-muted-foreground truncate">{v.email}</p>
                          </div>
                          {v.is_admin && (
                            <span className="text-[9px] font-black font-mono uppercase px-1 py-0.5 bg-primary text-primary-foreground shrink-0">
                              ADMIN
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
