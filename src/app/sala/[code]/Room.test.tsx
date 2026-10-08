import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RoomSync } from '@/lib/use-room-sync';
import { lobbySnapshot } from '@/test/fixtures';
import { Room } from './Room';

const mocks = vi.hoisted(() => ({ sync: vi.fn<() => Partial<RoomSync>>() }));

vi.mock('@/lib/use-room-sync', () => ({ useRoomSync: mocks.sync }));

beforeEach(() => {
  mocks.sync.mockReset();
});

describe('Room', () => {
  it('en la sala de espera muestra la lista de jugadores', () => {
    mocks.sync.mockReturnValue({ status: 'ready', snapshot: lobbySnapshot(), offline: false });
    render(<Room initial={lobbySnapshot()} />);
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('si la sala desaparece lo explica', () => {
    mocks.sync.mockReturnValue({ status: 'gone', snapshot: null, offline: false });
    render(<Room initial={lobbySnapshot()} />);
    expect(screen.getByRole('heading', { name: 'Esta sala no existe' })).toBeInTheDocument();
  });
});
