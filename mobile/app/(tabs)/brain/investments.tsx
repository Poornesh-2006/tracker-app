import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardHead, CountUp, Empty, IconButton, ListItem, Row, Screen, Segmented, Text } from '@/components/ui';
import { SchemaSheet, askDelete, num, text, type FormLayout } from '@/components/forms/SchemaSheet';
import { ON_PASTEL, ON_PASTEL_MUTED, space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { addInvestment, deleteInvestment, listInvestments, summarizePortfolio } from '@/services/finance-service';
import type { Investment } from '@/types';
import { money } from '@/utils/money';

type Kind = Investment['kind'] | 'all';
const KINDS = [
  { value: 'all' as Kind, label: 'All' },
  { value: 'stock' as Kind, label: 'Stocks' },
  { value: 'crypto' as Kind, label: 'Crypto' },
];
const FIELDS: FormLayout = [
  { key: 'kind', label: 'Type', kind: 'choice', segmented: true, options: KINDS.slice(1) },
  { key: 'symbol', label: 'Symbol', kind: 'text', required: true, caps: 'none', placeholder: 'INFY / BTC' },
  { key: 'name', label: 'Name', kind: 'text', caps: 'words' },
  [
    { key: 'quantity', label: 'Quantity', kind: 'number', required: true, min: 0.00000001 },
    { key: 'avgCost', label: 'Avg cost', kind: 'number', required: true, min: 0, suffix: '₹' },
  ],
  { key: 'currentPrice', label: 'Current price (optional)', kind: 'number', min: 0, suffix: '₹' },
];

export default function InvestmentsScreen() {
  const { c } = useTheme();
  const { data } = useFocusData(useCallback(() => listInvestments(), []));
  const [kind, setKind] = useState<Kind>('all');
  const [adding, setAdding] = useState(false);
  const items = (data ?? []).filter((i) => kind === 'all' || i.kind === kind);
  const p = summarizePortfolio(items);
  const pct = p.invested ? (p.pnl / p.invested) * 100 : 0;

  return (
    <Screen back eyebrow="Brain" title="Portfolio" subtitle="Prices are what you enter — no live market data." right={<IconButton icon="plus" tone="ink" label="Add holding" onPress={() => setAdding(true)} />}>
      <Segmented options={KINDS} value={kind} onChange={setKind} />
      <Card index={0} tone={p.pnl >= 0 ? 'sage' : 'peach'}>
        <CardHead label="Current value" icon="chart-line" tone={p.pnl >= 0 ? 'sage' : 'peach'} />
        <CountUp value={Math.round(p.value)} variant="display" color={ON_PASTEL} prefix="₹" />
        <Row style={{ marginTop: space.sm }}>
          <View style={styles.flex}>
            <Text variant="small" color={ON_PASTEL_MUTED}>
              Invested
            </Text>
            <Text variant="title" color={ON_PASTEL}>
              {money(p.invested)}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="small" color={ON_PASTEL_MUTED}>
              P/L
            </Text>
            <Text variant="title" color={ON_PASTEL}>
              {money(p.pnl)} ({pct >= 0 ? '+' : ''}
              {pct.toFixed(1)}%)
            </Text>
          </View>
        </Row>
      </Card>
      {items.map((inv, i) => {
        const value = inv.quantity * (inv.currentPrice ?? inv.avgCost);
        const pnl = value - inv.quantity * inv.avgCost;
        return (
          <ListItem
            key={inv.id}
            index={i + 1}
            icon={inv.kind === 'crypto' ? 'bitcoin' : 'chart-areaspline'}
            iconTone={pnl >= 0 ? 'sage' : 'peach'}
            title={inv.symbol}
            subtitle={`${inv.quantity} × ${money(inv.avgCost, 2)}${inv.currentPrice == null ? ' · no price yet' : ''}`}
            onLongPress={() => askDelete(inv.symbol, () => deleteInvestment(inv.id))}
            right={
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="title">{money(value)}</Text>
                <Text variant="small" color={pnl >= 0 ? c.success : c.danger}>
                  {pnl >= 0 ? '+' : ''}
                  {money(pnl)}
                </Text>
              </View>
            }
          />
        );
      })}
      {data && !items.length ? <Empty icon="chart-line" title="No holdings" body="Add stocks or crypto you own. Long-press to delete." /> : null}
      <SchemaSheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add holding"
        fields={FIELDS}
        defaults={kind !== 'all' ? { kind } : undefined}
        submitLabel="Add"
        successMessage="Holding added"
        successIcon="chart-line"
        onSubmit={(v) =>
          addInvestment({ kind: v.kind as Investment['kind'], symbol: text(v, 'symbol')!, name: text(v, 'name'), quantity: num(v, 'quantity')!, avgCost: num(v, 'avgCost')!, currentPrice: num(v, 'currentPrice') })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
