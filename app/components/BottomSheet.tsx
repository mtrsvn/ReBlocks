import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { X } from "lucide-react-native";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Animate slide up and fade in backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset values
      slideAnim.setValue(SCREEN_HEIGHT);
      fadeAnim.setValue(0);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    // Slide panel down quickly, then close
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      transparent
      visible={isOpen}
      onRequestClose={handleDismiss}
      animationType="none"
    >
      <View style={styles.modalContainer}>
        {/* Backdrop overlay */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity
            style={styles.backdropButton}
            activeOpacity={1}
            onPress={handleDismiss}
          />
        </Animated.View>

        {/* Slidable Card */}
        <Animated.View
          style={[
            styles.sheetCard,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Bezel indicator */}
          <View style={styles.indicatorContainer}>
            <View style={styles.indicator} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X size={18} color="#4a5568" />
            </TouchableOpacity>
          </View>

          {/* Scrollable contents */}
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  backdropButton: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: "#eef0f5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
    shadowColor: "#a3b1c6",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20,
    overflow: "hidden",
  },
  indicatorContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  indicator: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(163, 177, 198, 0.2)",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2d3748",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(163, 177, 198, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a3b1c6",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
