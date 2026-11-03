import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, space, useTheme } from '@/constants/theme';
import { IconButton } from './Controls';
import { Text } from './Text';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky area under the scroll content (e.g. Save button). */
  footer?: ReactNode;
}

/**
 * Bottom sheet: springs up, backdrop fades, drag the handle down (or flick)
 * to dismiss. Stays mounted while animating out.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (open) {
      setMounted(true);
      y.value = height;
      y.value = withSpring(0, { damping: 22, stiffness: 210, mass: 0.9 });
      fade.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      fade.value = withTiming(0, { duration: 200 });
      y.value = withTiming(height, { duration: 230, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.flex}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }, backdrop]}>
          <Pressable style={styles.flex} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.end} pointerEvents="box-none">
          <Animated.View
            style={[styles.panel, { backgroundColor: c.canvas, maxHeight: height * 0.9, paddingBottom: insets.bottom + space.lg }, panel]}>
            <GestureDetector gesture={pan}>
              <View style={styles.head}>
                <View style={[styles.grabber, { backgroundColor: c.line }]} />
                {title ? (
                  <View style={styles.titleRow}>
                    <View style={styles.flex}>
                      <Text variant="h2">{title}</Text>
                      {subtitle ? (
                        <Text variant="small" muted>
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <IconButton icon="close" label="Close" onPress={onClose} size={38} />
                  </View>
                ) : null}
              </View>
            </GestureDetector>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  end: { flex: 1, justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  head: { paddingTop: 10, paddingHorizontal: space.xl },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  body: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.sm },
});
