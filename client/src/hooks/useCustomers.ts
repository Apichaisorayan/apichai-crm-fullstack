import { useState, useEffect } from 'react';
import { Customer } from '../types/crm';
import { apiService } from '../services/api';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลลูกค้าทั้งหมด
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // สร้างลูกค้าใหม่
  const createCustomer = async (customer: Omit<Customer, 'id'>) => {
    try {
      setError(null);
      const newCustomer = await apiService.createCustomer(customer);
      setCustomers((prev) => [newCustomer, ...prev]);
      return newCustomer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      throw err;
    }
  };

  // แก้ไขข้อมูลลูกค้า
  const updateCustomer = async (id: number, updates: Partial<Customer>) => {
    try {
      setError(null);
      const updatedCustomer = await apiService.updateCustomer(id, updates);
      setCustomers((prev) =>
        prev.map((customer) => (customer.id === id ? updatedCustomer : customer))
      );
      return updatedCustomer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      throw err;
    }
  };

  // ลบลูกค้า
  const deleteCustomer = async (id: number) => {
    try {
      setError(null);
      await apiService.deleteCustomer(id);
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      throw err;
    }
  };

  // ดึงข้อมูลลูกค้าตาม ID
  const getCustomerById = async (id: number) => {
    try {
      setError(null);
      return await apiService.getCustomerById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customer');
      throw err;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
  };
};
