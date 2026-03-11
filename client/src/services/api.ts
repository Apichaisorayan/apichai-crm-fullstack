import { Customer, User } from '../types/crm';

// ============================================
// API BASE URL CONFIGURATION
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// ============================================
// HTTP HELPER
// ============================================
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('crm_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'API request failed');
  }
  return json.data as T;
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ============================================
// API SERVICE CLASS
// ============================================
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // --- AUTH ---
  async login(email: string, password?: string): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Login failed');
    }
    localStorage.setItem('crm_token', json.data.token);
    localStorage.setItem('currentUser', JSON.stringify(json.data.user));
    return json.data.user;
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch(`${this.baseUrl}/api/customers`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Customer[]>(res);
  }

  async getCustomerById(id: number): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/api/customers/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Customer>(res);
  }

  async createCustomer(c: any): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/api/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(c),
    });
    return handleResponse<Customer>(res);
  }

  async updateCustomer(id: number, c: any): Promise<Customer> {
    const res = await fetch(`${this.baseUrl}/api/customers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(c),
    });
    return handleResponse<Customer>(res);
  }

  async deleteCustomer(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/customers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<any>(res);
  }

  async getNextAssignment(params: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/queue/next${buildQuery(params)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${this.baseUrl}/api/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User[]>(res);
  }

  async getUserById(id: number): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(res);
  }

  async createUser(u: any): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(u),
    });
    return handleResponse<User>(res);
  }

  async updateUser(id: number, u: any): Promise<User> {
    const res = await fetch(`${this.baseUrl}/api/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(u),
    });
    return handleResponse<User>(res);
  }

  async deleteUser(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<any>(res);
  }

  // --- SERVICES ---
  async getServices(): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/services`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getServiceById(id: number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/services/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  }

  async createService(s: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(s),
    });
    return handleResponse<any>(res);
  }

  async updateService(id: number, s: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(s),
    });
    return handleResponse<any>(res);
  }

  async deleteService(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<any>(res);
  }

  async getDoctorsForService(id: number): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/services/${id}/doctors`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async addDoctorToService(serviceId: number, d: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/services/${serviceId}/doctors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(d),
    });
    return handleResponse<any>(res);
  }

  async updateServiceDoctor(serviceId: number, doctorId: number, u: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/services/${serviceId}/doctors/${doctorId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(u),
    });
    return handleResponse<any>(res);
  }

  async removeDoctorFromService(serviceId: number, doctorId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/services/${serviceId}/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse<any>(res);
  }

  async getServicesByDoctor(doctorName: string): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/doctors/${encodeURIComponent(doctorName)}/services`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  // --- REPORTS (Summary) ---
  async getSqlBySales(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/sql-by-sales${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getLeadsByType(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/leads-by-type${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getStatusBySales(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/status-by-sales${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getSqlByChannel(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/sql-by-channel${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getCloseWonByChannel(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/close-won-by-channel${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getLeadsChannelBySales(p?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/reports/leads-channel-by-sales${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API request failed');
    return json.data;
  }

  async getMqlByChannel(p?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/reports/mql-by-channel${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API request failed');
    return { data: json.data, pagination: json.pagination };
  }

  // --- REPORTS (Monthly) ---
  async getSqlBySalesMonthly(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/sql-by-sales-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getLeadsByTypeMonthly(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/leads-by-type-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getStatusBySalesMonthly(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/status-by-sales-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getSqlByChannelMonthly(p?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/reports/sql-by-channel-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  }

  async getCloseWonByChannelMonthly(p?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/reports/close-won-by-channel-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  }

  async getMqlByChannelMonthly(p?: any): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/api/reports/mql-by-channel-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any[]>(res);
  }

  async getLeadsChannelBySalesMonthly(p?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/reports/leads-channel-by-sales-monthly${buildQuery(p)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<any>(res);
  }
}

export const apiService = new ApiService(API_BASE_URL);
