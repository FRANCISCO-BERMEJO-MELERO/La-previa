import { playerById, players, type Player } from '@/games/rounds/game-view';
import type { QuePrefieresGameState, QuePrefieresOption, Snapshot } from '@/lib/snapshot';

/** Datos propios de ¿Qué prefieres?, deducidos de la foto. */

export type OptionRow = {
  option: QuePrefieresOption;
  text: string;
  /** Quienes la han elegido; vacío hasta la revelación. */
  choosers: Player[];
  majority: boolean;
};

export function optionText(game: QuePrefieresGameState, option: QuePrefieresOption): string {
  return option === 'a' ? game.option_a : game.option_b;
}

/** Las dos opciones con quién ha elegido cada una. */
export function optionRows(snapshot: Snapshot, game: QuePrefieresGameState): OptionRow[] {
  const all = players(snapshot, game);
  return (['a', 'b'] as const).map((option) => ({
    option,
    text: optionText(game, option),
    choosers: (game.choices?.[option] ?? []).flatMap((id) => playerById(all, id) ?? []),
    majority: game.majority === option,
  }));
}
