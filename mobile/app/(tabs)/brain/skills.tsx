import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Card, CardHead, CountUp, Empty, IconButton, ListItem, Meter, Screen, Segmented, Text } from '@/components/ui';
import { SchemaSheet, askDelete, num, text, type FormLayout } from '@/components/forms/SchemaSheet';
import { space, useTheme } from '@/constants/theme';
import { useFocusData } from '@/hooks/useFocusData';
import { addMark, addSkill, deleteMark, deleteSkill, listMarks, listSkills } from '@/services/education-service';
import { formatDate } from '@/utils/dates';
import { plural } from '@/utils/helpers';

type Tab = 'skills' | 'marks';
const TABS = [
  { value: 'skills' as Tab, label: 'Skills' },
  { value: 'marks' as Tab, label: 'Marks' },
];
const CATEGORIES = ['coding', 'language', 'design', 'music', 'sport', 'general'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

const SKILL_FIELDS: FormLayout = [
  { key: 'name', label: 'Skill', kind: 'text', required: true, placeholder: 'TypeScript' },
  { key: 'category', label: 'Category', kind: 'choice', options: CATEGORIES },
  { key: 'level', label: 'Level (1–5)', kind: 'number', integer: true, min: 1, max: 5, required: true, placeholder: '3' },
  { key: 'notes', label: 'Notes', kind: 'text', multiline: true },
];
const MARK_FIELDS: FormLayout = [
  { key: 'subject', label: 'Subject', kind: 'text', required: true, caps: 'words' },
  { key: 'exam', label: 'Exam', kind: 'text', placeholder: 'Mid-term' },
  [
    { key: 'score', label: 'Score', kind: 'number', required: true, min: 0 },
    { key: 'maxScore', label: 'Out of', kind: 'number', min: 1, placeholder: '100' },
  ],
  { key: 'date', label: 'Date', kind: 'date' },
];

const pct = (score: number, max: number) => Math.round((score / (max || 100)) * 100);

export default function SkillsScreen() {
  const { tone } = useTheme();
  const { data } = useFocusData(useCallback(() => Promise.all([listSkills(), listMarks()]), []));
  const [tab, setTab] = useState<Tab>('skills');
  const [adding, setAdding] = useState(false);
  const [skills, marks] = data ?? [[], []];
  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + pct(m.score, m.maxScore), 0) / marks.length) : null;

  return (
    <Screen back eyebrow="Brain" title="Skills & marks" right={<IconButton icon="plus" tone="ink" label={tab === 'skills' ? 'Add skill' : 'Add mark'} onPress={() => setAdding(true)} />}>
      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'skills' ? (
        <View style={{ gap: space.sm }}>
          {skills.map((s, i) => (
            <ListItem
              key={s.id}
              index={i}
              icon="star-four-points-outline"
              iconTone="sky"
              title={s.name}
              subtitle={s.category}
              onLongPress={() => askDelete(`"${s.name}"`, () => deleteSkill(s.id))}
              right={
                <View style={{ width: 90, gap: 4 }}>
                  <Meter progress={s.level / 5} color={tone('ink').bg} />
                  <Text variant="small" muted style={{ textAlign: 'right' }}>
                    Level {s.level}/5
                  </Text>
                </View>
              }
            />
          ))}
          {data && !skills.length ? <Empty icon="star-four-points-outline" title="No skills yet" body="Track what you're getting good at." /> : null}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {avg != null ? (
            <Card index={0} tone="sky">
              <CardHead label={`Average · ${plural(marks.length, 'exam')}`} icon="school-outline" tone="sky" />
              <CountUp value={avg} variant="display" suffix="%" />
              <Text variant="small" muted>
                across all subjects
              </Text>
            </Card>
          ) : null}
          {marks.map((m, i) => (
            <ListItem
              key={m.id}
              index={i + 1}
              icon="file-certificate-outline"
              iconTone={pct(m.score, m.maxScore) >= 75 ? 'sage' : pct(m.score, m.maxScore) >= 50 ? 'butter' : 'peach'}
              title={m.subject}
              subtitle={[m.exam, m.date && formatDate(m.date)].filter(Boolean).join(' · ') || null}
              value={`${m.score}/${m.maxScore}`}
              onLongPress={() => askDelete(`${m.subject} mark`, () => deleteMark(m.id))}
            />
          ))}
          {data && !marks.length ? <Empty icon="file-certificate-outline" title="No marks yet" body="Log exam scores to see your average." /> : null}
        </View>
      )}
      {(tab === 'skills' ? skills : marks).length ? (
        <Text variant="small" muted center>
          Long-press to delete.
        </Text>
      ) : null}

      <SchemaSheet
        open={adding && tab === 'skills'}
        onClose={() => setAdding(false)}
        title="Add skill"
        fields={SKILL_FIELDS}
        submitLabel="Add skill"
        successMessage="Skill added"
        onSubmit={(v) => addSkill({ name: text(v, 'name')!, category: text(v, 'category') ?? 'general', level: num(v, 'level') ?? 1, notes: text(v, 'notes') })}
      />
      <SchemaSheet
        open={adding && tab === 'marks'}
        onClose={() => setAdding(false)}
        title="Add mark"
        fields={MARK_FIELDS}
        submitLabel="Add mark"
        successMessage="Mark saved"
        onSubmit={async (v) => {
          const score = num(v, 'score')!;
          const maxScore = num(v, 'maxScore') ?? 100;
          if (score > maxScore) throw new Error('Score can’t be higher than the maximum.');
          return addMark({ subject: text(v, 'subject')!, exam: text(v, 'exam'), score, maxScore, date: text(v, 'date') });
        }}
      />
    </Screen>
  );
}
