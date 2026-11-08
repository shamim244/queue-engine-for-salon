/**
 * Android Haptic Tactile Feedback Engine
 * Implements Rule 1 (Zero Server Waste / Client-Compute) & Rule 7 (Android Mobile-First).
 * Allows barbers to feel queue changes, client arrivals, summons, and checkouts
 * physically through tactile vibration even when their smartphone is in their pocket.
 */

export type HapticType =
  | "tap"
  | "summon"
  | "arrival"
  | "complete"
  | "transfer"
  | "alert";

const HAPTIC_STORAGE_KEY = "station_haptic_feedback_enabled";

export function isHapticSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "vibrate" in navigator &&
    typeof navigator.vibrate === "function"
  );
}

export function isHapticEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = localStorage.getItem(HAPTIC_STORAGE_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HAPTIC_STORAGE_KEY, String(enabled));
  } catch {}
}

/**
 * Triggers safe, battery-conscious Android haptic vibrations.
 */
export function triggerHaptic(type: HapticType = "tap"): boolean {
  if (!isHapticSupported() || !isHapticEnabled()) {
    return false;
  }

  try {
    switch (type) {
      case "tap":
        // Crisp 35ms micro-pulse for Android touch targets
        return navigator.vibrate(35);

      case "summon":
        // Distinct double buzz [120ms vibration, 60ms pause, 120ms vibration]
        return navigator.vibrate([120, 60, 120]);

      case "arrival":
        // High-priority pocket alert when a new client checks in
        return navigator.vibrate([180, 90, 180]);

      case "complete":
        // Upbeat rhythm upon service completion and payment
        return navigator.vibrate([70, 40, 70, 40, 110]);

      case "transfer":
        // Tactile double pulse for chair handover
        return navigator.vibrate([90, 50, 90]);

      case "alert":
        // Urgent pattern for no-show warning or timeout
        return navigator.vibrate([180, 80, 180, 80, 250]);

      default:
        return navigator.vibrate(40);
    }
  } catch (err) {
    // Graceful fallback for non-supported browsers or permission locks
    return false;
  }
}
