import type { ReactNode } from 'react';
import { copy } from '@/lib/copy';
import type { GameId } from '@/lib/snapshot';

// Ilustraciones de los pasos de "Cómo se juega", hechas con formas como las portadas del selector.

type Tone = 'paper' | 'tomato' | 'sky' | 'lime' | 'lilac' | 'orange' | 'ink';

const tones: Record<Tone, string> = {
  paper: 'bg-paper text-ink',
  tomato: 'bg-tomato text-ink',
  sky: 'bg-sky text-ink',
  lime: 'bg-lime text-ink',
  lilac: 'bg-lilac text-ink',
  orange: 'bg-orange text-ink',
  ink: 'bg-ink text-paper',
};

function Face({ tone = 'paper' }: { tone?: Tone }) {
  const eyes = tone === 'ink' ? 'bg-ground' : 'bg-ink';
  return (
    <span
      className={`flex size-12 shrink-0 items-center justify-center gap-2 rounded-full border-3 border-ink ${tones[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${eyes}`} />
      <span className={`size-1.5 rounded-full ${eyes}`} />
    </span>
  );
}

function Tag({
  children,
  tone = 'paper',
  tilt = '',
  struck = false,
}: {
  children: ReactNode;
  tone?: Tone;
  tilt?: '' | '-rotate-4' | 'rotate-3';
  struck?: boolean;
}) {
  return (
    <span
      className={`rounded-control border-3 border-ink px-2.5 py-0.5 font-display text-base uppercase ${tones[tone]} ${tilt} ${struck ? 'line-through decoration-4' : ''}`}
    >
      {children}
    </span>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  return (
    <span className="-rotate-3 rounded-chip rounded-bl-none border-3 border-ink bg-paper px-3 py-1 font-display text-lg">
      {children}
    </span>
  );
}

function Point() {
  return (
    <span className="rotate-4 rounded-full border-3 border-ink bg-paper px-2 font-display text-lg">
      {copy.howTo.art.point}
    </span>
  );
}

function Column({ children }: { children: ReactNode }) {
  return <span className="flex flex-col items-center gap-2">{children}</span>;
}

const art = copy.howTo.art;

export const howToIllustrations: Record<GameId, readonly ReactNode[]> = {
  impostor: [
    <>
      <Tag tilt="-rotate-4">{art.word}</Tag>
      <Tag>{art.word}</Tag>
      <Tag tone="ink" tilt="rotate-3">
        {art.secret}
      </Tag>
    </>,
    <>
      <Column>
        <Bubble>{art.clue}</Bubble>
        <Face />
      </Column>
      <Column>
        <Bubble>{art.dots}</Bubble>
        <Face tone="ink" />
      </Column>
    </>,
    <>
      <Face />
      <Column>
        <Tag tone="tomato">{art.out}</Tag>
        <Face tone="ink" />
      </Column>
      <Face />
    </>,
  ],
  probable: [
    <Bubble key="question">{art.who}</Bubble>,
    <>
      <Face />
      <Face tone="lime" />
      <Face />
    </>,
    <>
      <Face tone="lime" />
      <Point />
    </>,
  ],
  quien_lo_dijo: [
    <>
      <Tag tilt="-rotate-4">{art.answerA}</Tag>
      <Tag tilt="rotate-3">{art.answerB}</Tag>
    </>,
    <>
      <Bubble>{art.unknown}</Bubble>
      <Face tone="lilac" />
      <Face />
    </>,
    <>
      <Face tone="lilac" />
      <Point />
    </>,
  ],
  una_pista: [
    <>
      <Face tone="ink" />
      <Tag>{art.word}</Tag>
    </>,
    <>
      <Column>
        <Tag>{art.clue}</Tag>
        <Tag struck>{art.clue}</Tag>
      </Column>
      <Tag tilt="rotate-3">{art.otherClue}</Tag>
    </>,
    <>
      <Face tone="lime" />
      <Face tone="lime" />
      <Point />
    </>,
  ],
  que_prefieres: [
    <>
      <Tag tilt="-rotate-4">{art.optionA}</Tag>
      <span className="font-display text-xl uppercase">{art.or}</span>
      <Tag tone="ink" tilt="rotate-3">
        {art.optionB}
      </Tag>
    </>,
    <>
      <Column>
        <Tag tone="ink">{art.secret}</Tag>
        <Face />
      </Column>
      <Column>
        <Tag tone="ink">{art.secret}</Tag>
        <Face />
      </Column>
    </>,
    <>
      <Tag tone="lime">{art.optionA}</Tag>
      <Point />
    </>,
  ],
  palabras_prohibidas: [
    <>
      <Tag tone="ink">{art.word}</Tag>
      <Column>
        <Tag struck>{art.forbiddenA}</Tag>
        <Tag struck>{art.forbiddenB}</Tag>
      </Column>
    </>,
    <>
      <Face />
      <Tag tone="tomato" tilt="rotate-3">
        {art.forbiddenCall}
      </Tag>
    </>,
    <>
      <Column>
        <Bubble>{art.shout}</Bubble>
        <Face tone="lime" />
      </Column>
      <Point />
    </>,
  ],
};
