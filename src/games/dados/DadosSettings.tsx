import { Avatar } from '@/components/Avatar';
import { copy } from '@/lib/copy';
import type { DadosMode, RoomPlayer } from '@/lib/snapshot';
import { DADOS_CHOICES, teamSize, teamsFrom, type DadosChoice } from './teams';

type DadosSettingsProps = {
  players: readonly RoomPlayer[];
  mode: DadosMode;
  /** La elección de cada jugador, en el orden de `players`. */
  choices: readonly DadosChoice[];
  onModeChange: (mode: DadosMode) => void;
  onChoose: (userId: string, choice: DadosChoice) => void;
};

const MODES = ['1v1', '2v2'] as const satisfies readonly DadosMode[];

const chosenClasses: Record<DadosChoice, string> = {
  A: 'bg-sky',
  B: 'bg-lilac',
  watch: 'bg-ground-soft',
};

/** Ajustes del anfitrión: la modalidad y quién juega en cada equipo. */
export function DadosSettings({
  players,
  mode,
  choices,
  onModeChange,
  onChoose,
}: DadosSettingsProps) {
  const texts = copy.dados.lobby;
  const teams = teamsFrom(players, choices);
  const size = teamSize(mode);
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-label font-bold uppercase tracking-label" id="dados-mode-label">
          {texts.mode}
        </p>
        <div role="group" aria-labelledby="dados-mode-label" className="grid grid-cols-2 gap-3">
          {MODES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === mode}
              onClick={() => {
                onModeChange(option);
              }}
              className={`flex h-12 items-center justify-center rounded-control border-3 border-ink font-display text-md uppercase ${
                option === mode ? 'bg-ink text-paper' : 'bg-paper'
              }`}
            >
              {texts.modes[option]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label font-bold uppercase tracking-label" id="dados-who-label">
            {texts.who}
          </p>
          <div className="flex gap-2">
            {(['A', 'B'] as const).map((side) => {
              const count = teams[side].length;
              return (
                <span
                  key={side}
                  aria-label={texts.countLabel(side, count, size)}
                  className={`rounded-full border-3 border-ink px-2.5 py-0.5 text-label font-bold ${
                    count === size ? 'bg-lime' : 'border-dashed bg-ground-soft'
                  }`}
                >
                  {texts.count(side, count, size)}
                </span>
              );
            })}
          </div>
        </div>
        <ul aria-labelledby="dados-who-label" className="flex flex-col gap-2">
          {players.map((player, index) => (
            <li
              key={player.user_id}
              className="flex items-center gap-2 rounded-chip border-3 border-ink bg-paper p-2"
            >
              <Avatar name={player.name} joinIndex={index} avatar={player.avatar} />
              <span className="min-w-0 flex-1 truncate text-base font-bold">{player.name}</span>
              <span className="flex shrink-0 gap-1.5">
                {DADOS_CHOICES.map((choice) => {
                  const chosen = choices[index] === choice;
                  return (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={chosen}
                      aria-label={texts.choiceLabel(player.name, choice)}
                      onClick={() => {
                        onChoose(player.user_id, choice);
                      }}
                      className={`flex h-11 items-center justify-center rounded-control border-3 border-ink font-display text-md uppercase ${
                        choice === 'watch' ? 'px-2' : 'w-11'
                      } ${chosen ? chosenClasses[choice] : 'border-dashed bg-paper'}`}
                    >
                      {texts.choices[choice]}
                    </button>
                  );
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
