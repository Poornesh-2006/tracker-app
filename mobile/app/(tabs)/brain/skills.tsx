import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Modal,
  Portal,
  ProgressBar,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { EmptyState } from '@/components/EmptyState';
import { NumberField } from '@/components/NumberField';
import { DateField } from '@/components/DateField';
import {
  addMark,
  addSkill,
  deleteMark,
  deleteSkill,
  listMarks,
  listSkills,
} from '@/services/education-service';
import { palette, radii } from '@/constants/theme';
import type { EducationMark, Skill } from '@/types';
import { todayStr } from '@/utils/dates';

export default function SkillsScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<'skills' | 'marks'>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [marks, setMarks] = useState<EducationMark[]>([]);
  const [showSkill, setShowSkill] = useState(false);
  const [showMark, setShowMark] = useState(false);

  const reload = useCallback(async () => {
    const [s, m] = await Promise.all([listSkills(), listMarks()]);
    setSkills(s);
    setMarks(m);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const ink = theme.dark ? palette.orchidWhite : palette.warmBlack;
  const muted = theme.dark ? palette.chromeWhite : palette.masala;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <SegmentedButtons
          value={tab}
          onValueChange={(v) => setTab(v as 'skills' | 'marks')}
          buttons={[
            { value: 'skills', label: 'Skills' },
            { value: 'marks', label: 'Marks' },
          ]}
        />

        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: ink }]}>
            {tab === 'skills' ? 'Skills & education' : 'Exam marks'}
          </Text>
          <Button
            mode="contained"
            compact
            buttonColor={palette.vermillion}
            textColor="#fff"
            style={{ borderRadius: radii.pill }}
            onPress={() => (tab === 'skills' ? setShowSkill(true) : setShowMark(true))}>
            Add
          </Button>
        </View>

        {tab === 'skills' ? (
          skills.length === 0 ? (
            <EmptyState icon="code-tags" title="No skills yet" message="Track coding, design, languages…" />
          ) : (
            <View style={styles.list}>
              {skills.map((s) => (
                <GlassCard key={s.id} contentStyle={styles.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ink, fontWeight: '700' }}>{s.name}</Text>
                    <Text style={{ color: muted, fontSize: 12 }}>{s.category} · level {s.level}/10</Text>
                    <ProgressBar progress={s.level / 10} color={palette.vermillion} style={styles.bar} />
                  </View>
                  <MaterialCommunityIcons name="delete-outline" size={20} color={muted} onPress={() => deleteSkill(s.id).then(reload)} />
                </GlassCard>
              ))}
            </View>
          )
        ) : marks.length === 0 ? (
          <EmptyState icon="file-document-outline" title="No marks" message="Log exam scores here." />
        ) : (
          <View style={styles.list}>
            {marks.map((m) => (
              <GlassCard key={m.id} contentStyle={styles.item}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: ink, fontWeight: '700' }}>{m.subject}</Text>
                  <Text style={{ color: muted, fontSize: 12 }}>
                    {m.exam ?? 'Exam'} · {m.score}/{m.maxScore}
                    {m.date ? ` · ${m.date}` : ''}
                  </Text>
                </View>
                <Text style={{ color: palette.vermillion, fontWeight: '800', marginRight: 8 }}>
                  {Math.round((m.score / m.maxScore) * 100)}%
                </Text>
                <MaterialCommunityIcons name="delete-outline" size={20} color={muted} onPress={() => deleteMark(m.id).then(reload)} />
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <AddSkillModal visible={showSkill} onDismiss={() => setShowSkill(false)} onSaved={() => { setShowSkill(false); reload(); }} />
        <AddMarkModal visible={showMark} onDismiss={() => setShowMark(false)} onSaved={() => { setShowMark(false); reload(); }} />
      </Portal>
    </View>
  );
}

function AddSkillModal({ visible, onDismiss, onSaved }: { visible: boolean; onDismiss: () => void; onSaved: () => void }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('coding');
  const [level, setLevel] = useState('5');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError('Enter skill name');
      return;
    }
    setBusy(true);
    await addSkill({ name, category, level: Math.min(10, Math.max(1, Number(level) || 1)) });
    setBusy(false);
    setName('');
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Add skill</Text>
      <TextInput mode="outlined" label="Skill (e.g. React Native)" value={name} onChangeText={setName} style={{ marginTop: 8 }} />
      <TextInput mode="outlined" label="Category" value={category} onChangeText={setCategory} style={{ marginTop: 8 }} />
      <NumberField label="Level 1-10" value={level} onChange={setLevel} />
      <HelperText type="error" visible={!!error}>{error}</HelperText>
      <View style={styles.actions}>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button mode="contained" buttonColor={palette.vermillion} textColor="#fff" loading={busy} onPress={save}>Save</Button>
      </View>
    </Modal>
  );
}

function AddMarkModal({ visible, onDismiss, onSaved }: { visible: boolean; onDismiss: () => void; onSaved: () => void }) {
  const theme = useTheme();
  const [subject, setSubject] = useState('');
  const [exam, setExam] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!subject.trim() || !score) {
      setError('Subject and score required');
      return;
    }
    setBusy(true);
    await addMark({
      subject,
      exam: exam || null,
      score: Number(score),
      maxScore: Number(maxScore) || 100,
      date,
    });
    setBusy(false);
    setSubject('');
    setExam('');
    setScore('');
    onSaved();
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <Text style={{ fontWeight: '800', fontSize: 18 }}>Add mark</Text>
      <DateField value={date} onChange={setDate} />
      <TextInput mode="outlined" label="Subject" value={subject} onChangeText={setSubject} style={{ marginTop: 8 }} />
      <TextInput mode="outlined" label="Exam / test" value={exam} onChangeText={setExam} style={{ marginTop: 8 }} />
      <NumberField label="Score" value={score} onChange={setScore} decimal />
      <NumberField label="Max score" value={maxScore} onChange={setMaxScore} />
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '800' },
  list: { gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { marginTop: 8, height: 6, borderRadius: 3, backgroundColor: 'rgba(204,197,185,0.35)' },
  modal: { margin: 20, borderRadius: radii.xl, padding: 18 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
