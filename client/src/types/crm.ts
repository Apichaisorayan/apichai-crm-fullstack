// ============================================
// 1. USER & AUTHENTICATION
// ============================================

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
  DOCTOR = 'DOCTOR'
}

export interface User {
  id: number;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive';

  // Sales and Doctor fields
  country?: 'TH' | 'IN' | 'BOTH'; // สำหรับ Sales และ Doctor
  caseType?: 'Surgery' | 'Non-Surgery' | 'BOTH'; // สำหรับ Sales และ Doctor
  queueOrder?: number; // ลำดับคิว 1, 2, 3... (สำหรับ Sales และ Doctor)
  serviceIds?: number[]; // บริการที่หมอรับผิดชอบ (สำหรับ DOCTOR เท่านั้น)

  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 2. CUSTOMER (ลูกค้า)
// ============================================

export type CustomerStatus = string;

export type LifecycleStage = string;

export type Platform = string;

export type ReasonLost = string;

export type Source = string;

export interface Customer {
  // Basic Info
  id: number;
  customerId: string;
  displayName: string;
  phone: string;
  email: string;

  // Contact Channels
  platform: Platform;
  lineUid?: string;
  lineId?: string;

  // Location
  country: 'TH' | 'IN'; // Thailand or International

  // Marketing & Sales
  source: Source;
  serviceInterest: string;
  lifecycleStage: LifecycleStage;
  status: CustomerStatus;
  reasonLost?: ReasonLost; // เหตุผลที่ปิดการขายไม่สำเร็จ

  // Sales Funnel Tracking
  isUQL: string; // Unqualified Lead (free text)
  isMQL: string; // Marketing Qualified Lead (free text)
  isSQL: string; // Sales Qualified Lead (free text)
  mqlToSqlDays?: any; // จำนวนวันที่ใช้จาก MQL → SQL
  closeWonMonth?: string;

  // Assignment
  assignedSales: string; // ชื่อ Sales ที่ดูแล
  assignedDoctor?: string; // หมอประจำ

  // Metrics
  revenueWeight: any; // HN (HN can be text/number)

  // Notes & Status
  isInactive: boolean;
  notes: string;
  remark?: string; // หมายเหตุเพิ่มเติม
  createdAt: string; // วันที่สร้าง
  month?: number; // เลขเดือน (1-12)
  importOrder?: number; // ลำดับจากไฟล์ import (สำหรับเรียงตามไฟล์)
  updatedAt?: string; // วันที่อัปเดตล่าสุด
}

// ============================================
// 3. APPOINTMENT (นัดหมาย)
// ============================================

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'pending';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  date: Date;
  startTime: string;
  endTime: string;
  service: string;
  status: AppointmentStatus;
  assignedDoctor: string;
  notes?: string;
}

// ============================================
// 4. DOCTOR (หมอ)
// ============================================

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
}

// ============================================
// 5. SERVICE (บริการ)
// ============================================

export interface Service {
  id: number;
  code: string;
  name: string;
  category: 'Surgery' | 'Non-Surgery';
  description?: string;
  isActive: boolean;
  displayOrder: number;
  doctors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDoctor {
  id: number;
  serviceId: number;
  doctorName: string;
  country: 'TH' | 'IN';
  isActive: boolean;
  displayOrder: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
