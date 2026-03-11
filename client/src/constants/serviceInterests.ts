/**
 * Service Interest Helper Functions
 * 
 * NOTE: Service data is now fetched from the API via useServices hook.
 * This file only contains helper functions for service categorization.
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine if a service is Surgery based on its category
 * @param category - Service category from API
 */
export function isSurgeryService(category: string): boolean {
    return category === "Surgery";
}

/**
 * Determine if a service is Non-Surgery based on its category
 * @param category - Service category from API
 */
export function isNonSurgeryService(category: string): boolean {
    return category === "Non-Surgery";
}

/**
 * Get case type from service category
 * @param category - Service category from API ("Surgery" or "Non-Surgery")
 */
export function getCaseType(category: string): "Surgery" | "Non-Surgery" {
    return category === "Surgery" ? "Surgery" : "Non-Surgery";
}

/**
 * Get case type in Thai from service category
 * @param category - Service category from API ("Surgery" or "Non-Surgery")
 */
export function getCaseTypeInThai(category: string): "ผ่าตัด" | "ไม่ผ่าตัด" {
    return category === "Surgery" ? "ผ่าตัด" : "ไม่ผ่าตัด";
}
