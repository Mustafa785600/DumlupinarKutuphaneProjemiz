// src/components/ZonePlan.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { LibraryDesk } from '../lib/tables';
import { ZonePlan as ZonePlanData } from '../lib/floorPlan';

type Status = 'free' | 'partial' | 'full' | 'unknown';

const COLORS: Record<Status, { fill: string; stroke: string }> = {
  free: { fill: '#dcfce7', stroke: '#16a34a' },
  partial: { fill: '#fef3c7', stroke: '#d97706' },
  full: { fill: '#fee2e2', stroke: '#dc2626' },
  unknown: { fill: '#f1f5f9', stroke: '#94a3b8' },
};

const LEGEND: { label: string; status: Status }[] = [
  { label: 'Hepsi boş', status: 'free' },
  { label: 'Kısmen dolu', status: 'partial' },
  { label: 'Dolu', status: 'full' },
];

function getStatus(desk?: LibraryDesk): Status {
  if (!desk) return 'unknown';
  const free = desk.seats.filter((s) => !s.isOccupied).length;
  if (free === 0) return 'full';
  if (free === desk.seats.length) return 'free';
  return 'partial';
}

interface Props {
  plan: ZonePlanData;
  desks: LibraryDesk[];
  onSelectDesk: (desk: LibraryDesk) => void;
}

export default function ZonePlan({ plan, desks, onSelectDesk }: Props) {
  const [containerW, setContainerW] = useState(0);

  const PAD = 4;
  const vbW = plan.width + PAD * 2;
  const vbH = plan.height + PAD * 2;

  // Plan geniş ise (örn. Kuzey) ekrandan büyük çizilir ve yatay kaydırılır
  const pixelW = Math.max(containerW, plan.minPixelWidth ?? 0);
  const pixelH = (pixelW * vbH) / vbW;
  const scrollable = pixelW > containerW + 1;

  // Yazılar ekranda yaklaşık aynı boyutta kalsın
  const scale = pixelW > 0 ? pixelW / vbW : 1;
  const fontMain = Math.max(11, 9.5 / scale);
  const fontSub = Math.max(9, 7.5 / scale);

  return (
    <View onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      {pixelW > 0 && (
        <ScrollView
          horizontal
          scrollEnabled={scrollable}
          showsHorizontalScrollIndicator={scrollable}
        >
          <Svg width={pixelW} height={pixelH} viewBox={`${-PAD} ${-PAD} ${vbW} ${vbH}`}>
            <Path
              d={plan.outline}
              fill="#ffffff"
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            <Polyline points={plan.railing} fill="none" stroke="#94a3b8" strokeWidth={3} />

            {plan.shelves.map((s) => (
              <Rect
                key={s.id}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx={2}
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth={0.8}
              />
            ))}

            {plan.fixtures?.map((f) => (
              <G key={f.id}>
                <Rect
                  x={f.x}
                  y={f.y}
                  width={f.w}
                  height={f.h}
                  rx={3}
                  fill="#f1f5f9"
                  stroke="#94a3b8"
                  strokeWidth={0.8}
                />
                <SvgText
                  x={f.x + f.w / 2}
                  y={f.y + f.h / 2 + 3}
                  fontSize={fontSub + 1}
                  fill="#475569"
                  textAnchor="middle"
                >
                  {f.label}
                </SvgText>
              </G>
            ))}

            {plan.tables.map((t) => {
              const desk = desks.find((d) => d.id === t.id);
              const c = COLORS[getStatus(desk)];
              const free = desk ? desk.seats.filter((s) => !s.isOccupied).length : 0;
              const total = desk ? desk.seats.length : 0;
              const cx = t.x + t.w / 2;
              const cy = t.y + t.h / 2;
              return (
                <G key={t.id} onPress={() => desk && onSelectDesk(desk)}>
                  {/* Dokunma alanını biraz büyüten görünmez katman */}
                  <Rect
                    x={t.x - 3}
                    y={t.y - 3}
                    width={t.w + 6}
                    height={t.h + 6}
                    fill="transparent"
                  />
                  <Rect
                    x={t.x}
                    y={t.y}
                    width={t.w}
                    height={t.h}
                    rx={4}
                    fill={c.fill}
                    stroke={c.stroke}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={cx}
                    y={cy - 2}
                    fontSize={fontMain}
                    fontWeight="bold"
                    fill="#0f172a"
                    textAnchor="middle"
                  >
                    {t.label ?? t.no}
                  </SvgText>
                  <SvgText
                    x={cx}
                    y={cy + fontSub}
                    fontSize={fontSub}
                    fill="#475569"
                    textAnchor="middle"
                  >
                    {desk ? `${free}/${total}` : ''}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      )}

      {scrollable && (
        <Text style={styles.scrollHint}>Planı sağa ve sola kaydırarak gezebilirsiniz</Text>
      )}

      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.status} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: COLORS[item.status].fill,
                  borderColor: COLORS[item.status].stroke,
                },
              ]}
            />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollHint: { textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
});