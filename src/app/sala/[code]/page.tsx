import { roomCodeSchema } from '@/lib/snapshot';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { RoomEntry } from './RoomEntry';

type RoomPageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const [{ code }, { nueva }] = await Promise.all([params, searchParams]);
  const parsed = roomCodeSchema.safeParse(code.toUpperCase());
  if (!parsed.success) return <RoomGoneScreen />;
  return <RoomEntry code={parsed.data} fresh={nueva !== undefined} />;
}
