export const lightTheme = {
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#0f172a",
  textSecondary: "#64748b",
  hash_link: "#39cdff",
  border: "#e2e8f0",
  input: "#f1f5f9",
  inputBorder: "#cbd5e1",
  primary: "#10B981",
  primaryDark: "#059669",
  success: "#10B981",
  error: "#ef4444",
  warning: "#f59e0b",
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.1)",
  card: "#ffffff",
  icon: "#4a5568",
};

export const darkTheme = {
  background: "#0f172a",
  surface: "#1e293b",
  text: "#f1f5f9",
  hash_link: "#39cdff",
  textSecondary: "#94a3b8",
  border: "#334155",
  input: "#1e293b",
  inputBorder: "#475569",
  primary: "#10B981",
  primaryDark: "#059669",
  success: "#10B981",
  error: "#ef4444",
  warning: "#f59e0b",
  overlay: "rgba(0, 0, 0, 0.8)",
  shadow: "rgba(0, 0, 0, 0.3)",
  card: "#1e293b",
  icon: "#9aa3b5",
};

export type Theme = typeof lightTheme;

export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
