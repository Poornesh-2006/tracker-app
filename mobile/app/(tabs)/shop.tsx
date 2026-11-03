import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { Screen } from '@/components/Screen';
import { getShopItems, getUserRank, purchaseReward, type ShopItem } from '@/services/gamification-service';
import { LOCAL_USER_ID } from '@/constants/gamification';
import { spacing } from '@/constants/theme';
import { errorMessage } from '@/utils/helpers';

export default function ShopScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [points, setPoints] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextItems, rank] = await Promise.all([getShopItems(LOCAL_USER_ID), getUserRank(LOCAL_USER_ID)]);
    setItems(nextItems);
    setPoints(rank.totalPoints);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const buy = async (item: ShopItem) => {
    setBuying(item.id);
    try {
      const result = await purchaseReward(item.id, LOCAL_USER_ID);
      Alert.alert(result.success ? 'Reward purchased' : 'Cannot purchase reward', result.message);
      if (result.success) await load();
    } catch (error) {
      Alert.alert('Purchase failed', errorMessage(error, 'Please try again.'));
    } finally {
      setBuying(null);
    }
  };

  return (
    <Screen
      title="Rewards shop"
      subtitle="Spend points on rewards you have earned"
      action={<Text variant="titleMedium" style={{ color: theme.colors.primary }}>💰 {points}</Text>}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        {items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Card.Content style={styles.content}>
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={styles.details}>
                <Text variant="titleMedium">{item.name}</Text>
                <Text variant="bodySmall">{item.description}</Text>
                {!item.canBuy && <Text style={{ color: theme.colors.error }}>Unlock at rank {item.unlockRank}</Text>}
              </View>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>{item.pointsCost}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                disabled={!item.purchasable || buying !== null}
                loading={buying === item.id}
                onPress={() => void buy(item)}>
                {item.canBuy ? 'Buy' : 'Locked'}
              </Button>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { fontSize: 36 },
  details: { flex: 1, gap: 3 },
});
