import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { PlayerChip } from '@/components/PlayerChip';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { DialogDemo } from './DialogDemo';

// Datos de ejemplo de la referencia.
const players = ['Fran', 'Lucía', 'Álvaro', 'Marta', 'Dani', 'Paula'];

export default function ComponentsPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <Screen brand={copy.brand} aside={<Pill>{copy.room.pill('KTRM')}</Pill>}>
      <h1 className="font-display text-display-sm uppercase">{copy.dev.title}</h1>

      <Section title={copy.dev.sections.buttons}>
        <Button fullWidth>{copy.home.create}</Button>
        <Button variant="accent" fullWidth>
          {copy.home.join}
        </Button>
        <div className="flex gap-3">
          <div className="flex flex-1">
            <Button variant="secondary" fullWidth>
              {copy.lobby.copyLink}
            </Button>
          </div>
          <div className="flex flex-1">
            <Button variant="secondary" fullWidth>
              {copy.lobby.showQr}
            </Button>
          </div>
        </div>
        <Button fullWidth disabled>
          {copy.dev.disabled}
        </Button>
      </Section>

      <Section title={copy.dev.sections.cards}>
        <Card>
          <p className="text-label font-bold uppercase tracking-label">{copy.lobby.codeLabel}</p>
          <p className="font-display text-7xl">KTRM</p>
        </Card>
        <Card variant="hero" tilt="left">
          <Pill tone="sky" caps>
            {copy.deal.wordPill}
          </Pill>
          <p className="font-display text-display-md uppercase">Paella</p>
        </Card>
        <Card variant="dark" tilt="right">
          <Pill tone="tomato" caps onDark>
            {copy.deal.impostorPill}
          </Pill>
          <p className="font-display text-display-md text-ground uppercase">
            {copy.deal.impostorTitle}
          </p>
        </Card>
        <Card variant="hero" tone="lime" tilt="left">
          <p className="font-display text-display-md uppercase">{copy.result.won}</p>
        </Card>
      </Section>

      <Section title={copy.dev.sections.pills}>
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="tomato" tilted>
            {copy.home.tagline}
          </Pill>
          <Pill>{copy.room.pill('KTRM')}</Pill>
          <Pill tone="sky" tilted>
            {copy.vote.pill}
          </Pill>
          <Pill tone="lilac" tilted>
            {copy.out.pill}
          </Pill>
          <Pill tone="orange" caps>
            {copy.late.pill}
          </Pill>
        </div>
      </Section>

      <Section title={copy.dev.sections.avatars}>
        <div className="flex flex-wrap items-center gap-2">
          {players.map((name, index) => (
            <Avatar key={name} name={name} joinIndex={index} muted={index === 5} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Avatar name="Álvaro" joinIndex={2} size="md" />
          <Avatar name="Álvaro" joinIndex={2} size="lg" />
        </div>
      </Section>

      <Section title={copy.dev.sections.chips}>
        <div className="grid grid-cols-2 gap-3">
          {players.map((name, index) => (
            <PlayerChip
              key={name}
              name={name}
              joinIndex={index}
              detail={
                index === 0 ? copy.lobby.host : index === 5 ? copy.lobby.disconnected : undefined
              }
              muted={index === 5}
            />
          ))}
          <PlayerChip name="Marta" detail={copy.vote.voted} />
          <PlayerChip name="Dani" detail={copy.vote.thinking} muted />
        </div>
      </Section>

      <Section title={copy.dev.sections.waiting}>
        <WaitingBox>{copy.deal.waitingVote('Fran')}</WaitingBox>
      </Section>

      <Section title={copy.dev.sections.fields}>
        <Card>
          <TextField
            id="dev-code"
            label={copy.home.codeLabel}
            variant="code"
            maxLength={4}
            defaultValue="KTRM"
            autoComplete="off"
          />
        </Card>
        <Card>
          <TextField
            id="dev-name"
            label={copy.name.label}
            maxLength={14}
            defaultValue="Álvaro"
            autoComplete="off"
            error={copy.name.taken('Álvaro')}
          />
        </Card>
      </Section>

      <Section title={copy.dev.sections.dialog}>
        <DialogDemo />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg uppercase">{title}</h2>
      {children}
    </section>
  );
}
