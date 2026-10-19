import { Bot } from 'lucide-react';

type PortraitType = 'humanoid' | 'quadruped' | 'amr';

/** Uses the supplied full-resolution artwork without a drawn frame or head mask. */
export function BotPortrait({ type, size = 28, blink = false }: { type: PortraitType; size?: number; blink?: boolean }) {
  if (type === 'amr') return <Bot size={size} aria-label="Mobile robot" />;
  const cat = type === 'quadruped';
  return <svg className={`bot-portrait ${blink ? 'bot-portrait-blink' : ''}`} width={size} height={size}
    viewBox={cat ? '0 0 1278 1230' : '0 0 1536 1024'} preserveAspectRatio="xMidYMid meet"
    role="img" aria-label={cat ? 'Cat robot' : 'Humanoid robot'}>
    <image href={cat ? '/icons/cat-transparent.png' : '/icons/bot-transparent.png'} width={cat ? 1278 : 1536} height={cat ? 1230 : 1024} />
    <g className="bot-portrait-eyes" fill="#fff">
      <ellipse cx={cat ? 386 : 501} cy={cat ? 762 : 521} rx={cat ? 59 : 70} ry={cat ? 101 : 119} />
      <ellipse cx={cat ? 762 : 889} cy={cat ? 772 : 521} rx={cat ? 59 : 70} ry={cat ? 101 : 119} />
    </g>
  </svg>;
}
