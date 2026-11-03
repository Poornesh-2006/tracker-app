import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/Screen';
import { HubRow } from '@/components/HubRow';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SECTIONS: {
  href:
    | '/(tabs)/dashboard'
    | '/(tabs)/health/body'
    | '/(tabs)/health/fuel'
    | '/(tabs)/health/gym'
    | '/(tabs)/health/grooming'
    | '/(tabs)/health/calendar'
    | '/(tabs)/health/brain'
    | '/(tabs)/health/finance'
    | '/(tabs)/health/education';
  title: string;
  subtitle: string;
  icon: IconName;
}[] = [
  {
    href: '/(tabs)/dashboard',
    title: 'Today',
    subtitle: 'Log weight, recovery & daily trends',
    icon: 'chart-line',
  },
  {
    href: '/(tabs)/health/body',
    title: 'Body Reports',
    subtitle: 'Interactive body map & encrypted blood tests',
    icon: 'human',
  },
  {
    href: '/(tabs)/health/fuel',
    title: 'Hydration & Food',
    subtitle: 'Water, meals, macros — everything you consume',
    icon: 'cup-water',
  },
  {
    href: '/(tabs)/health/gym',
    title: 'Gym & Activity',
    subtitle: 'Workouts, steps, sleep, sitting & standing',
    icon: 'dumbbell',
  },
  {
    href: '/(tabs)/health/grooming',
    title: 'Grooming',
    subtitle: 'Wardrobe, skincare, schedules & lookbook',
    icon: 'hanger',
  },
  {
    href: '/(tabs)/health/calendar',
    title: 'Health Calendar',
    subtitle: 'Review daily metrics, meals and workouts by date',
    icon: 'calendar-month',
  },
  {
    href: '/(tabs)/health/brain',
    title: 'Mind & Brain',
    subtitle: 'Track stress, sleep and recovery habits',
    icon: 'head-outline',
  },
  {
    href: '/(tabs)/health/finance',
    title: 'Health Finance',
    subtitle: 'Plan health spending and recurring care costs',
    icon: 'cash-multiple',
  },
  {
    href: '/(tabs)/health/education',
    title: 'Health Education',
    subtitle: 'Learn how to interpret your health trends',
    icon: 'school-outline',
  },
];

export default function HealthHubScreen() {
  const router = useRouter();

  return (
    <Screen title="Health" subtitle="Your body systems — pick a section">
      <View style={styles.list}>
        {SECTIONS.map((section) => (
          <HubRow
            key={section.href}
            title={section.title}
            subtitle={section.subtitle}
            icon={section.icon}
            onPress={() => router.push(section.href as Href)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
