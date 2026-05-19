import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { Home, UserCheck, Receipt, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";

type Screen = "home" | "send" | "beneficiaries" | "history" | "profile" | "ai-chat";

interface BottomNavProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "beneficiaries", label: "People", icon: UserCheck },
  { id: "history", label: "History", icon: Receipt },
  { id: "profile", label: "Profile", icon: User },
];

const { width: screenWidth } = Dimensions.get("window");
const CONTAINER_WIDTH = screenWidth - 36; // left: 18, right: 18
const INNER_WIDTH = CONTAINER_WIDTH - 20; // paddingHorizontal: 10 * 2
const TAB_WIDTH = INNER_WIDTH / 4;

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const activeIndex = navItems.findIndex((item) => item.id === active);
  
  // Track active slide index
  const slideAnim = useRef(new Animated.Value(activeIndex !== -1 ? activeIndex : 0)).current;

  // Elastic spring scale animation arrays for each tab
  const scaleAnims = useRef(navItems.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const index = navItems.findIndex((item) => item.id === active);
    if (index !== -1) {
      Animated.spring(slideAnim, {
        toValue: index,
        useNativeDriver: true,
        tension: 130,
        friction: 9,
      }).start();
    }
  }, [active]);

  const handlePress = (id: Screen, index: number) => {
    // Play light, satisfying selection haptic
    Haptics.selectionAsync();

    // Trigger tab scale shrink and bounce back animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.86,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        tension: 190,
        friction: 8,
      }),
    ]).start();

    onNavigate(id);
  };

  // Interpolate slide position to transform translateX
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, TAB_WIDTH, 2 * TAB_WIDTH, 3 * TAB_WIDTH],
  });

  return (
    <View style={styles.navContainer}>
      {/* Sliding Active Indicator Bubble behind the icons */}
      <Animated.View
        style={[
          styles.activeIndicator,
          {
            width: TAB_WIDTH - 12,
            transform: [{ translateX }],
          },
        ]}
      />

      {navItems.map(({ id, label, icon: Icon }, index) => {
        const isActive = active === id;
        return (
          <TouchableOpacity
            key={id}
            activeOpacity={1}
            onPress={() => handlePress(id, index)}
            style={styles.navItem}
          >
            <Animated.View
              style={{
                alignItems: "center",
                transform: [{ scale: scaleAnims[index] }],
              }}
            >
              <Icon
                size={20}
                color={isActive ? "#10B981" : "#9aa3b5"}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: isActive ? "#10B981" : "#9aa3b5",
                    fontWeight: isActive ? "700" : "600",
                  },
                ]}
              >
                {label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 34 : 12,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  activeIndicator: {
    position: "absolute",
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    left: 16,
    top: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});
