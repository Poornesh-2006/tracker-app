import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Screen } from '@/components/Screen';
import { HubRow } from '@/components/HubRow';
import { mutedOn } from '@/constants/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SECTIONS: {
  href: string;
  title: string;
  subtitle: string;
  icon: IconName;
}[] = [
  {
    href: '/(tabs)/brain/graph',
    title: 'Knowledge Graph',
    subtitle: 'Visual niches & subtopics you learn',
    icon: 'graphql',
  },
  {
    href: '/(tabs)/brain/media',
    title: 'Books · Videos · Podcasts',
    subtitle: 'Reading & watch list',
    icon: 'bookshelf',
  },
  {
    href: '/(tabs)/brain/skills',
    title: 'Skills & Marks',
    subtitle: 'Coding, education levels & exam scores',
    icon: 'school-outline',
  },
  {
    href: '/(tabs)/brain/college',
    title: 'College',
    subtitle: 'Attendance, hackathons & class schedule',
    icon: 'office-building-outline',
  },
  {
    href: '/(tabs)/brain/finance',
    title: 'Finance',
    subtitle: 'Earnings, spending & subscriptions',
    icon: 'wallet-outline',
  },
  {
    href: '/(tabs)/brain/investments',
    title: 'Stocks & Crypto',
    subtitle: 'Portfolio tracker',
    icon: 'chart-line',
  },
  {
    href: '/(tabs)/brain/insights',
    title: 'AI Insights',
    subtitle: 'Health advice & local Gemma',
    icon: 'robot-outline',
  },
];

export default function BrainHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const muted = mutedOn(theme.dark);

  return (
    <Screen
      title="Brain"
      subtitle="Learn · build · money"
      action={
        <Pressable onPress={() => router.push('/(tabs)/settings' as Href)}>
          <MaterialCommunityIcons name="cog-outline" size={22} color={muted} />
        </Pressable>
      }>
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
