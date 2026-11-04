import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CardHead, DotMatrix, Empty, IconButton, ListItem, Meter, Row, Screen, Segmented, Text } from '@/components/ui';
import { SchemaSheet, askDelete, num, text, type FormLayout } from '@/components/forms/SchemaSheet';
import { space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { addSubscription, addTransaction, deleteSubscription, deleteTransaction, listSubscriptions, listTransactions, summarizeFinance } from '@/services/finance-service';
import type { FinanceSubscription } from '@/types';
import { daysAgo, formatDate } from '@/utils/dates';
import { money, monthlyCost } from '@/utils/money';

type Tab = 'money' | 'subs';
const TABS = [
  { value: 'money' as Tab, label: 'Money' },
  { value: 'subs' as Tab, label: 'Subscriptions' },
];
const PERIODS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: 'Year' },
];
const CATEGORIES = ['food', 'transport', 'shopping', 'bills', 'health', 'fun', 'education', 'salary', 'freelance', 'other'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

const TX_FIELDS: FormLayout = [
  { key: 'type', label: 'Type', kind: 'choice', segmented: true, options: [{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }] },
  { key: 'amount', label: 'Amount', kind: 'number', required: true, min: 0.01, suffix: '₹' },
  { key: 'category', label: 'Category', kind: 'choice', options: CATEGORIES },
  { key: 'source', label: 'Source / shop', kind: 'text', caps: 'words' },
  { key: 'date', label: 'Date', kind: 'date' },
  { key: 'note', label: 'Note', kind: 'text' },
];
const SUB_FIELDS: FormLayout = [
  { key: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Spotify', caps: 'words' },
  { key: 'amount', label: 'Price', kind: 'number', required: true, min: 0.01, suffix: '₹' },
  { key: 'billingCycle', label: 'Billed', kind: 'choice', segmented: true, options: [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }, { value: 'weekly', label: 'Weekly' }] },
  { key: 'nextDue', label: 'Next due', kind: 'date', optional: true },
];

export default function FinanceScreen() {
  const { c } = useTheme();
  const { data } = useFocusData(useCallback(() => Promise.all([listTransactions(), listSubscriptions()]), []));
  const [tab, setTab] = useState<Tab>('money');
  const [period, setPeriod] = useState('30');
  const [adding, setAdding] = useState(false);
  const [tx, subs] = data ?? [[], []];

  const inPeriod = useMemo(() => tx.filter((t) => t.date >= daysAgo(Number(period) - 1)), [tx, period]);
  const sum = summarizeFinance(inPeriod);
  const cats = Object.entries(sum.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const monthlySubs = subs.filter((s) => s.active).reduce((t, s) => t + monthlyCost(s.amount, s.billingCycle), 0);

  return (
    <Screen back eyebrow="Brain" title="Money" right={<IconButton icon="plus" tone="ink" label={tab === 'money' ? 'Add transaction' : 'Add subscription'} onPress={() => setAdding(true)} />}>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'money' ? (
        <>
          <Segmented options={PERIODS} value={period} onChange={setPeriod} />
          <Card index={0} tone={sum.net >= 0 ? 'sage' : 'peach'}>
            <CardHead label="Net" icon="scale-balance" tone={sum.net >= 0 ? 'sage' : 'peach'} />
            <DotMatrix text={money(sum.net).replace('₹', '')} dot={6} offColor="transparent" accessibilityLabel={`Net ${money(sum.net)}`} />
            <Row style={{ marginTop: space.md }}>
              <View style={styles.flex}>
                <Text variant="small" muted>
                  In
                </Text>
                <Text variant="title">
                  {money(sum.income)}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text variant="small" muted>
                  Out
                </Text>
                <Text variant="title">
                  {money(sum.expense)}
                </Text>
              </View>
            </Row>
          </Card>
          {cats.length ? (
            <Card index={1}>
              <CardHead label="Where it went" icon="chart-donut" />
              <View style={{ gap: space.sm }}>
                {cats.map(([cat, amt]) => (
                  <View key={cat} style={styles.catRow}>
                    <Text variant="small" style={{ width: 84, textTransform: 'capitalize' }}>
                      {cat}
                    </Text>
                    <View style={styles.flex}>
                      <Meter progress={amt / (sum.expense || 1)} color={c.ink} />
                    </View>
                    <Text variant="small" style={{ width: 80, textAlign: 'right' }}>
                      {money(amt)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
          {inPeriod.map((t, i) => (
            <ListItem
              key={t.id}
              index={i + 2}
              icon={t.type === 'income' ? 'arrow-bottom-left' : 'arrow-top-right'}
              iconTone={t.type === 'income' ? 'sage' : 'peach'}
              title={t.source || t.category}
              subtitle={[formatDate(t.date), t.category, t.note].filter(Boolean).join(' · ')}
              value={`${t.type === 'income' ? '+' : '-'}${money(t.amount)}`}
              onLongPress={() => askDelete('transaction', () => deleteTransaction(t.id))}
            />
          ))}
          {data && !inPeriod.length ? <Empty icon="wallet-outline" title="No transactions" body="Tap + to log income or spending. Long-press to delete." /> : null}
        </>
      ) : (
        <>
          <Card index={0} tone="lavender">
            <CardHead label={`${subs.filter((s) => s.active).length} active`} icon="repeat" tone="lavender" />
            <Text variant="display">
              {money(monthlySubs)}
            </Text>
            <Text variant="small" muted>
              per month · {money(monthlySubs * 12)} a year
            </Text>
          </Card>
          {subs.map((s: FinanceSubscription, i) => (
            <ListItem
              key={s.id}
              index={i + 1}
              icon="repeat"
              iconTone="lavender"
              title={s.name}
              subtitle={[s.billingCycle, s.nextDue && `next ${formatDate(s.nextDue)}`].filter(Boolean).join(' · ')}
              value={money(s.amount)}
              onLongPress={() => askDelete(`"${s.name}"`, () => deleteSubscription(s.id))}
            />
          ))}
          {data && !subs.length ? <Empty icon="repeat" title="No subscriptions" body="Track what renews so nothing surprises you." /> : null}
        </>
      )}

      <SchemaSheet
        open={adding && tab === 'money'}
        onClose={() => setAdding(false)}
        title="Add transaction"
        fields={TX_FIELDS}
        submitLabel="Save"
        successMessage="Transaction saved"
        successIcon="wallet-outline"
        onSubmit={(v) => addTransaction({ type: v.type as 'income' | 'expense', amount: num(v, 'amount')!, category: text(v, 'category') ?? 'other', source: text(v, 'source'), date: text(v, 'date')!, note: text(v, 'note') })}
      />
      <SchemaSheet
        open={adding && tab === 'subs'}
        onClose={() => setAdding(false)}
        title="Add subscription"
        fields={SUB_FIELDS}
        submitLabel="Save"
        successMessage="Subscription added"
        successIcon="repeat"
        onSubmit={(v) => addSubscription({ name: text(v, 'name')!, amount: num(v, 'amount')!, billingCycle: v.billingCycle as FinanceSubscription['billingCycle'], nextDue: text(v, 'nextDue') })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
