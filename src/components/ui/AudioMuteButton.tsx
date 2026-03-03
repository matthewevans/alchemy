import { useAudioStore } from '@audio/audioStore';
import { gameButtonClass } from './buttonStyles';

interface AudioMuteButtonProps {
  className: string;
}

export function AudioMuteButton({ className }: AudioMuteButtonProps) {
  const isMuted = useAudioStore((s) => s.isMuted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  return (
    <button
      className={gameButtonClass({
        tone: 'slate',
        size: 'sm',
        className,
      })}
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
      title={isMuted ? 'Unmute audio' : 'Mute audio'}
    >
      {isMuted ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="m3 3 18 18" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="M11 5 6 9H3v6h3l5 4V5Z" />
          <path d="M15 9.5a4.5 4.5 0 0 1 0 5" />
          <path d="M18 7a8 8 0 0 1 0 10" />
        </svg>
      )}
    </button>
  );
}
