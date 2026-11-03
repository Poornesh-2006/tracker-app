import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { DateField } from '@/components/DateField';
import { NumberField } from '@/components/NumberField';
import {
  addSubscription,
  addTransaction,
  deleteSubscription,
  deleteTransaction,
  listSubscriptions,
  listTransactions,
  summarizeFinance,
} from '@/services/finance-service';
import { palette, radii } from '@/constants/theme';
import type { FinanceSubscription, FinanceTransaction } from '@/types';
import { todayStr } from '@/utils/dates';

const EXPENSE_CATS = ['Food', 'Entertainment', 'Transport', 'Shopping', 'Bills', 'Education', 'Other'];
const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Gift', 'Other'];

export default function FinanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [tx, setTx] = useState<FinanceTransaction[]>([]);
  const [subs, setSubs] = useState<FinanceSubscription[]>([]);
  const [showTx, setShowTx] = useState(false);
  const [showSub, setShowSub] = useState(false);

  const reload = useCallback(async () => {
    const [t, s] = await Promise.all([listTransactions(), listSubscriptions()]);
    setTx(t);
    setSubs(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const summary = useMemo(() => summarizeFinance(tx), [tx]);
  const subTotal = useMemo(
    () => subs.filter((s) => s.active).reduce((a, s) => a + s.amount, 0),
    [subs],
  );
  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <GlassCard contentStyle={styles.hero}>
          <Text style={[styles.label, { color: muted }]}>Net balance</Text>
          <Text style={[styles.net, { color: ink }]}>
            ₹{summary.net.toFixed(0)}
          </Text>
          <View style={styles.row3}>
            <View>
              <Text style={{ color: muted, fontSize: 12 }}>Earned</Text>
              <Text style={{ color: '#2E7D32', fontWeight: '800', fontSize: 18 }}>
                ₹{summary.income.toFixed(0)}
              </Text>
            </View>
            <View>
              <Text style={{ color: muted, fontSize: 12 }}>Spent</Text>
              <Text style={{ color: palette.vermillion, fontWeight: '800', fontSize: 18 }}>
                ₹{summary.expense.toFixed(0)}
              </Text>
            </View>
            <View>
              <Text style={{ color: muted, fontSize: 12 }}>Subs / mo</Text>
              <Text style={{ color: ink, fontWeight: '800', fontSize: 18 }}>
                ₹{subTotal.toFixed(0)}
              </Text>
            </View>
          </View>
        </GlassCard>

        <Button
          mode="outlined"
          icon="chart-line"
          textColor={ink}
          style={styles.investBtn}
          onPress={() => router.push('/(tabs)/brain/investments' as Href)}>
          Stocks & Crypto →
        </Button>

        <Text style={[styles.section, { color: ink }]}>Spending by category</Text>
        <GlassCard contentStyle={styles.block}>
          {Object.keys(summary.byCategory).length === 0 ? (
            <Text style={{ color: muted }}>No expenses yet</Text>
          ) : (
            Object.entries(summary.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amt]) => (
                <View key={cat} style={styles.catRow}>
                  <Text style={{ color: ink, fontWeight: '600' }}>{cat}</Text>
                  <Text style={{ color: palette.vermillion, fontWeight: '800' }}>₹{amt.toFixed(0)}</Text>
                </View>
              ))
          )}
        </GlassCard>

        <Text style={[styles.section, { color: ink }]}>Income sources</Text>
        <GlassCard contentStyle={styles.block}>
          {Object.keys(summary.bySource).length === 0 ? (
            <Text style={{ color: muted }}>No income logged</Text>
          ) : (
            Object.entries(summary.bySource).map(([src, amt]) => (
              <View key={src} style={styles.catRow}>
                <Text style={{ color: ink, fontWeight: '600' }}>{src}</Text>
                <Text style={{ color: '#2E7D32', fontWeight: '800' }}>₹{amt.toFixed(0)}</Text>
              </View>
            ))
          )}
        </GlassCard>

        <View style={styles.headerRow}>
          <Text style={[styles.section, { color: ink, marginTop: 0 }]}>Subscriptions</Text>
          <Button mode="text" textColor={palette.vermillion} onPress={() => setShowSub(true)}>
            Add
          </Button>
        </View>
        {subs.length === 0 ? (
          <Text style={{ color: muted, marginBottom: 8 }}>No subscriptions</Text>
        ) : (
          <View style={styles.list}>
            {subs.map((s) => (
              <GlassCard key={s.id} contentStyle={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>{s.name}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    ₹{s.amount}/{s.billingCycle}
                    {s.nextDue ? ` · next ${s.nextDue}` : ''}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={muted}
                  onPress={() => deleteSubscription(s.id).then(reload)}
                />
              </GlassCard>
            ))}
          </View>
        )}

        <View style={styles.headerRow}>
          <Text style={[styles.section, { color: ink, marginTop: 0 }]}>Transactions</Text>
          <Button
            mode="contained"
            compact
            buttonColor={palette.vermillion}
            textColor="#fff"
            style={{ borderRadius: radii.pill }}
            onPress={() => setShowTx(true)}>
            Add
          </Button>
        </View>

        {tx.length === 0 ? (
          <EmptyState icon="wallet-outline" title="No transactions" message="Log earnings and spendings." />
        ) : (
          <View style={styles.list}>
            {tx.slice(0, 30).map((t) => (
              <GlassCard key={t.id} contentStyle={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>
                    {t.category}
                    {t.source ? ` · ${t.source}` : ''}
                  </Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {t.date} · {t.type}
                    {t.note ? ` · ${t.note}` : ''}
                  </Text>
                </View>
                <Text
                  style={{
                    fontWeight: '800',
                    color: t.type === 'income' ? '#2E7D32' : palette.vermillion,
                    marginRight: 8,
                  }}>
                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(0)}
                </Text>
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={18}
                  color={muted}
                  onPress={() => deleteTransaction(t.id).then(reload)}
                />
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <AddTxModal visible={showTx} onDismiss={() => setShowTx(false)} onSaved={() => { setShowTx(false); reload(); }} />
        <AddSubModal visible={showSub} onDismiss={() => setShowSub(false)} onSaved={() => { setShowSub(false); reload(); }} />
      </Portal>
    </View>
  );
}

function AddTxModal({
  visible,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const cats = type === 'expense' ? EXPENSE_CATS : INCOME_CATS;

  const save = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Enter amount');
      return;
    }
    setBusy(true);
    await addTransaction({
      type,
      category,
      amount: Number(amount),
      date,
      source: source || null,
      note: note || null,
    });
    setBusy(false);
    setAmount('');
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Add transaction</Text>
      <View style={styles.chips}>
        <Chip selected={type === 'expense'} onPress={() => { setType('expense'); setCategory('Food'); }} showSelectedCheck={false}>
          Expense
        </Chip>
        <Chip selected={type === 'income'} onPress={() => { setType('income'); setCategory('Salary'); }} showSelectedCheck={false}>
          Income
        </Chip>
      </View>
      <DateField value={date} onChange={setDate} />
      <View style={styles.chips}>
        {cats.map((c) => (
          <Chip key={c} selected={category === c} onPress={() => setCategory(c)} showSelectedCheck={false}>
            {c}
          </Chip>
        ))}
      </View>
      <NumberField label="Amount (₹)" value={amount} onChange={setAmount} decimal />
      {type === 'income' ? (
        <TextInput mode="outlined" label="Source (where you earn)" value={source} onChangeText={setSource} style={{ marginTop: 8 }} />
      ) : null}
      <TextInput mode="outlined" label="Note" value={note} onChangeText={setNote} style={{ marginTop: 8 }} />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <View style={styles.actions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>Save</Button>
      </View>
    </Modal>
  );
}

function AddSubModal({
  visible,
  onDismiss,
  onSaved,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [nextDue, setNextDue] = useState(todayStr());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim() || !amount) {
      setError('Name and amount required');
      return;
    }
    setBusy(true);
    await addSubscription({ name, amount: Number(amount), billingCycle: cycle, nextDue });
    setBusy(false);
    setName('');
    setAmount('');
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Add subscription</Text>
      <TextInput mode="outlined" label="Name (Netflix, Spotify…)" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
      <NumberField label="Amount (₹)" value={amount} onChange={setAmount} decimal />
      <View style={styles.chips}>
        {(['weekly', 'monthly', 'yearly'] as const).map((c) => (
          <Chip key={c} selected={cycle === c} onPress={() => setCycle(c)} showSelectedCheck={false}>
            {c}
          </Chip>
        ))}
      </View>
      <DateField value={nextDue} onChange={setNextDue} label="Next due" />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <View style={styles.actions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>Save</Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 120 },
  hero: { paddingVertical: 16 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  net: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  row3: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  investBtn: { marginTop: 12, borderRadius: radii.pill, borderColor: palette.chromeWhite },
  section: { fontSize: 16, fontWeight: '800', marginTop: 18, marginBottom: 8 },
  block: { paddingVertical: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18, maxHeight: '90%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
