import { roomCodeSchema } from '@/lib/snapshot';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { RoomEntry } from './RoomEntry';

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  const parsed = roomCodeSchema.safeParse(code.toUpperCase());
  if (!parsed.success) return <RoomGoneScreen />;
  return <RoomEntry code={parsed.data} />;
}
