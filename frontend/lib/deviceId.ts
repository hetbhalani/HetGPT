/**
 * Device ID management utility for rate limiting.
 * Generates and persists a unique device ID in localStorage.
 */

const DEVICE_ID_KEY = 'hetgpt_device_id';

/**
 * Get or create a unique device ID for this browser/device.
 * The ID is persisted in localStorage and stays the same across sessions.
 */
export function getDeviceId(): string {
    // Check if we're on the client side
    if (typeof window === 'undefined') {
        return '';
    }

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        // Generate a new UUID v4
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
}

/**
 * Clear the device ID (useful for testing).
 */
export function clearDeviceId(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(DEVICE_ID_KEY);
    }
}
