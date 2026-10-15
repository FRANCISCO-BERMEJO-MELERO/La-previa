import { Stepper } from '@/components/Stepper';
import { copy } from '@/lib/copy';
import { maxWolves, toggleRole, villagerCount, type LunaConfig } from './composition';
import { RoleArt } from './RoleArt';
import { optionalRoles, roleBackground } from './roles';

type LunaSettingsProps = {
  players: number;
  config: LunaConfig;
  onChange: (config: LunaConfig) => void;
};

/** Ajustes del anfitrión en la sala de espera: lobos, roles opcionales y la composición. */
export function LunaSettings({ players, config, onChange }: LunaSettingsProps) {
  const texts = copy.lunaLlena.lobby;
  const roleNames = config.roles.map((role) => copy.lunaLlena.spokenRoles[role]);
  return (
    <>
      <Stepper
        id="luna-wolves"
        label={texts.wolves}
        value={config.wolves}
        min={1}
        max={maxWolves(players)}
        fewerLabel={texts.fewerWolves}
        moreLabel={texts.moreWolves}
        onChange={(wolves) => {
          onChange({ ...config, wolves });
        }}
      />
      <div className="flex flex-col gap-2 rounded-chip border-3 border-ink bg-paper px-3.5 py-2.5">
        <p className="text-base font-bold" id="luna-roles-label">
          {texts.optionalRoles}
        </p>
        <div role="group" aria-labelledby="luna-roles-label" className="grid grid-cols-2 gap-2">
          {optionalRoles.map((role) => {
            const active = config.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChange(toggleRole(config, role));
                }}
                className={`flex h-12 min-w-0 items-center gap-2 rounded-control border-3 border-ink px-2 text-md font-bold ${
                  active ? 'bg-ink text-paper' : 'border-dashed bg-paper'
                }`}
              >
                <span
                  className={`w-9 shrink-0 overflow-hidden rounded-control border-2 border-ink ${roleBackground[role]}`}
                >
                  <RoleArt role={role} decorative />
                </span>
                <span className="truncate">{copy.lunaLlena.roles[role].name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="flex flex-col rounded-chip border-3 border-dashed border-ink px-3.5 py-2">
        <span className="text-label font-bold uppercase tracking-label">{texts.composition}</span>
        <span className="text-md font-bold">
          {texts.compositionLine(
            config.wolves,
            roleNames,
            Math.max(0, villagerCount(players, config)),
          )}
        </span>
      </p>
    </>
  );
}
