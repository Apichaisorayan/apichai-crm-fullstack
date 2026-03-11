import { UserRole } from '../types/crm';

/**
 * Permission System for CRM
 * - Doctor: Read-only access
 * - Sales: Can edit Doctor data and manage customers
 * - CRM: Can edit all roles except CRM, full customer management
 */

export const canView = (userRole: UserRole): boolean => {
  return true; // All roles can view
};

export const canEditDoctor = (userRole: UserRole): boolean => {
  return userRole === UserRole.SALES || userRole === UserRole.CRM;
};

export const canEditSales = (userRole: UserRole): boolean => {
  return userRole === UserRole.CRM;
};

export const canEditCRM = (userRole: UserRole): boolean => {
  return false; // No one can edit CRM
};

export const canEdit = (userRole: UserRole, targetRole: UserRole): boolean => {
  if (userRole === UserRole.DOCTOR) {
    return false; // Doctor is read-only
  }
  
  if (userRole === UserRole.SALES) {
    return targetRole === UserRole.DOCTOR; // Sales can only edit Doctor
  }
  
  if (userRole === UserRole.CRM) {
    return targetRole !== UserRole.CRM; // CRM can edit all except CRM
  }
  
  return false;
};

export const canManageCustomers = (userRole: UserRole): boolean => {
  return userRole === UserRole.SALES || userRole === UserRole.CRM;
};

export const canExportData = (userRole: UserRole): boolean => {
  return userRole === UserRole.CRM;
};

export const canDeleteCustomer = (userRole: UserRole): boolean => {
  return userRole === UserRole.CRM;
};
