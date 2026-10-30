import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { LunaPlayer } from './game-view';
import { PlayerList } from './PlayerList';

const texts = copy.lunaLlena.hunter;

type HunterScreenProps = GameScreenProps & {
  candidates: readonly LunaPlayer[];
  selected: string | null;
  onSelect: (userId: string) => void;
  onShoot: () => void;
  busy: boolean;
  error?: string;
};

/** El cazador, ya muerto, elige a quién se lleva consigo. */
export function HunterScreen({
  candidates,
  selected,
  onSelect,
  onShoot,
  busy,
  error,
  ...chrome
}: HunterScreenProps) {
  const target = candidates.find((player) => player.userId === selected);
  return (
    <GameScreen {...chrome}>
      <Card variant="dark" tilt="right">
        <Pill tone="lime" caps onDark>
          {texts.pill}
        </Pill>
        <h1 className="font-display text-display-xs text-ground uppercase">{texts.title}</h1>
        <p className="text-base font-medium">{texts.hint}</p>
        <PlayerList
          label={copy.lunaLlena.vote.choose}
          players={candidates}
          selected={selected ? [selected] : []}
          onToggle={onSelect}
          onDark
        />
      </Card>
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      <Button fullWidth disabled={busy || !target} onClick={onShoot}>
        {target ? texts.submit(target.name) : texts.chooseTarget}
      </Button>
    </GameScreen>
  );
}
