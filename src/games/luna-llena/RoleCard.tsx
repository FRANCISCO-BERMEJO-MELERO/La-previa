import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { RoleArt } from './RoleArt';
import { roleBackground, teamOf, type LunaRole, type Team } from './roles';

const youAreTone = {
  wolf: 'tomato',
  villager: 'orange',
  seer: 'lilac',
  protector: 'sky',
  hunter: 'lime',
  jester: 'ground-soft',
  cupid: 'field-error',
  // La píldora no tiene tonos `field` ni `ground`: se usa el más cercano.
  witch: 'lime',
  killer: 'ground-soft',
} as const satisfies Record<LunaRole, string>;

const teamTone = {
  village: 'lime',
  wolves: 'tomato',
  solo: 'lilac',
} as const satisfies Record<Team, string>;

type RoleCardProps = {
  role: LunaRole;
  /** Nombres de los otros lobos; solo se enseñan en la carta del lobo. */
  pack: readonly string[];
  /** En el reparto el nombre del rol es el titular de la página. */
  headingLevel: 1 | 2;
};

/** La carta de rol del anexo de docs/PLAN-5.md: blanca, salvo la del lobo, que es oscura. */
export function RoleCard({ role, pack, headingLevel }: RoleCardProps) {
  const wolf = role === 'wolf';
  const team = teamOf(role);
  const { name, effect } = copy.lunaLlena.roles[role];
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <Card variant={wolf ? 'dark' : 'hero'} tilt={wolf ? 'right' : 'left'} grow>
      <Pill tone={youAreTone[role]} caps onDark={wolf}>
        {copy.lunaLlena.card.youAre}
      </Pill>
      <div
        className={`overflow-hidden rounded-button border-3 ${wolf ? 'border-paper' : 'border-ink'} ${roleBackground[role]}`}
      >
        <RoleArt role={role} />
      </div>
      <Heading
        className={`font-display uppercase ${fitDisplay(name, 'text-display-md')} ${wolf ? 'text-ground' : ''}`}
      >
        {name}
      </Heading>
      <Pill tone={teamTone[team]} onDark={wolf}>
        {copy.lunaLlena.teams[team]}
      </Pill>
      <p className="text-base font-medium">{effect}</p>
      {wolf ? (
        <div className="flex flex-col gap-1 border-t-3 border-paper pt-3.5">
          <p className="text-sm font-bold">{copy.lunaLlena.card.pack}</p>
          <p className="font-display text-lg uppercase">{copy.lunaLlena.card.packNames(pack)}</p>
        </div>
      ) : null}
    </Card>
  );
}
