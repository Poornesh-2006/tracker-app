import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Button, TextInput } from 'react-native-paper';
import { formatDate, toDateStr, todayStr } from '@/utils/dates';

interface DateFieldProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  maximumDate?: Date;
}

function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

export function DateField({ value, onChange, label = 'Date', maximumDate }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const initialDate = parseDateStr(value || todayStr());

  const onPick = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) {
      onChange(toDateStr(selected));
    } else if (Platform.OS === 'android') {
      setShow(false);
    }
  };

  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        value={value ? formatDate(value) : ''}
        editable={false}
        right={<TextInput.Icon icon="calendar-month" onPress={() => setShow(true)} />}
        onPressIn={() => setShow(true)}
      />
      {show && Platform.OS === 'ios' ? (
        <View style={styles.iosWrap}>
          <DateTimePicker
            value={initialDate}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            onChange={onPick}
          />
          <Button mode="text" onPress={() => setShow(false)}>
            Done
          </Button>
        </View>
      ) : null}
      {show && Platform.OS === 'android' ? (
        <DateTimePicker
          value={initialDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={onPick}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iosWrap: { marginTop: 8 },
});
