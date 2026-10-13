// src/components/FloorMap.tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ZONE_PLANS, ZoneId } from '../lib/floorPlan';
import { LibraryDesk } from '../lib/tables';
import { ZoneShapes } from './ZoneMini';

// Bölge planlarının kat üzerindeki yeri (x, y) ve etiketin oturacağı boş yer (lx, ly).
// shortcut: yerleşim kroktan elle ayarlandı, gerçek ölçü değil; kat planı değişirse buradaki sayıları düzelt.
const ZONES = [
    { id: 'north', name: 'Kuzey', x: 170, y: 0, lx: 521, ly: 313 },
    { id: 'west', name: 'Batı', x: 0, y: 335, lx: 214, ly: 420 },
    { id: 'east', name: 'Doğu', x: 659, y: 335, lx: 850, ly: 425 },
    { id: 'south', name: 'Güney', x: 328, y: 793, lx: 664, ly: 913 },
] as const;

// Doluluğa göre zemin, çizgi ve yazı rengi
const tone = (free: number, total: number) => {
    const p = total ? free / total : 0;
    if (p > 0.5) return { tint: '#f0fdf4', stroke: '#86efac', text: '#16a34a' };
    if (p > 0.2) return { tint: '#fffbeb', stroke: '#fcd34d', text: '#d97706' };
    return { tint: '#fef2f2', stroke: '#fca5a5', text: '#dc2626' };
};

interface Props {
    zones: Record<ZoneId, { desks: LibraryDesk[] }>;
    best: ZoneId;
    onPress: (zone: ZoneId) => void;
}

export default function FloorMap({ zones, best, onPress }: Props) {
    return (
        <View
            style={{
                width: '100%',
                aspectRatio: 1062 / 1253,
                marginBottom: 12,
                padding: 10,
                backgroundColor: '#ffffff',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
            }}
        >
            <Svg width="100%" height="100%" viewBox="-10 -50 1062 1253">
                <SvgText x={0} y={-14} fontSize={34} fontWeight="bold" fill="#0369a1">
                    Merkez Kütüphane · 3. Kat
                </SvgText>
                <SvgText x={1042} y={-14} fontSize={30} fill="#64748b" textAnchor="end">
                    Kuzey ↑
                </SvgText>

                {/* Orta boşluk: üstte merdiven (M), iki yanında birer asansör */}
                <Path
                    d="M359 335 L729 335 L729 433 L659 433 L659 580 L714 580 L714 793 L328 793 L328 647 L394 647 L394 436 L359 436 Z"
                    fill="#f1f5f9"
                    stroke="#94a3b8"
                    strokeWidth={4}
                    strokeDasharray="14 10"
                />
                <Rect x={431} y={347} width={36} height={36} rx={6} fill="#fff" stroke="#94a3b8" strokeWidth={3} />
                <Rect x={621} y={347} width={36} height={36} rx={6} fill="#fff" stroke="#94a3b8" strokeWidth={3} />
                <Circle cx={544} cy={365} r={22} fill="#fff" stroke="#94a3b8" strokeWidth={3} />
                <SvgText x={544} y={375} fontSize={28} fontWeight="800" fill="#334155" textAnchor="middle">M</SvgText>
                <SvgText x={449} y={410} fontSize={22} fill="#64748b" textAnchor="middle">Asansör</SvgText>
                <SvgText x={544} y={410} fontSize={22} fill="#64748b" textAnchor="middle">Merdiven</SvgText>
                <SvgText x={639} y={410} fontSize={22} fill="#64748b" textAnchor="middle">Asansör</SvgText>

                {ZONES.map((z) => {
                    const desks = zones[z.id].desks;
                    const free = desks.reduce((n, d) => n + d.seats.filter((s) => !s.isOccupied).length, 0);
                    const total = desks.reduce((n, d) => n + d.seats.length, 0);
                    const t = tone(free, total);
                    const isBest = best === z.id;
                    const wide = z.id === 'north'; // Kuzey'de boş yer dar bir şerit, etiket tek satır
                    const w = wide ? 250 : 120;
                    const h = wide ? 40 : 66;
                    return (
                        <G key={z.id} onPress={() => onPress(z.id)}>
                            <G transform={`translate(${z.x},${z.y})`}>
                                <ZoneShapes plan={ZONE_PLANS[z.id]!} desks={desks} tint={t.tint} stroke={t.stroke} />
                            </G>
                            <Rect
                                x={z.lx - w / 2}
                                y={z.ly - (wide ? 28 : 32)}
                                width={w}
                                height={h}
                                rx={wide ? 20 : 16}
                                fill={isBest ? '#0f172a' : '#ffffff'}
                                stroke={t.stroke}
                                strokeWidth={2}
                            />
                            {wide ? (
                                <SvgText x={z.lx} y={z.ly} fontSize={26} fontWeight="800" fill={isBest ? '#ffffff' : '#0f172a'} textAnchor="middle">
                                    {`${z.name} · ${free} boş`}
                                </SvgText>
                            ) : (
                                <>
                                    <SvgText x={z.lx} y={z.ly} fontSize={28} fontWeight="800" fill={isBest ? '#ffffff' : '#0f172a'} textAnchor="middle">
                                        {z.name}
                                    </SvgText>
                                    <SvgText x={z.lx} y={z.ly + 26} fontSize={22} fontWeight="700" fill={isBest ? '#bbf7d0' : t.text} textAnchor="middle">
                                        {`${free} boş`}
                                    </SvgText>
                                </>
                            )}
                        </G>
                    );
                })}
            </Svg>
        </View>
    );
}