import { Avatar } from '@/components/Avatar';
import { avatarIds, type AvatarId } from '@/lib/avatars';
import { copy } from '@/lib/copy';

type AvatarPickerProps = {
  name: string;
  value: AvatarId | null;
  disabled?: boolean;
  onChange: (avatar: AvatarId | null) => void;
};

const options: readonly (AvatarId | null)[] = [null, ...avatarIds];

/** La galería de avatares, con la inicial como primera opción. */
export function AvatarPicker({ name, value, disabled = false, onChange }: AvatarPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label font-bold uppercase tracking-label">
        {copy.avatars.legend}
      </legend>
      <ul className="grid grid-cols-5 gap-2">
        {options.map((option) => {
          const pressed = option === value;
          return (
            <li key={option ?? 'initial'} className="flex justify-center">
              <button
                type="button"
                aria-label={option === null ? copy.avatars.initial : copy.avatars.names[option]}
                aria-pressed={pressed}
                disabled={disabled}
                onClick={() => {
                  onChange(option);
                }}
                className={`flex size-14 items-center justify-center rounded-full border-3 ${
                  pressed ? 'border-ink bg-ink' : 'border-transparent'
                }`}
              >
                <Avatar name={name || copy.avatars.placeholder} joinIndex={0} avatar={option} />
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
