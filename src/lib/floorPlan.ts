// src/lib/floorPlan.ts
import { TableType } from './tables';

export type ZoneId = 'north' | 'west' | 'east' | 'south';

export interface PlanShelf {
    id: string;
    row: number; // sıra numarası (alttan başlar)
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface PlanTable {
    id: string; // veritabanındaki masa kimliği, örn. 'B-01'
    no: number; // ekranda görünen masa numarası
    label?: string; // numara yerine gösterilecek yazı (örn. O12)
    type: TableType;
    x: number;
    y: number;
    w: number;
    h: number;
}

// WC gibi sabit alanlar (dokunulmaz, sadece çizilir)
export interface PlanFixture {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface ZonePlan {
    width: number;
    height: number;
    outline: string; // bölgenin dış hattı (SVG path)
    railing: string; // boşluk tarafındaki korkuluk çizgisi (SVG points)
    shelves: PlanShelf[];
    tables: PlanTable[];
    fixtures?: PlanFixture[];
    minPixelWidth?: number; // plan bu genişlikten (dp) küçük çizilmez, ekrandan genişse yatay kaydırılır
}

/* ===================== BATI ===================== */

// Kitaplık sıraları alttan yukarı numaralı: 1. sıra en altta (2 kitaplık),
// 2-5. sıralar 3'er kitaplık
const SHELF_ROWS = [
    { row: 1, y: 516, count: 2 },
    { row: 2, y: 469, count: 3 },
    { row: 3, y: 422, count: 3 },
    { row: 4, y: 375, count: 3 },
    { row: 5, y: 328, count: 3 },
];
const SHELF_X = [62, 130, 198];

const WEST_SHELVES: PlanShelf[] = SHELF_ROWS.flatMap((r) =>
    Array.from({ length: r.count }, (_, i) => ({
        id: `S${r.row}-${i + 1}`,
        row: r.row,
        x: SHELF_X[i],
        y: r.y,
        w: 60,
        h: 14,
    }))
);

const westId = (no: number) => `B-${String(no).padStart(2, '0')}`;

const t4 = (no: number, x: number, y: number): PlanTable => ({
    id: westId(no), no, type: '4s', x, y, w: 50, h: 25,
});
const t8 = (no: number, x: number, y: number): PlanTable => ({
    id: westId(no), no, type: '8s', x, y, w: 28, h: 69,
});

const WEST_TABLES: PlanTable[] = [
    t8(1, 362, 137),  // balkon, üstteki 8'li
    t8(2, 362, 221),  // balkon, alttaki 8'li
    t4(3, 306, 69),   // 8'lilerin üstündeki 4'lü
    t4(4, 8, 179),    // üst duvar, sol
    t4(5, 64, 179),   // üst duvar, sağ
    t4(6, 276, 323),  // boşluk tarafı, 5. sıra
    t4(7, 276, 417),  // boşluk tarafı, 3. sıra
    t4(8, 276, 464),  // boşluk tarafı, 2. sıra
    t4(9, 6, 323),    // duvar tarafı, 5. sıra
    t4(10, 6, 393),   // duvar tarafı, 3. ile 4. sıra arası
    t4(11, 6, 464),   // duvar tarafı, 2. sıra
    t4(12, 6, 511),   // duvar tarafı, 1. sıra
    t4(13, 213, 561), // sağ alt, kitaplıkların gerisi
];

export const WEST_PLAN: ZonePlan = {
    width: 394,
    height: 612,
    outline:
        'M129 0 L359 0 L359 101 L394 101 L394 312 L328 312 L328 612 L191 612 L191 554 L0 554 L0 175 L129 175 Z',
    railing: '359,0 359,101 394,101 394,312 328,312 328,515',
    shelves: WEST_SHELVES,
    tables: WEST_TABLES,
};

/* ===================== DOĞU ===================== */

// 1. sıranın 2 kitaplığı sağa yaslı (soldaki boşlukta duvar girintisi var)
const EAST_SHELF_ROWS = [
    { row: 1, y: 432, xs: [182, 250] },
    { row: 2, y: 385, xs: [114, 182, 250] },
    { row: 3, y: 338, xs: [114, 182, 250] },
    { row: 4, y: 291, xs: [114, 182, 250] },
    { row: 5, y: 244, xs: [114, 182, 250] },
];

const EAST_SHELVES: PlanShelf[] = EAST_SHELF_ROWS.flatMap((r) =>
    r.xs.map((x, i) => ({
        id: `S${r.row}-${i + 1}`,
        row: r.row,
        x,
        y: r.y,
        w: 60,
        h: 14,
    }))
);

const eastId = (no: number) => `D-${String(no).padStart(2, '0')}`;

const e4 = (no: number, x: number, y: number): PlanTable => ({
    id: eastId(no), no, type: '4s', x, y, w: 50, h: 25,
});
const e8 = (no: number, x: number, y: number): PlanTable => ({
    id: eastId(no), no, type: '8s', x, y, w: 28, h: 69,
});

const EAST_TABLES: PlanTable[] = [
    e8(1, 13, 101),   // balkon, üstteki 8'li
    e8(2, 13, 173),   // balkon, alttaki 8'li
    e4(3, 72, 66),    // 8'lilerin üstündeki 4'lü
    e4(4, 259, 170),  // üst duvar, yan yana ikili (sol)
    e4(5, 323, 170),  // üst duvar, yan yana ikili (sağ)
    e4(6, 322, 262),  // duvar tarafı, 5. ile 4. sıranın ortası
    e4(7, 322, 333),  // duvar tarafı, 3. sıra
    e4(8, 322, 380),  // duvar tarafı, 2. sıra
    e4(9, 322, 427),  // duvar tarafı, 1. sıra
    e4(10, 57, 239),  // boşluk tarafı, 5. sıra
    e4(11, 57, 333),  // boşluk tarafı, 3. sıra
    e4(12, 57, 410),  // boşluk tarafı, hiçbir sırayla hizalı değil
    e4(13, 70, 481),  // boşluk tarafı, alttaki duvar girintisi
];

const EAST_FIXTURES: PlanFixture[] = [
    { id: 'wc-bay', label: 'Bay WC', x: 228, y: 64, w: 56, h: 32 },
    { id: 'wc-bayan', label: 'Bayan WC', x: 228, y: 98, w: 56, h: 32 },
];

export const EAST_PLAN: ZonePlan = {
    width: 383,
    height: 514,
    outline:
        'M70 0 L284 0 L284 160 L383 160 L383 472 L151 472 L151 514 L55 514 L55 245 L0 245 L0 98 L70 98 Z',
    railing: '70,0 70,98 0,98 0,245 55,245 55,458',
    shelves: EAST_SHELVES,
    tables: EAST_TABLES,
    fixtures: EAST_FIXTURES,
};

/* ===================== GÜNEY ===================== */

const southId = (no: number) => `G-${String(no).padStart(2, '0')}`;
const roomId = (no: number) => `O-${String(no).padStart(2, '0')}`;

// Boşluk kenarında yan yana 7 adet 4'lü masa
const s4 = (no: number, x: number): PlanTable => ({
    id: southId(no), no, type: '4s', x, y: 10, w: 50, h: 25,
});

// 6'lı masalar dikey (kitaplıklarla aynı yönde)
const s6 = (no: number, x: number, y: number): PlanTable => ({
    id: southId(no), no, type: '6s', x, y, w: 28, h: 56,
});

// Tek kişilik özel çalışma odaları
const room = (no: number, x: number, y: number): PlanTable => ({
    id: roomId(no), no, label: `O${no}`, type: '1s', x, y, w: 58, h: 48,
});

const SOUTH_TABLES: PlanTable[] = [
    s4(1, 3), s4(2, 58), s4(3, 113), s4(4, 168), s4(5, 223), s4(6, 278), s4(7, 333),
    s6(8, 71, 262), s6(9, 71, 322),
    s6(10, 116, 262), s6(11, 116, 322),
    s6(12, 161, 262), s6(13, 161, 322),
    s6(14, 206, 262), s6(15, 206, 322),
    s6(16, 251, 282), s6(17, 251, 342), // en sağdaki sütun biraz daha geride
    // Sağ duvar: 1'den 6'ya yukarıdan aşağı
    room(1, 401, 92), room(2, 401, 142), room(3, 401, 192),
    room(4, 401, 242), room(5, 401, 292), room(6, 401, 342),
    // Sol duvar: 12 en üstte, 7 en altta
    room(12, 0, 92), room(11, 0, 142), room(10, 0, 192),
    room(9, 0, 242), room(8, 0, 292), room(7, 0, 342),
];

// Kitaplık sütunları (soldan sağa). Her kitaplık ayrı bir kutu (14 x 26).
const SOUTH_SHELF_COLUMNS = [
    { x: 123, ys: [61, 89, 117, 175, 203] },       // 5 kitaplık (3 + 2)
    { x: 168, ys: [61, 89, 117, 163, 191, 219] },  // 6 kitaplık (3 + 3)
    { x: 213, ys: [61, 89, 117, 163, 191, 219] },  // 6 kitaplık (3 + 3)
    { x: 258, ys: [127, 155, 183, 211, 239] },     // 5 kitaplık, biraz daha geride
];

const SOUTH_SHELVES: PlanShelf[] = SOUTH_SHELF_COLUMNS.flatMap((c, ci) =>
    c.ys.map((y, i) => ({
        id: `K${ci + 1}-${i + 1}`,
        row: ci + 1,
        x: c.x,
        y,
        w: 14,
        h: 26,
    }))
);

export const SOUTH_PLAN: ZonePlan = {
    width: 459,
    height: 400,
    outline: 'M0 0 L386 0 L386 90 L459 90 L459 400 L0 400 Z',
    railing: '0,0 386,0',
    shelves: SOUTH_SHELVES,
    tables: SOUTH_TABLES,
};

/* ===================== KUZEY ===================== */

const northId = (no: number) => `K-${String(no).padStart(2, '0')}`;

// Üst sıra: duvara yakın 8'li ve 2'li masalar. Alt sıra: kitaplıklara yakın 6'lı masalar.
const n8 = (no: number, x: number): PlanTable => ({
    id: northId(no), no, type: '8s', x, y: 10, w: 28, h: 69,
});
const n2 = (no: number, x: number): PlanTable => ({
    id: northId(no), no, type: '2s', x, y: 43, w: 28, h: 36,
});
const n6 = (no: number, x: number): PlanTable => ({
    id: northId(no), no, type: '6s', x, y: 83, w: 28, h: 56,
});

const NORTH_TABLES: PlanTable[] = [
    n8(1, 90), n6(2, 90),    // 2. sütun
    n8(3, 134), n6(4, 134),   // 3. sütun
    n8(5, 178), n6(6, 178),   // 4. sütun
    n2(7, 222), n6(8, 222),   // 5. sütun
    n2(9, 266), n6(10, 266),  // 6. sütun
    n2(11, 310), n6(12, 310), // 7. sütun
    n6(13, 354),              // 8. sütun (sadece 6'lı)
    n8(14, 486), n6(15, 486), // 11. sütun
    n8(16, 530), n6(17, 530), // 12. sütun
    n8(18, 618), n6(19, 618), // 14. sütun
];

// 14 kitaplık sütunu (soldan sağa), her kitaplık 14 x 26.
// 1-11. sütunlar biraz daha içeride (aşağıda), 12-14. sütunların iç uçları aynı hizada.
const NORTH_SHELF_X = [53, 97, 141, 185, 229, 273, 317, 361, 405, 449, 493, 537, 581, 625];
const SHELF_Y_INNER = [173, 201, 229, 257]; // 1-11. sütunlar
const SHELF_Y_RIGHT = [145, 173, 201, 229]; // 12 ve 14. sütunlar
const SHELF_Y_COL13 = [173, 201, 229];      // 13. sütun: duvar tarafındaki kitaplık yok

const NORTH_SHELVES: PlanShelf[] = NORTH_SHELF_X.flatMap((x, ci) => {
    const col = ci + 1;
    const ys = col <= 11 ? SHELF_Y_INNER : col === 13 ? SHELF_Y_COL13 : SHELF_Y_RIGHT;
    return ys.map((y, i) => ({ id: `K${col}-${i + 1}`, row: col, x, y, w: 14, h: 26 }));
});

export const NORTH_PLAN: ZonePlan = {
    width: 702,
    height: 335,
    outline: 'M20 0 L682 0 L682 335 L20 335 Z',
    railing: '0,0 0,0', // bu bölgede korkuluk çizgisi yok
    shelves: NORTH_SHELVES,
    tables: NORTH_TABLES,
    minPixelWidth: 700,
};

// Planı hazır olan bölgeler. Diğer bölgeleri sonra ekleriz.
export const ZONE_PLANS: Partial<Record<ZoneId, ZonePlan>> = {
    north: NORTH_PLAN,
    west: WEST_PLAN,
    east: EAST_PLAN,
    south: SOUTH_PLAN,
};