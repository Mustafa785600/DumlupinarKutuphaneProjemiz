import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { makeDesk, ChairSeat, LibraryDesk, TableType } from '../lib/tables';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import ZonePlan from '../components/ZonePlan';
import ZoneMini from '../components/ZoneMini';
import FloorMap from '../components/FloorMap';
import { ZONE_PLANS, ZonePlan as ZonePlanData } from '../lib/floorPlan';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sade & Modern Üniversite Tasarım Sistemi
const THEME = {
  bg: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  primary: '#991b1b', // DPÜ Bordo / Kırmızı
  accentDark: '#0f172a',
  glowGreen: '#22c55e',
  occupiedRed: '#ef4444',
  availableGreen: '#16a34a',
  selectedBlue: '#0f172a',
};

// Bölge Tipi
type ZoneType = 'north' | 'west' | 'east' | 'south';

interface ZoneInfo {
  id: ZoneType;
  title: string;
  description: string;
  desks: LibraryDesk[];
}

// Batı bölgesi: B-01 ve B-02 8'li, B-03'ten B-13'e kadar 4'lü masalar
const WEST_TYPES: TableType[] = [
  '8s', '8s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s',
];
const westDesks = WEST_TYPES.map((type, i) => {
  const no = i + 1;
  return makeDesk(
    `B-${String(no).padStart(2, '0')}`,
    type,
    `Masa ${no} (${type === '8s' ? 8 : 4} Kişilik)`
  );
});

// Doğu bölgesi: D-01 ve D-02 8'li, D-03'ten D-13'e kadar 4'lü masalar
const EAST_TYPES: TableType[] = [
  '8s', '8s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s', '4s',
];
const eastDesks = EAST_TYPES.map((type, i) => {
  const no = i + 1;
  return makeDesk(
    `D-${String(no).padStart(2, '0')}`,
    type,
    `Masa ${no} (${type === '8s' ? 8 : 4} Kişilik)`
  );
});

// Güney bölgesi: G-01..G-07 4'lü, G-08..G-17 6'lı masalar, O-01..O-12 tek kişilik odalar
const SOUTH_TYPES: TableType[] = [
  '4s', '4s', '4s', '4s', '4s', '4s', '4s',
  '6s', '6s', '6s', '6s', '6s', '6s', '6s', '6s', '6s', '6s',
];
const southDesks = SOUTH_TYPES.map((type, i) => {
  const no = i + 1;
  return makeDesk(
    `G-${String(no).padStart(2, '0')}`,
    type,
    `Masa ${no} (${type === '6s' ? 6 : 4} Kişilik)`
  );
});
const southRooms = Array.from({ length: 12 }, (_, i) => {
  const no = i + 1;
  return makeDesk(`O-${String(no).padStart(2, '0')}`, '1s', `Oda ${no} (Tek Kişilik)`);
});

// Kuzey bölgesi: K-01..K-19. Tip sırası floorPlan.ts'teki masalarla aynı.
const NORTH_TYPES: TableType[] = [
  '8s', '6s', '8s', '6s', '8s', '6s',
  '2s', '6s', '2s', '6s', '2s', '6s',
  '6s',
  '8s', '6s', '8s', '6s', '8s', '6s',
];
const northDesks = NORTH_TYPES.map((type, i) => {
  const no = i + 1;
  return makeDesk(
    `K-${String(no).padStart(2, '0')}`,
    type,
    `Masa ${no} (${type === '2s' ? 2 : type === '6s' ? 6 : 8} Kişilik)`
  );
});

// 4 Bölge Verileri: Her Bölgede Sadece 3'er Adet 4'lü Masa
const ZONES_DATA: Record<ZoneType, ZoneInfo> = {
  north: {
    id: 'north',
    title: 'Kuzey Alanı',
    description: '2, 6 ve 8 Kişilik Çalışma Masaları',
    desks: northDesks,
  },
  west: {
    id: 'west',
    title: 'Batı Alanı',
    description: '4 ve 8 Kişilik Çalışma Masaları',
    desks: westDesks,
  },
  east: {
    id: 'east',
    title: 'Doğu Alanı',
    description: '4 ve 8 Kişilik Çalışma Masaları',
    desks: eastDesks,
  },
  south: {
    id: 'south',
    title: 'Güney Alanı',
    description: 'Masalar ve Özel Çalışma Odaları',
    desks: [...southDesks, ...southRooms],
  },
};

// ─── Yardımcı Fonksiyonlar ───
const getZoneFreeCount = (desks: LibraryDesk[]) =>
  desks.reduce((sum, d) => sum + d.seats.filter((s) => !s.isOccupied).length, 0);

const getZoneTotalCount = (desks: LibraryDesk[]) =>
  desks.reduce((sum, d) => sum + d.seats.length, 0);

type MiniStatus = 'free' | 'partial' | 'full';

