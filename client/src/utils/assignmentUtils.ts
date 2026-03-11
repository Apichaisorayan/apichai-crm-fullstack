import { User, Customer, UserRole } from "../types/crm";
import { getCaseType } from "../constants/serviceInterests";

/**
 * Round Robin Sales Assignment Logic
 */
export const getNextSales = (
    country: "TH" | "IN",
    serviceInterest: string,
    salesUsers: User[],
    currentCustomers: Customer[],
    getServiceCategory: (name: string) => string,
    getCaseTypeInThai: (category: string) => string
): { success: boolean; salesName: string | null; message: string } => {
    // Determine caseType from serviceInterest
    const category = getServiceCategory(serviceInterest);
    const caseType = getCaseType(category);

    // Find matching sales (exact match: country + caseType)
    const matchingSales = salesUsers.filter(s =>
        s.status === 'active' &&
        s.country === country &&
        s.caseType === caseType
    );

    if (matchingSales.length === 0) {
        return {
            success: false,
            salesName: null,
            message: `ไม่มี Sales สำหรับ ${country} + ${caseType}`
        };
    }

    // Sort by queueOrder (ascending)
    matchingSales.sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999));

    // Find the last assigned sales for this category from current data
    const sortedCustomers = [...currentCustomers].sort((a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

    let lastAssignedQueueOrder = 0;

    // Find the most recent customer in this category (TH/IN + Surgery/Non-Surgery) who has an assigned sales
    const lastCustomer = sortedCustomers.find(c => {
        if (!c.assignedSales) return false;
        const cCategory = getServiceCategory(c.serviceInterest);
        const cCaseType = getCaseType(cCategory);
        return c.country === country && cCaseType === caseType;
    });

    if (lastCustomer && lastCustomer.assignedSales) {
        const salesName = lastCustomer.assignedSales.split(' - ')[0];
        const foundSales = matchingSales.find(s => s.name === salesName);
        if (foundSales) {
            lastAssignedQueueOrder = foundSales.queueOrder || 0;
        }
    }

    // Find the next sales in the queue (Round Robin)
    let selectedSales = matchingSales.find(s => (s.queueOrder || 0) > lastAssignedQueueOrder);

    if (!selectedSales) {
        selectedSales = matchingSales[0];
    }

    const caseTypeThai = getCaseTypeInThai(category);
    const formattedName = `${selectedSales.name} - ${country} ${caseTypeThai} #${selectedSales.queueOrder || 1}`;

    return {
        success: true,
        salesName: formattedName,
        message: `Assigned to ${formattedName}`
    };
};

/**
 * Manual Doctor Assignment Placeholder (Logic handled manually in UI but kept for consistency)
 */
export const getNextDoctor = (): { success: boolean; doctorName: string | null; message: string } => {
    return {
        success: false,
        doctorName: null,
        message: "ต้องเลือกหมอเอง (Manual Assignment)"
    };
};
