// ============================================
// API Helper Utilities
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Generic API request handler with error handling
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('crm_token') : null;

    // Merge headers
    const headers = {
      ...options.headers,
    } as Record<string, string>;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 Unauthorized globally
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('crm_token'); // Clear invalid token
      }

      // If it's a login attempt, it's just wrong credentials
      if (url.includes('/api/auth/login')) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }

      throw new Error('กรุณาล็อกอินใหม่อีกครั้ง');
    }

    const result: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      error: 'เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง'
    }));

    if (!result.success || !result.data) {
      throw new Error(result.error || 'API request failed');
    }

    return result.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Build query string from params object
 */
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Create JSON request options
 */
export function jsonRequestOptions(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
): RequestInit {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  return options;
}