const getMiniStatus = (desk: LibraryDesk): MiniStatus => {
  const free = desk.seats.filter((s) => !s.isOccupied).length;
  if (free === 0) return 'full';
  if (free === desk.seats.length) return 'free';
  return 'partial';
};

const MINI_COLORS: Record<MiniStatus, string> = {
  free: '#22c55e',
  partial: '#f59e0b',
  full: '#ef4444',
};

// Mini masa kutucuğu — her masa renkli küçük bir dikdörtgen
const MiniTableGrid = ({ desks, isRoom }: { desks: LibraryDesk[]; isRoom?: boolean }) => (
  <View style={miniStyles.grid}>
    {desks.map((d) => (
      <View
        key={d.id}
        style={[
          miniStyles.block,
          isRoom && miniStyles.blockRoom,
          { backgroundColor: MINI_COLORS[getMiniStatus(d)] },
        ]}
      />
    ))}
  </View>
);

// Doluluk çubuğu
const OccupancyBar = ({ free, total }: { free: number; total: number }) => {
  const pct = total === 0 ? 0 : free / total;
  const barColor = pct > 0.5 ? '#22c55e' : pct > 0.2 ? '#f59e0b' : '#ef4444';
  return (
    <View style={miniStyles.barTrack}>
      <View style={[miniStyles.barFill, { flex: pct, backgroundColor: barColor }]} />
      <View style={{ flex: 1 - pct }} />
    </View>
  );
};

