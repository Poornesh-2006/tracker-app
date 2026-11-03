import { allAs, deleteById, insert } from './db';
import type { FinanceSubscription, FinanceTransaction, Investment } from '@/types';

export function listTransactions(): Promise<FinanceTransaction[]> {
  return allAs(
    `SELECT id, type, category, amount, date, source, note FROM finance_transactions ORDER BY date DESC, id DESC`,
  );
}

export function addTransaction(input: {
  type: FinanceTransaction['type'];
  category: string;
  amount: number;
  date: string;
  source?: string | null;
  note?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO finance_transactions (type, category, amount, date, source, note) VALUES (?, ?, ?, ?, ?, ?)`,
    input.type,
    input.category,
    input.amount,
    input.date,
    input.source ?? null,
    input.note ?? null,
  );
}

export const deleteTransaction = (id: number) => deleteById('finance_transactions', id);

export function listSubscriptions(): Promise<FinanceSubscription[]> {
  return allAs(
    `SELECT id, name, amount, billing_cycle, next_due, active FROM finance_subscriptions ORDER BY active DESC, id DESC`,
    [],
    ['active'],
  );
}

export function addSubscription(input: {
  name: string;
  amount: number;
  billingCycle?: FinanceSubscription['billingCycle'];
  nextDue?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO finance_subscriptions (name, amount, billing_cycle, next_due) VALUES (?, ?, ?, ?)`,
    input.name.trim(),
    input.amount,
    input.billingCycle ?? 'monthly',
    input.nextDue ?? null,
  );
}

export const deleteSubscription = (id: number) => deleteById('finance_subscriptions', id);

const INVESTMENT_COLS = 'id, kind, symbol, name, quantity, avg_cost, current_price, notes';

export function listInvestments(kind?: Investment['kind']): Promise<Investment[]> {
  return kind
    ? allAs(`SELECT ${INVESTMENT_COLS} FROM investments WHERE kind = ? ORDER BY id DESC`, [kind])
    : allAs(`SELECT ${INVESTMENT_COLS} FROM investments ORDER BY id DESC`);
}

export function addInvestment(input: {
  kind: Investment['kind'];
  symbol: string;
  name?: string | null;
  quantity: number;
  avgCost: number;
  currentPrice?: number | null;
  notes?: string | null;
}): Promise<number> {
  return insert(
    `INSERT INTO investments (kind, symbol, name, quantity, avg_cost, current_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    input.kind,
    input.symbol.trim().toUpperCase(),
    input.name ?? null,
    input.quantity,
    input.avgCost,
    input.currentPrice ?? null,
    input.notes ?? null,
  );
}

export const deleteInvestment = (id: number) => deleteById('investments', id);

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

function totalBy(tx: FinanceTransaction[], key: (t: FinanceTransaction) => string) {
  const out: Record<string, number> = {};
  for (const t of tx) out[key(t)] = (out[key(t)] ?? 0) + t.amount;
  return out;
}

export function summarizeFinance(tx: FinanceTransaction[]) {
  const income = tx.filter((t) => t.type === 'income');
  const expense = tx.filter((t) => t.type === 'expense');
  const incomeTotal = sum(income.map((t) => t.amount));
  const expenseTotal = sum(expense.map((t) => t.amount));
  return {
    income: incomeTotal,
    expense: expenseTotal,
    net: incomeTotal - expenseTotal,
    byCategory: totalBy(expense, (t) => t.category),
    bySource: totalBy(income, (t) => t.source || t.category),
  };
}

export function summarizePortfolio(items: Investment[]) {
  const invested = sum(items.map((i) => i.quantity * i.avgCost));
  const value = sum(items.map((i) => i.quantity * (i.currentPrice ?? i.avgCost)));
  return { invested, value, pnl: value - invested };
}
