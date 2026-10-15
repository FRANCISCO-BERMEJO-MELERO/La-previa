import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { RoleCard } from './RoleCard';
import type { LunaRole } from './roles';

type RolesScreenProps = GameScreenProps & {
  role: LunaRole;
  /** Nombres de los otros lobos, para la carta del lobo. */
  pack: readonly string[];
};

/** El reparto: la carta ocupa la pantalla y el pie es del narrador. */
export function RolesScreen({ role, pack, ...chrome }: RolesScreenProps) {
  return (
    <GameScreen {...chrome}>
      <RoleCard role={role} pack={pack} headingLevel={1} />
    </GameScreen>
  );
}
