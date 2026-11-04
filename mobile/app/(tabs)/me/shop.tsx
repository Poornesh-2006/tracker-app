import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, CardHead, CountUp, Screen, Text, enter, toast } from '@/components/ui';
import Animated from 'react-native-reanimated';
import { radii, space, useTheme } from '@/constants/theme';
import { RANKS } from '@/constants/gamification';
import { useFocusData } from '@/hooks/useFocusData';
import { bumpData } from '@/hooks/useDataVersion';
import { getShopItems, getUserRank, purchaseReward } from '@/services/gamification-service';

const load = () => Promise.all([getUserRank(), getShopItems()]).then(([rank, items]) => ({ rank, items }));

export default function ShopScreen() {
  const { c, tone } = useTheme();
  const { data } = useFocusData(useCallback(load, []));
  const [buying, setBuying] = useState<string | null>(null);

  const buy = async (id: string) => {
    if (buying) return;
    setBuying(id);
    try {
      const r = await purchaseReward(id);
      toast(r.message, r.success ? 'gift-outline' : 'alert-circle');
      if (r.success) bumpData();
    } finally {
      setBuying(null);
    }
  };

  return (
    <Screen back eyebrow="You" title="Rewards" subtitle="Spend points on guilt-free treats.">
      <Card index={0} tone="ink">
        <CardHead label="Balance" icon="star-four-points" tone="ink" />
        <CountUp value={data?.rank.totalPoints ?? 0} variant="display" color={tone('ink').hi} suffix=" pts" />
      </Card>
      <View style={styles.grid}>
        {data?.items.map((item, i) => {
          const locked = !item.canBuy;
          return (
            <Animated.View key={item.id} entering={enter(i + 1)} style={styles.cell}>
              <View style={[styles.tile, { backgroundColor: c.surface, opacity: locked ? 0.55 : 1 }]}>
                <Text style={{ fontSize: 34 }}>{item.icon}</Text>
                <Text variant="title">
                  {item.name}
                </Text>
                <Text variant="small" muted numberOfLines={2}>
                  {item.description}
                </Text>
                <Button
                  small
                  kind="ink"
                  icon={locked ? 'lock-outline' : undefined}
                  label={locked ? `${RANKS[item.unlockRank - 1]?.name ?? 'Rank ' + item.unlockRank}+` : `${item.pointsCost} pts`}
                  disabled={locked || !item.purchasable}
                  loading={buying === item.id}
                  onPress={() => void buy(item.id)}
                />
              </View>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.8%' },
  tile: { borderRadius: radii.lg, padding: space.lg, gap: space.sm, minHeight: 210, justifyContent: 'space-between' },
});
