// src/lib/tables.ts
export type TableType = '1s' | '2s' | '4s' | '6s' | '8s';

export interface ChairSeat {
  id: string;
  side: 'A' | 'B';
  number: number;
  isOccupied: boolean;
  occupantName?: string;
  isFriend?: boolean;
}

export interface LibraryDesk {
  id: string;
  label: string;
  capacity: 1 | 2 | 4 | 6 | 8;
  type: TableType;
  seats: ChairSeat[];
  friendName?: string;
}

// Her tarafta kaç sandalye olduğu.
// '1s' tek kişilik oda: sadece A tarafında 1 sandalye var.
const SEATS_PER_SIDE: Record<TableType, { A: number; B: number }> = {
  '1s': { A: 1, B: 0 },
  '2s': { A: 1, B: 1 },
  '4s': { A: 2, B: 2 },
  '6s': { A: 3, B: 3 },
  '8s': { A: 4, B: 4 },
};

export function buildSeats(tableId: string, type: TableType): ChairSeat[] {
  const counts = SEATS_PER_SIDE[type];
  const seats: ChairSeat[] = [];
  let number = 1;
  for (const side of ['A', 'B'] as const) {
    for (let i = 1; i <= counts[side]; i++) {
      seats.push({
        id: `${tableId}-${side}${i}`,
        side,
        number: number++,
        isOccupied: false,
      });
    }
  }
  return seats;
}

export function makeDesk(id: string, type: TableType, label?: string): LibraryDesk {
  const counts = SEATS_PER_SIDE[type];
  return {
    id,
    label: label ?? `Masa ${id}`,
    capacity: (counts.A + counts.B) as 1 | 2 | 4 | 6 | 8,
    type,
    seats: buildSeats(id, type),
  };
}