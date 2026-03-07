/**
 * Haptic Feedback Utility
 * Uses navigator.vibrate() for tactile feedback on mobile devices.
 * Silently fails on unsupported browsers/desktop.
 */

const canVibrate = () => 'vibrate' in navigator;

/**
 * Light tap - for button presses, navigation
 */
export const hapticLight = () => {
    if (canVibrate()) navigator.vibrate(30);
};

/**
 * Medium - for important actions (save, confirm)
 */
export const hapticMedium = () => {
    if (canVibrate()) navigator.vibrate(60);
};

/**
 * Heavy - for destructive or powerful actions
 */
export const hapticHeavy = () => {
    if (canVibrate()) navigator.vibrate([60, 20, 60]);
};

/**
 * Success - double tap pattern for confirmations
 */
export const hapticSuccess = () => {
    if (canVibrate()) navigator.vibrate([40, 30, 80]);
};

/**
 * Error / Warning
 */
export const hapticError = () => {
    if (canVibrate()) navigator.vibrate([80, 40, 80, 40, 80]);
};

/**
 * Selection change - very subtle
 */
export const hapticSelect = () => {
    if (canVibrate()) navigator.vibrate(15);
};
