import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface VoicePlayerProps {
  src: string;
  /** compact = used in compose preview strip; default = full in-chat player */
  compact?: boolean;
  /** light = invert colors for use on dark (primary-blue) bubble backgrounds */
  light?: boolean;
  className?: string;
}

export default function VoicePlayer({ src, compact = false, light = false, className = '' }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };
    const onError = () => setError(true);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setError(true));
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground font-mono text-xs ${className}`}>
        <span>⚠ Audio unavailable</span>
      </div>
    );
  }

  const btnCls = light
    ? 'bg-white/90 text-primary'
    : 'bg-primary text-primary-foreground';
  const trackCls = light ? 'bg-white/30' : 'bg-border/60';
  const fillCls = light ? 'bg-white' : 'bg-primary';
  const timeCls = light ? 'text-white/70' : 'text-muted-foreground';

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          onClick={togglePlay}
          className={`w-7 h-7 flex items-center justify-center rounded-full shrink-0 ${btnCls}`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>
        <div className={`flex-1 h-1 ${trackCls} rounded-full overflow-hidden cursor-pointer`} onClick={handleProgressClick}>
          <div className={`h-full ${fillCls} transition-all`} style={{ width: `${progress * 100}%` }} />
        </div>
        <span className={`text-[10px] font-mono shrink-0 ${timeCls}`}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 shadow-sm ${btnCls}`}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div
        className={`flex-1 h-1.5 ${trackCls} rounded-full overflow-hidden cursor-pointer`}
        onClick={handleProgressClick}
      >
        <div className={`h-full ${fillCls} rounded-full transition-all`} style={{ width: `${progress * 100}%` }} />
      </div>
      <span className={`text-[11px] font-mono shrink-0 tabular-nums ${timeCls}`}>
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
}
