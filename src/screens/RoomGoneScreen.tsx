import { LinkButton } from '@/components/Button';
import { copy } from '@/lib/copy';
import { StatusScreen } from './StatusScreen';

export function RoomGoneScreen() {
  return (
    <StatusScreen
      title={copy.room.notFoundTitle}
      text={copy.room.notFoundText}
      action={
        <LinkButton href="/" fullWidth>
          {copy.room.backHome}
        </LinkButton>
      }
    />
  );
}
