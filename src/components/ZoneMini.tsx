// src/components/ZoneMini.tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path, Polyline, Rect } from 'react-native-svg';

import { LibraryDesk } from '../lib/tables';
import { ZonePlan as ZonePlanData } from '../lib/floorPlan';

const COLORS = { free: '#22c55e', partial: '#f59e0b', full: '#ef4444', unknown: '#cbd5e1' };

function getColor(desk?: LibraryDesk) {
    if (!desk) return COLORS.unknown;
    const free = desk.seats.filter((s) => !s.isOccupied).length;
    if (free === 0) return COLORS.full;
    if (free === desk.seats.length) return COLORS.free;
    return COLORS.partial;
}

// Bir bölgenin küçültülmüş çizimi: dış hat, kitaplıklar, doluluğa göre renkli masalar
export function ZoneShapes({
    plan,
    desks,
    tint,
    stroke,
}: {
    plan: ZonePlanData;
    desks: LibraryDesk[];
    tint?: string;
    stroke?: string;
}) {
    return (
        <G>
            <Path d={plan.outline} fill={tint ?? '#f8fafc'} stroke={stroke ?? '#cbd5e1'} strokeWidth={3} />
            {plan.shelves.map((s) => (
                <Rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill="#cbd5e1" />
            ))}
            {plan.tables.map((t) => (
                <Rect
                    key={t.id}
                    x={t.x + 2}
                    y={t.y + 2}
                    width={t.w - 4}
                    height={t.h - 4}
                    rx={3}
                    fill={getColor(desks.find((d) => d.id === t.id))}
                />
            ))}
        </G>
    );
}

// Tek bölgelik küçük plan (şu an ana sayfada kullanılmıyor)
export default function ZoneMini({ plan, desks }: { plan: ZonePlanData; desks: LibraryDesk[] }) {
    const PAD = 4;
    const vbW = plan.width + PAD * 2;
    const vbH = plan.height + PAD * 2;

    return (
        <View
            pointerEvents="none"
            style={{ width: '100%', aspectRatio: vbW / vbH, maxHeight: 170, alignSelf: 'center', marginBottom: 10 }}
        >
            <Svg width="100%" height="100%" viewBox={`${-PAD} ${-PAD} ${vbW} ${vbH}`}>
                <ZoneShapes plan={plan} desks={desks} />
                <Polyline points={plan.railing} fill="none" stroke="#94a3b8" strokeWidth={7} />
            </Svg>
        </View>
    );
}