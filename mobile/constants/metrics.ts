export interface TestTypeDef {
  label: string;
  unit: string;
  low?: number;
  high?: number;
  lowLabel?: string;
  highLabel?: string;
}

export const TEST_TYPES: TestTypeDef[] = [
  { label: 'Glucose (Fasting)', unit: 'mg/dL', low: 70, high: 100, highLabel: 'elevated' },
  { label: 'HbA1c', unit: '%', high: 5.7, highLabel: 'prediabetes range' },
  { label: 'Total Cholesterol', unit: 'mg/dL', high: 200, highLabel: 'elevated' },
  { label: 'LDL Cholesterol', unit: 'mg/dL', high: 100, highLabel: 'elevated' },
  { label: 'HDL Cholesterol', unit: 'mg/dL', low: 40, lowLabel: 'low' },
  { label: 'Triglycerides', unit: 'mg/dL', high: 150, highLabel: 'elevated' },
  { label: 'Testosterone', unit: 'ng/dL' },
  { label: 'TSH', unit: 'mIU/L', low: 0.4, high: 4.0 },
  { label: 'Vitamin D', unit: 'ng/mL', low: 30, lowLabel: 'deficient' },
  { label: 'Vitamin B12', unit: 'pg/mL', low: 200, lowLabel: 'low' },
  { label: 'Iron/Ferritin', unit: 'ng/mL', low: 30, high: 400 },
  { label: 'Cortisol', unit: 'µg/dL' },
  { label: 'CRP', unit: 'mg/L', high: 3, highLabel: 'elevated' },
  { label: 'AST/ALT', unit: 'U/L', high: 40, highLabel: 'elevated' },
  { label: 'Creatinine', unit: 'mg/dL', low: 0.6, high: 1.3 },
  { label: 'BUN', unit: 'mg/dL', low: 7, high: 20 },
  { label: 'Uric Acid', unit: 'mg/dL', high: 7.0, highLabel: 'elevated' },
  { label: 'WBC', unit: 'K/uL', low: 4.0, high: 11.0 },
  { label: 'RBC', unit: 'M/uL', low: 4.5, high: 5.9 },
  { label: 'Hemoglobin', unit: 'g/dL', low: 13.5, high: 17.5 },
  { label: 'Blood Pressure Systolic', unit: 'mmHg', high: 120, highLabel: 'elevated' },
  { label: 'Blood Pressure Diastolic', unit: 'mmHg', high: 80, highLabel: 'elevated' },
  { label: 'Custom', unit: '' },
];

export function getTestTypeDef(label: string): TestTypeDef {
  return TEST_TYPES.find((t) => t.label === label) ?? TEST_TYPES[TEST_TYPES.length - 1];
}

export interface HealthAlert {
  level: 'high' | 'low' | 'info';
  title: string;
  message: string;
}

export interface AlertCandidate {
  testType: string;
  value: number;
  unit: string;
  date: string;
}

export function computeAlerts(tests: AlertCandidate[]): HealthAlert[] {
  const alerts: HealthAlert[] = [];
  const seen = new Map<string, AlertCandidate>();
  for (const t of tests) {
    const current = seen.get(t.testType);
    if (!current || t.date > current.date) seen.set(t.testType, t);
  }
  for (const t of seen.values()) {
    const def = getTestTypeDef(t.testType);
    if (def.low != null && t.value < def.low) {
      alerts.push({
        level: 'low',
        title: `${t.testType} below range`,
        message: `Latest ${t.testType} is ${t.value} ${t.unit} (low end ${def.low}${def.lowLabel ? `, ${def.lowLabel}` : ''}).`,
      });
    } else if (def.high != null && t.value > def.high) {
      alerts.push({
        level: 'high',
        title: `${t.testType} above range`,
        message: `Latest ${t.testType} is ${t.value} ${t.unit} (high end ${def.high}${def.highLabel ? `, ${def.highLabel}` : ''}).`,
      });
    }
  }
  return alerts;
}

export const MEAL_TYPES: { value: string; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const INTENSITY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Light',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very hard',
};
