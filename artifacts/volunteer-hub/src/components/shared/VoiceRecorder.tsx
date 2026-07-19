import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2, Loader2, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VoicePlayer from './VoicePlayer';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const MAX_SECONDS = 120;
const WARN_SECONDS = 90;

function getMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type RecordingState = 'requesting' | 'denied' | 'recording' | 'preview' | 'uploading';

interface VoiceRecorderProps {
  /** Supabase Storage folder path (e.g. channel id or "broadcast") */
  uploadFolder: string;
  onSend: (url: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ uploadFolder, onSend, onCancel, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('requesting');
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeType = useRef(getMimeType());

  // Start recording immediately on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const recorder = new MediaRecorder(
          stream,
          mimeType.current ? { mimeType: mimeType.current } : undefined
        );
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType.current || 'audio/webm' });
          blobRef.current = blob;
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          if (mounted) setState('preview');
        };

        recorder.start(250);
        setState('recording');

        // Elapsed timer
        let seconds = 0;
        timerRef.current = setInterval(() => {
          seconds++;
          if (mounted) setElapsed(seconds);
          if (seconds >= MAX_SECONDS) stopRecording();
        }, 1000);
      } catch {
        if (mounted) setState('denied');
      }
    })();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
  };

  const handleSend = async () => {
    if (!blobRef.current) return;
    setState('uploading');
    setUploadError(null);
    try {
      const token = localStorage.getItem('vhub_token');
      const ext = mimeType.current.includes('mp4') ? 'mp4' : mimeType.current.includes('ogg') ? 'ogg' : 'webm';
      const form = new FormData();
      form.append('audio', blobRef.current, `recording.${ext}`);
      form.append('folder', uploadFolder);
      const res = await fetch(`${BASE}/api/messages/upload-voice-note`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      onSend(data.url);
    } catch (err) {
      setUploadError((err as Error).message ?? 'Upload failed. Please try again.');
      setState('preview');
    }
  };

  const handleDiscard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    onCancel();
  };

  // ── Denied ──────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border-2 border-destructive/30 p-3">
        <MicOff className="w-5 h-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-destructive">Microphone access denied</p>
          <p className="text-xs text-muted-foreground">Allow microphone access in your browser settings, then try again.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={onCancel} className="shrink-0 rounded-none border border-border">
          Close
        </Button>
      </div>
    );
  }

  // ── Requesting ──────────────────────────────────────────────
  if (state === 'requesting') {
    return (
      <div className="flex items-center gap-3 bg-muted/50 border-2 border-border p-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">Requesting microphone…</p>
        <Button size="sm" variant="ghost" onClick={onCancel} className="shrink-0 rounded-none border border-border">
          Cancel
        </Button>
      </div>
    );
  }

  // ── Recording ───────────────────────────────────────────────
  if (state === 'recording') {
    const nearLimit = elapsed >= WARN_SECONDS;
    return (
      <div className={`flex items-center gap-3 border-2 p-3 ${nearLimit ? 'bg-amber-50 dark:bg-amber-950 border-amber-500' : 'bg-card border-border'}`}>
        {/* Pulsing red dot */}
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
        </span>
        <span className={`font-mono text-sm font-bold tabular-nums flex-1 ${nearLimit ? 'text-amber-700 dark:text-amber-400' : ''}`}>
          {formatTime(elapsed)}
          {nearLimit && <span className="text-[10px] font-normal ml-2 uppercase">({MAX_SECONDS - elapsed}s left)</span>}
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={stopRecording}
          disabled={disabled}
          className="rounded-none border-2 font-bold uppercase gap-1.5 h-9"
        >
          <Square className="w-3.5 h-3.5" /> Stop
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { stopRecording(); onCancel(); }} className="rounded-none border border-border h-9 px-2 text-muted-foreground">
          Cancel
        </Button>
      </div>
    );
  }

  // ── Preview ─────────────────────────────────────────────────
  if (state === 'preview' && previewUrl) {
    return (
      <div className="border-2 border-border bg-card p-3 space-y-2">
        <VoicePlayer src={previewUrl} compact />
        {uploadError && (
          <p className="text-xs text-destructive font-mono">{uploadError}</p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSend}
            disabled={disabled}
            className="flex-1 h-9 rounded-none border-2 font-bold uppercase gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Send Voice Note
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDiscard}
            className="h-9 rounded-none border-2 font-bold uppercase gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="w-3.5 h-3.5" /> Discard
          </Button>
        </div>
      </div>
    );
  }

  // ── Uploading ────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-3 bg-muted/50 border-2 border-border p-3">
      <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
      <p className="text-sm font-mono text-muted-foreground flex-1">Uploading voice note…</p>
    </div>
  );
}

/** Standalone mic trigger button — shown in compose toolbar when recorder is not active */
export function MicButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  if (typeof MediaRecorder === 'undefined') return null; // browser doesn't support it
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Record voice note"
      className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
