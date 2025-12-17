/**
 * Input Sanitization Utilities
 * 
 * Simple XSS prevention without external packages.
 * Used for chat messages and game names.
 */

/**
 * Sanitize a string by escaping HTML special characters
 * @param input - Raw user input
 * @returns Sanitized string safe for HTML display
 */
export function sanitizeString(input: string): string {
    if (typeof input !== "string") {
        return "";
    }

    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .trim()
        .substring(0, 200); // Max length to prevent abuse
}

/**
 * Validate game name format
 * Allows alphanumeric, spaces, hyphens, underscores
 * @param name - Game name to validate
 * @returns True if valid, false otherwise
 */
export function validateGameName(name: string): boolean {
    if (typeof name !== "string") {
        return false;
    }

    // 3-50 characters, alphanumeric + spaces + hyphens + underscores
    return /^[a-zA-Z0-9 _-]{3,50}$/.test(name);
}

/**
 * Get error message for invalid game name
 * @returns User-friendly error message
 */
export function getGameNameError(): string {
    return "Game name must be 3-50 characters (letters, numbers, spaces, hyphens, underscores only)";
}