// Tek bölge kartı
const ZoneCard = ({
  title,
  plan,
  desks,
  freeCount,
  totalCount,
  isMostEmpty,
  pulseAnim,
  onPress,
  rooms,
}: {
  title: string;
  plan: ZonePlanData;
  desks: LibraryDesk[];
  freeCount: number;
  totalCount: number;
  isMostEmpty: boolean;
  pulseAnim: Animated.Value;
  onPress: () => void;
  rooms?: LibraryDesk[];
}) => {
  const pct = totalCount === 0 ? 0 : freeCount / totalCount;
  const badgeColor = pct > 0.5 ? '#16a34a' : pct > 0.2 ? '#d97706' : '#dc2626';
  const badgeBg = pct > 0.5 ? '#f0fdf4' : pct > 0.2 ? '#fffbeb' : '#fef2f2';

  return (
    <TouchableOpacity
      style={[miniStyles.card, isMostEmpty && miniStyles.cardMostEmpty]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Nabız animasyonu sadece en boş bölgede */}
      {isMostEmpty && (
        <Animated.View
          style={[miniStyles.cardPulseOverlay, { opacity: pulseAnim }]}
          pointerEvents="none"
        />
      )}

      {/* Üst bilgi: Bölge adı + boş koltuk rozeti (dar kartta rozet alta iner) */}
      <View style={miniStyles.cardHeader}>
        <View style={miniStyles.cardTitleRow}>
          <Text style={miniStyles.cardTitle}>{title}</Text>
          {isMostEmpty && (
            <View style={miniStyles.mostEmptyBadge}>
              <Text style={miniStyles.mostEmptyText}>En boş</Text>
            </View>
          )}
        </View>
        <View style={[miniStyles.freeBadge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
          <Text style={[miniStyles.freeBadgeText, { color: badgeColor }]}>{freeCount} boş</Text>
        </View>
      </View>

      {/* Bölgenin gerçek şeklinde küçük plan */}
      <ZoneMini plan={plan} desks={desks} />

      {rooms && rooms.length > 0 && (
        <Text style={miniStyles.roomLabel}>
          {rooms.length} özel oda · {rooms.filter((r) => !r.seats[0].isOccupied).length} boş
        </Text>
      )}

      {/* Doluluk çubuğu */}
      <OccupancyBar free={freeCount} total={totalCount} />
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Ahmet');

  // Bölge & Masa Seçim State'leri
  const [activeZone, setActiveZone] = useState<ZoneType | null>(null);
  const [selectedDesk, setSelectedDesk] = useState<LibraryDesk | null>(null);
  const [selectedChair, setSelectedChair] = useState<ChairSeat | null>(null);
  const [, setRefresh] = useState(0);

  // Sağ Alt FAB Menü State
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // "En boş" bölge nabız animasyonu
  const pulseAnim = useRef(new Animated.Value(0.0)).current;

  // Her bölgenin boş koltuk sayısını hesapla
  const zoneFree: Record<ZoneType, number> = {
    north: getZoneFreeCount(ZONES_DATA.north.desks),
    west: getZoneFreeCount(ZONES_DATA.west.desks),
    east: getZoneFreeCount(ZONES_DATA.east.desks),
    south: getZoneFreeCount(ZONES_DATA.south.desks),
  };
  const zoneTotal: Record<ZoneType, number> = {
    north: getZoneTotalCount(ZONES_DATA.north.desks),
    west: getZoneTotalCount(ZONES_DATA.west.desks),
    east: getZoneTotalCount(ZONES_DATA.east.desks),
    south: getZoneTotalCount(ZONES_DATA.south.desks),
  };
  const mostEmptyZone = (Object.keys(zoneFree) as ZoneType[]).reduce(
    (best, z) => (zoneFree[z] > zoneFree[best] ? z : best),
    'north' as ZoneType
  );

  useEffect(() => {
    // Hafif nabız döngüsü (sadece "en boş" bölge kenarına uygulanır)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Kullanıcı bilgisi çek
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const prefix = user.email.split('@')[0];
          const formatted = prefix.charAt(0).toUpperCase() + prefix.slice(1);
          setUserName(formatted);
        }
      } catch {
        // Varsayılan kalır
      }
    };
    fetchUser();
  }, [pulseAnim]);

  // FAB Menü Aç/Kapat
  const toggleMenu = () => {
    if (menuVisible) {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setMenuVisible(false));
    } else {
      setMenuVisible(true);
      Animated.spring(menuAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleNotificationPress = () => {
    Alert.alert(
      'Bildirimler',
      '• Kütüphane vize dönemi boyunca 7/24 hizmet vermektedir.\n• Arkadaşın Mert şu anda 3. Kat Kuzey alanında çalışıyor.',
      [{ text: 'Tamam' }]
    );
  };

  // Sandalye Seçim Onayı
  const handleConfirmSeatReservation = () => {
    if (!selectedDesk || !selectedChair) return;
    Alert.alert(
      'Rezervasyon Onayı 🎉',
      `${selectedDesk.label}\nSandalye No: ${selectedChair.number} (${selectedChair.side} Tarafı)\n\nBu sandalyeyi adınıza ayırtmak istiyor musunuz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla ve Otur',
          onPress: () => {
            selectedChair.isOccupied = true;
            selectedChair.occupantName = 'Siz';
            setRefresh((n) => n + 1);
            Alert.alert(
              'Başarılı!',
              `Masa rezerve edildi. Kütüphaneye ulaştığınızda masadaki QR kodu okutarak oturumunuzu başlatabilirsiniz.`
            );
            setSelectedChair(null);
            setSelectedDesk(null);
          },
        },
      ]
    );
  };

  // Masa veya oda seçimi: tek kişilik odalarda sandalye penceresi açılmaz
  const handleSelectDesk = (desk: LibraryDesk) => {
    if (desk.type === '1s') {
      const seat = desk.seats[0];
      if (seat.isOccupied) {
        Alert.alert('Oda Dolu', `${seat.occupantName || 'Başka bir öğrenci'} bu odayı kullanıyor.`);
        return;
      }
      Alert.alert(
        'Rezervasyon Onayı',
        `${desk.label}\n\nBu odayı adınıza ayırtmak istiyor musunuz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Onayla',
            onPress: () => {
              seat.isOccupied = true;
              seat.occupantName = 'Siz';
              setRefresh((n) => n + 1);
              Alert.alert('Başarılı!', 'Oda sizin adınıza ayrıldı.');
            },
          },
        ]
      );
      return;
    }
    setSelectedChair(null);
    setSelectedDesk(desk);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>

        {/* --- HEADER: Sade, Beyaz, Profesyonel Üst Panel --- */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <Image
                source={require('../../assets/images/DumlupinarUniversitesiLogo.png')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.welcomeTextGroup}>
              <Text style={styles.welcomeGreeting}>Hoş geldin,</Text>
              <Text style={styles.studentName} numberOfLines={1}>{userName}</Text>
            </View>
          </View>

          {/* Bildirim Simgesi */}
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={handleNotificationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={21} color={THEME.textPrimary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* --- HIZLI QR İŞLEM BANNER'I --- */}
        <View style={styles.quickAccessSection}>
          <TouchableOpacity
            style={styles.qrBannerBtn}
            onPress={() => router.push('/qr-scan')}
            activeOpacity={0.8}
          >
            <View style={styles.qrBannerIconBox}>
              <Ionicons name="qr-code-outline" size={22} color={THEME.textPrimary} />
            </View>
            <View style={styles.qrBannerTextBox}>
              <Text style={styles.qrBannerTitle}>Kütüphanede misin? QR Okut</Text>
              <Text style={styles.qrBannerDesc}>Masadaki karekodu okutup hemen oturumu başlat</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
          </TouchableOpacity>
        </View>

        {/* --- ANA ODAK: BÖLGE SEÇİM KARTLARI --- */}
        <View style={styles.mapSectionContainer}>
          <View style={styles.mapSectionHeader}>
            <Text style={styles.mapSectionTitle}>Nerede çalışmak istersin?</Text>
            <Text style={styles.mapSectionSubtitle}>
              Bir bölgeye dokunarak detaylı kat planını aç
            </Text>
          </View>

          {/* Tek parça kat haritası */}
          <FloorMap zones={ZONES_DATA} best={mostEmptyZone} onPress={setActiveZone} />

          {/* Alt Lejant */}
          <View style={miniStyles.legend}>
            {[
              { label: 'Çok boş', color: '#22c55e' },
              { label: 'Az yer var', color: '#f59e0b' },
              { label: 'Dolu', color: '#ef4444' },
              { label: 'En boş bölge', color: '#0f172a' },
            ].map((item) => (
              <View key={item.label} style={miniStyles.legendItem}>
                <View style={[miniStyles.legendDot, { backgroundColor: item.color }]} />
                <Text style={miniStyles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* "Bana boş yer bul" butonu */}
          <TouchableOpacity
            style={miniStyles.findSeatBtn}
            onPress={() => setActiveZone(mostEmptyZone)}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={18} color={THEME.textPrimary} />
            <Text style={miniStyles.findSeatText}>Bana boş yer bul</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ========================================================================= */}
      {/* 2. ADIM: SEÇİLEN BÖLGENİN ÖZEL DETAY KROKİSİ (MODAL EKRANI) */}
      {/* ========================================================================= */}
      <Modal
        visible={activeZone !== null}
        animationType="slide"
        onRequestClose={() => setActiveZone(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          {activeZone && (
            <View style={{ flex: 1 }}>
              {/* Üst Bar */}
              <View style={styles.modalZoneHeader}>
                <TouchableOpacity
                  onPress={() => setActiveZone(null)}
                  style={styles.backCircleBtn}
                >
                  <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.modalZoneTitle}>{ZONES_DATA[activeZone].title}</Text>
                  <Text style={styles.modalZoneSub}>{ZONES_DATA[activeZone].description}</Text>
                </View>
              </View>

              {/* Bilgilendirme Banner'ı */}
              <View style={styles.deskHintBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
                <Text style={styles.deskHintText}>
                  Bir masaya dokunarak boş sandalyenizi seçebilirsiniz. <Text style={{ fontWeight: 'bold', color: THEME.availableGreen }}>Yeşil</Text> boş,   <Text style={{ fontWeight: 'bold', color: 'orange' }}>Turuncu</Text> kısmen dolu, <Text style={{ fontWeight: 'bold', color: THEME.occupiedRed }}>Kırmızı</Text> dolu demektir
                </Text>
              </View>

              {/* Bölgedeki Masaların Çizime Birebir Uygun Detay Listesi */}
              <ScrollView style={{ flex: 1, padding: 18 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionDesksTitle}>Çalışma Masaları</Text>

                {/* MASALAR LİSTESİ / IZGARASI */}
                {ZONE_PLANS[activeZone] && (
                  <ZonePlan
                    plan={ZONE_PLANS[activeZone]!}
                    desks={ZONES_DATA[activeZone].desks}
                    onSelectDesk={handleSelectDesk}
                  />
                )}
                <View style={styles.desksGridContainer}>
                  {(ZONE_PLANS[activeZone] ? [] : ZONES_DATA[activeZone].desks).map((desk) => {
                    const isSideAOccupied = desk.seats.some((s) => s.side === 'A' && s.isOccupied);
                    const isSideBOccupied = desk.seats.some((s) => s.side === 'B' && s.isOccupied);

                    return (
                      <TouchableOpacity
                        key={desk.id}
                        style={styles.deskItemCard}
                        onPress={() => {
                          setSelectedChair(null);
                          setSelectedDesk(desk);
                        }}
                        activeOpacity={0.8}
                      >
                        {/* Arkadaş Rozeti */}
                        {desk.friendName && (
                          <View style={styles.friendBadge}>
                            <Ionicons name="people" size={13} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={styles.friendBadgeText}>{desk.friendName}</Text>
                          </View>
                        )}

                        <View style={styles.deskCardTopInfo}>
                          <Text style={styles.deskCardLabel}>{desk.label}</Text>
                          <Text style={styles.deskCardCap}>{desk.capacity} Kişilik</Text>
                        </View>

                        {/* =================================================== */}
                        {/* KULLANICININ İSTEDİĞİ: YARISI KIRMIZI YARISI BEYAZ GÖRÜNÜM */}
                        {/* =================================================== */}
                        <View style={styles.tableSplitRepresentation}>
                          {/* A Tarafı (Sol) */}
                          <View
                            style={[
                              styles.tableHalf,
                              isSideAOccupied ? styles.halfOccupied : styles.halfAvailable,
                            ]}
                          >
                            <Text style={[styles.halfLabel, isSideAOccupied && styles.halfLabelOccupied]}>
                              {isSideAOccupied ? 'Dolu' : 'Boş Alan'}
                            </Text>
                            <Text style={styles.halfSub}>A Tarafı</Text>
                          </View>

                          {/* Ortadaki Masa Resmi (Kroki Klasöründeki Görseller) */}
                          <View style={styles.deskCenterImageWrapper}>
                            {desk.type === '8s' && (
                              <Image source={require('../../assets/images/Kroki/SekizliMasa.png')} style={styles.deskRealImage} resizeMode="contain" />
                            )}
                            {desk.type === '6s' && (
                              <Image source={require('../../assets/images/Kroki/AltiliMasa.png')} style={styles.deskRealImage} resizeMode="contain" />
                            )}
                            {desk.type === '4s' && (
                              <Image source={require('../../assets/images/Kroki/DortluMasa.png')} style={styles.deskRealImage} resizeMode="contain" />
                            )}
                            {desk.type === '2s' && (
                              <Image source={require('../../assets/images/Kroki/IkiliMasa.png')} style={styles.deskRealImage} resizeMode="contain" />
                            )}
                          </View>

                          {/* B Tarafı (Sağ) */}
                          <View
                            style={[
                              styles.tableHalf,
                              isSideBOccupied ? styles.halfOccupied : styles.halfAvailable,
                            ]}
                          >
                            <Text style={[styles.halfLabel, isSideBOccupied && styles.halfLabelOccupied]}>
                              {isSideBOccupied ? 'Dolu' : 'Boş Alan'}
                            </Text>
                            <Text style={styles.halfSub}>B Tarafı</Text>
                          </View>
                        </View>

                        <View style={styles.touchToSelectPill}>
                          <Text style={styles.touchToSelectText}>Sandalye Seçmek İçin Dokunun ➔</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={{ height: 60 }} />
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. ADIM: SANDALYE SEÇME EKRANI (BİREBİR Sandalye.png GÖRSELLERİYLE) */}
      {/* ========================================================================= */}
      <Modal
        visible={selectedDesk !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedDesk(null)}
      >
        <View style={styles.chairModalBackdrop}>
          <View style={styles.chairModalCard}>

            {/* Modal Başlık */}
            <View style={styles.chairModalHeader}>
              <View>
                <Text style={styles.chairModalTitle}>{selectedDesk?.label}</Text>
                <Text style={styles.chairModalSub}>Oturmak istediğiniz sandalyeyi seçin</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDesk(null)} style={styles.chairCloseBtn}>
                <Ionicons name="close" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Sandalye & Masa Yerleşim Alanı */}
            <View style={styles.chairSelectionContainer}>

              {/* A Tarafı Sandalyeleri (Sol) */}
              <View style={styles.chairColumn}>
                <Text style={styles.sideTitle}>A Tarafı</Text>
                {selectedDesk?.seats
                  .filter((s) => s.side === 'A')
                  .map((seat) => {
                    const isSelected = selectedChair?.id === seat.id;
                    return (
                      <TouchableOpacity
                        key={seat.id}
                        style={[
                          styles.chairWrapper,
                          seat.isOccupied ? styles.chairOccupiedWrapper : styles.chairAvailableWrapper,
                          isSelected && styles.chairSelectedWrapper,
                        ]}
                        onPress={() => {
                          if (seat.isOccupied) {
                            Alert.alert('Sandalye Dolu', `${seat.occupantName || 'Başka bir öğrenci'} oturmaktadır.`);
                          } else {
                            setSelectedChair(seat);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Sandalye Görseli */}
                        <Image
                          source={require('../../assets/images/Kroki/Sandalye.png')}
                          style={[
                            styles.chairImage,
                            { transform: [{ rotate: '90deg' }] },
                            seat.isOccupied && { tintColor: THEME.occupiedRed },
                            isSelected && { tintColor: '#1d4ed8' },
                          ]}
                          resizeMode="contain"
                        />
                        <Text style={[styles.chairLabelText, isSelected && { color: '#1d4ed8', fontWeight: 'bold' }]}>
                          Koltuk {seat.number}
                        </Text>
                        <Text style={styles.chairStatusText}>
                          {seat.isOccupied ? seat.occupantName || 'Dolu' : isSelected ? 'Seçildi' : 'Boş'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Ortadaki Gerçek Masa Görseli */}
              <View style={styles.chairCenterDesk}>
                {selectedDesk && (
                  <View
                    style={[
                      styles.modalDesk,
                      { height: (selectedDesk.capacity / 2) * 69 + (selectedDesk.capacity / 2 - 1) * 8 },
                    ]}
                  >
                    <View style={styles.modalDeskDivider} />
                  </View>
                )}
              </View>

              {/* B Tarafı Sandalyeleri (Sağ) */}
              <View style={styles.chairColumn}>
                <Text style={styles.sideTitle}>B Tarafı</Text>
                {selectedDesk?.seats
                  .filter((s) => s.side === 'B')
                  .map((seat) => {
                    const isSelected = selectedChair?.id === seat.id;
                    return (
                      <TouchableOpacity
                        key={seat.id}
                        style={[
                          styles.chairWrapper,
                          seat.isOccupied ? styles.chairOccupiedWrapper : styles.chairAvailableWrapper,
                          isSelected && styles.chairSelectedWrapper,
                        ]}
                        onPress={() => {
                          if (seat.isOccupied) {
                            Alert.alert('Sandalye Dolu', `${seat.occupantName || 'Başka bir öğrenci'} oturmaktadır.`);
                          } else {
                            setSelectedChair(seat);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        {/* Sandalye Görseli */}
                        <Image
                          source={require('../../assets/images/Kroki/Sandalye.png')}
                          style={[
                            styles.chairImage,
                            { transform: [{ rotate: '-90deg' }] },
                            seat.isOccupied && { tintColor: THEME.occupiedRed },
                            isSelected && { tintColor: '#1d4ed8' },
                          ]}
                          resizeMode="contain"
                        />
                        <Text style={[styles.chairLabelText, isSelected && { color: '#1d4ed8', fontWeight: 'bold' }]}>
                          Koltuk {seat.number}
                        </Text>
                        <Text style={styles.chairStatusText}>
                          {seat.isOccupied ? seat.occupantName || 'Dolu' : isSelected ? 'Seçildi' : 'Boş'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>

            {/* Rezervasyon Onay Butonu */}
            <TouchableOpacity
              style={[
                styles.confirmSeatBtn,
                !selectedChair && { opacity: 0.6 },
              ]}
              disabled={!selectedChair}
              onPress={handleConfirmSeatReservation}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmSeatBtnText}>
                {selectedChair
                  ? `Koltuk ${selectedChair.number} İçin Sandalyeyi Ayır`
                  : 'Lütfen Boş Bir Sandalye Seçin'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SAĞ ALT FAB BUTONU --- */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={toggleMenu}
        activeOpacity={0.85}
      >
        <Ionicons
          name={menuVisible ? 'close-outline' : 'grid-outline'}
          size={24}
          color="#ffffff"
        />
      </TouchableOpacity>

      {/* --- SAĞ ALTTAN ORTAYA AÇILAN KAMPÜS MENÜSÜ --- */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={toggleMenu}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={toggleMenu}
        >
          <Animated.View
            style={[
              styles.popupMenuCard,
              {
                opacity: menuAnim,
                transform: [
                  {
                    scale: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Menü Başlık */}
            <View style={styles.popupMenuHeader}>
              <View>
                <Text style={styles.popupMenuTitle}>Kampüs Hizmetleri</Text>
                <Text style={styles.popupMenuSubtitle}>Hızlı erişim menüsü</Text>
              </View>
              <TouchableOpacity onPress={toggleMenu} style={styles.popupCloseBtn}>
                <Ionicons name="close" size={20} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Menü Seçenekleri */}
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.menuOptionsList}>
                {/* Kitap Satın Al & Kirala */}
                <TouchableOpacity
                  style={styles.menuOptionItem}
                  onPress={() => {
                    toggleMenu();
                    Alert.alert(
                      'Kitap Satın Al & Kirala 📚',
                      'Kütüphanedeki kitapları ödünç alabilir, kiralama sürenizi uzatabilir veya öğrencilerin ikinci el ders kitaplarını inceleyebilirsiniz.',
                      [
                        { text: 'Katalogda Ara', onPress: () => Alert.alert('Katalog', 'Kütüphane kitap kataloğu taranıyor...') },
                        { text: 'Kapat', style: 'cancel' }
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuOptionIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="book-outline" size={20} color="#334155" />
                  </View>
                  <View style={styles.menuOptionTextBox}>
                    <Text style={styles.menuOptionTitle}>Kitap Satın Al / Kirala</Text>
                    <Text style={styles.menuOptionSubtitle}>Katalogdan kitap ara, kirala veya satın al</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
                </TouchableOpacity>

                {/* Kitap Bağışla */}
                <TouchableOpacity
                  style={styles.menuOptionItem}
                  onPress={() => {
                    toggleMenu();
                    Alert.alert(
                      'Kitap Bağışla 🤝',
                      'Kütüphanemize veya ihtiyaç sahibi öğrencilere kitap bağışında bulunmak için bağış formu oluşturabilirsiniz.',
                      [
                        { text: 'Bağış Formu Oluştur', onPress: () => Alert.alert('Bağış Talebi', 'Bağış formunuz oluşturuldu. Kütüphane danışma masasına teslim edebilirsiniz.') },
                        { text: 'Kapat', style: 'cancel' }
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuOptionIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="heart-outline" size={20} color="#334155" />
                  </View>
                  <View style={styles.menuOptionTextBox}>
                    <Text style={styles.menuOptionTitle}>Kitap Bağışla</Text>
                    <Text style={styles.menuOptionSubtitle}>Kütüphaneye veya öğrencilere kitap bağışla</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
                </TouchableOpacity>

                {/* Kulüpler */}
                <TouchableOpacity
                  style={styles.menuOptionItem}
                  onPress={() => {
                    toggleMenu();
                    Alert.alert('Kulüpler', 'DPÜ Öğrenci Kulüpleri ve etkinlik başvuruları listesi.');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuOptionIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="people-outline" size={20} color="#334155" />
                  </View>
                  <View style={styles.menuOptionTextBox}>
                    <Text style={styles.menuOptionTitle}>Kulüpler</Text>
                    <Text style={styles.menuOptionSubtitle}>Toplulukları keşfet ve etkinliklere katıl</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
                </TouchableOpacity>

                {/* Ev Arkadaşı Arama */}
                <TouchableOpacity
                  style={styles.menuOptionItem}
                  onPress={() => {
                    toggleMenu();
                    Alert.alert('Ev Arkadaşı', 'Kütahya ve kampüs çevresi güncel öğrenci ev ilanları.');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuOptionIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="home-outline" size={20} color="#334155" />
                  </View>
                  <View style={styles.menuOptionTextBox}>
                    <Text style={styles.menuOptionTitle}>Ev Arkadaşı Arama</Text>
                    <Text style={styles.menuOptionSubtitle}>Güvenilir öğrenci ev ilanları ve kriterler</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
                </TouchableOpacity>

                {/* Yaklaşan Etkinlikler */}
                <TouchableOpacity
                  style={styles.menuOptionItem}
                  onPress={() => {
                    toggleMenu();
                    Alert.alert('Yaklaşan Etkinlikler', 'Kampüs bünyesinde düzenlenecek konferans, seminer ve atölyeler.');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuOptionIconBox, { backgroundColor: '#f1f5f9' }]}>
                    <Ionicons name="calendar-outline" size={20} color="#334155" />
                  </View>
                  <View style={styles.menuOptionTextBox}>
                    <Text style={styles.menuOptionTitle}>Yaklaşan Etkinlikler</Text>
                    <Text style={styles.menuOptionSubtitle}>Akademik takvim, seminerler ve etkinlikler</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.textMuted} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: THEME.bg,
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: THEME.border,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: THEME.availableGreen,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeGreeting: {
    color: THEME.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  studentName: {
    color: THEME.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  notificationBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.primary,
  },

  // QR Banner
  quickAccessSection: {
    paddingHorizontal: 18,
    marginTop: 14,
  },
  qrBannerBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  qrBannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrBannerTextBox: {
    flex: 1,
  },
  qrBannerTitle: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  qrBannerDesc: {
    color: THEME.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // Kroki Ana Bölümü
  mapSectionContainer: {
    marginTop: 16,
    paddingHorizontal: 18,
  },
  mapSectionHeader: {
    marginBottom: 10,
  },
  mapSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  liveGreenPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.availableGreen,
    marginRight: 5,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.availableGreen,
  },
  mapSectionSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },

  // Canlı Durum Şeridi (Live Ribbon)
  liveInfoRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  liveRibbonPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveRibbonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.availableGreen,
    marginRight: 4,
  },
  liveRibbonText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.textSecondary,
  },

  // 3. KAT GENEL KROKİ KARTI (4 YEŞİL YANIP SÖNEN BÖLGE İLE)
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardArchitecturalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  architecturalLevelBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginRight: 6,
  },
  architecturalLevelText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardArchitecturalTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
  },
  compassScaleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  compassBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  compassText: {
    fontSize: 8,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 0.5,
  },

  // Ortak Mikro Sandalye Stili
  microChair: {
    width: 5,
    height: 5,
  },
  miniDeskCapLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#94a3b8',
    marginBottom: 1,
    textAlign: 'center',
  },
  deskUnitWrapper: {
    alignItems: 'center',
  },
  miniDeskWithChairsVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  miniDeskWithChairsHorizontal: {
    alignItems: 'center',
    gap: 1,
  },
  chairsColSide: {
    justifyContent: 'space-around',
    height: 20,
  },

  // 1. Kuzey Bölgesi (Üst Kanat - 3 Adet 4'lü Masa)
  zoneNorth: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 4,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.32)',
    borderWidth: 2,
    borderColor: '#16a34a',
    borderRadius: 14,
  },
  simpleDesksRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  simpleDesksCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    width: '100%',
    gap: 10,
    paddingVertical: 6,
  },
  desk4sUnit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  miniChairsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 44,
  },
  microChairTop: {
    width: 22,
    height: 22,
  },
  microChairBottom: {
    width: 22,
    height: 22,
    transform: [{ rotate: '180deg' }],
  },
  desk4sImg: {
    width: 48,
    height: 24,
    marginVertical: 2,
  },

  // Orta Satır (Batı, Atrium, Doğu)
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginVertical: 10,
    gap: 8,
    minHeight: 250,
  },
  zoneWest: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 4,
  },

  // Orta Mimari Çekirdek (Merdiven 'M')
  centerAtrium: {
    width: 70,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stairsIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  centerStairsIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
  },
  stairStepLines: {
    width: 34,
    gap: 2,
    marginVertical: 4,
  },
  stairStepLine: {
    height: 1.5,
    backgroundColor: '#94a3b8',
    borderRadius: 1,
  },
  centerStairsText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },

  // 3. Doğu Bölgesi (Sağ Kanat - 3 Adet 4'lü Masa)
  zoneEast: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 4,
  },

  // 4. Güney Bölgesi (Alt Kanat - 3 Adet 4'lü Masa)
  zoneSouth: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 9,
    elevation: 4,
  },
  overviewLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  // =========================================================================
  // DETAY KROKİ MODAL STİLLERİ
  // =========================================================================
  modalZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  modalZoneSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  deskHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  deskHintText: {
    fontSize: 11,
    color: '#0369a1',
    marginLeft: 6,
    flex: 1,
  },

  // Bireysel Odalar
  roomsDisplaySection: {
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  roomsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  roomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  singleRoomCard: {
    width: '14.5%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomAvailable: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  roomOccupied: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  roomNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.textPrimary,
  },
  roomStatusText: {
    fontSize: 8,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  // WC & Raflar
  wcBigBanner: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
    alignItems: 'center',
  },
  wcBigTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  wcBigSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  shelvesNorthSection: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  shelvesHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  shelvesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shelfBigImage: {
    flex: 1,
    height: 36,
  },
  sectionDesksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 12,
  },

  // Masalar Listesi
  desksGridContainer: {
    gap: 14,
  },
  deskItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  friendBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  friendBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  deskCardTopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deskCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  deskCardCap: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  // YARISI KIRMIZI YARISI BEYAZ MASA GÖRSEL ALANI
  tableSplitRepresentation: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    height: 90,
  },
  tableHalf: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  halfAvailable: {
    backgroundColor: '#ffffff',
  },
  halfOccupied: {
    backgroundColor: '#fee2e2',
  },
  halfLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.availableGreen,
  },
  halfLabelOccupied: {
    color: THEME.occupiedRed,
  },
  halfSub: {
    fontSize: 9,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  deskCenterImageWrapper: {
    width: 80,
    height: '100%',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: THEME.border,
  },
  deskRealImage: {
    width: 60,
    height: 60,
  },
  touchToSelectPill: {
    marginTop: 10,
    alignItems: 'center',
  },
  touchToSelectText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.primary,
  },

  // =========================================================================
  // SANDALYE SEÇME MODAL STİLLERİ
  // =========================================================================
  chairModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  chairModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  chairModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  chairModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  chairModalSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  chairCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chairSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  chairColumn: {
    flex: 1,
    gap: 8,
    alignItems: 'center',
  },
  sideTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.textSecondary,
    marginBottom: 4,
  },
  chairWrapper: {
    width: 72,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chairAvailableWrapper: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  chairOccupiedWrapper: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  chairSelectedWrapper: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    transform: [{ scale: 1.05 }],
  },
  chairImage: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  chairLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  chairStatusText: {
    fontSize: 8,
    color: THEME.textSecondary,
  },
  chairCenterDesk: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  largeDeskImage: {
    width: 76,
    height: 120,
  },
  modalDesk: {
    width: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0f172a',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  modalDeskDivider: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  confirmSeatBtn: {
    backgroundColor: THEME.primary,
    marginTop: 18,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmSeatBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // FAB Butonu
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.accentDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 99,
  },

  // Menü Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupMenuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  popupMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  popupMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  popupMenuSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  popupCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOptionsList: {
    gap: 8,
  },
  menuOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },
  menuOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  menuOptionTextBox: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  menuOptionSubtitle: {
    fontSize: 10,
    color: THEME.textSecondary,
    marginTop: 1,
  },
});

// =========================================================================
// YENİ BÖLGE KART STİLLERİ
// =========================================================================
const miniStyles = StyleSheet.create({
  // Tek bölge kartı
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardMostEmpty: {
    borderColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cardPulseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 14,
  },

  floorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  floorPillText: { fontSize: 12, fontWeight: '700', color: '#0369a1' },

  // Kart başlık satırı
  cardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  mostEmptyBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  mostEmptyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Mini masa kutucukları grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  block: {
    width: 28,
    height: 10,
    borderRadius: 3,
  },
  blockRoom: {
    width: 18,
    height: 10,
    borderRadius: 3,
  },

  // Oda satırı
  roomRow: {
    marginTop: 2,
    marginBottom: 6,
  },
  roomLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 4,
  },

  // Doluluk çubuğu
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 3,
  },

  // Orta satır (Batı + Boşluk + Doğu)
  middleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },

  // Mini kat planı ayırıcısı
  atriumDivider: {
    width: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 2,
    letterSpacing: 0.5,
  },

  // Alt lejant
  legend: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 5,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },

  // "Bana boş yer bul" butonu
  findSeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: THEME.border,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  findSeatText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
});
