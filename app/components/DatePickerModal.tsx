import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "./BottomSheet";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface DatePickerModalProps {
  visible: boolean;
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  title?: string;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  date,
  onConfirm,
  onCancel,
  title = "Select Date of Birth",
}) => {
  const [tempDate, setTempDate] = useState(date);

  useEffect(() => {
    if (visible) {
      setTempDate(date);
    }
  }, [visible, date]);

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(
    () => new Date(today.getFullYear() - 100, 0, 1),
    [today]
  );
  const maxDate = useMemo(() => today, [today]);

  const handleConfirm = () => {
    const newDate = tempDate > maxDate ? maxDate : tempDate;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onConfirm(newDate);
  };

  const handleDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      return;
    }
    if (selected) {
      setTempDate(selected);
    }
  };

  return (
    <BottomSheet
      isOpen={visible}
      onClose={onCancel}
      title={title}
    >
      <View style={styles.container}>
        <View style={styles.pickerRow}>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            maximumDate={maxDate}
            minimumDate={minDate}
          />
        </View>

        {/* Selected Date Display */}
        <View style={styles.selectedDateContainer}>
          <Text style={styles.selectedDateLabel}>Selected Date</Text>
          <Text style={styles.selectedDate}>
            {tempDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirm}
            style={styles.confirmButtonWrapper}
          >
            <LinearGradient colors={["#10B981", "#059669"]} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  pickerRow: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  selectedDateContainer: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    alignItems: "center",
  },
  selectedDateLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  selectedDate: {
    fontSize: 20,
    color: "#0f172a",
    fontWeight: "700",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  confirmButtonWrapper: {
    flex: 1,
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
  },
});

