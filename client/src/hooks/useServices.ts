import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Service, ServiceDoctor } from '../types/crm';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getServices();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const getServiceById = async (id: number): Promise<Service | null> => {
    try {
      return await apiService.getServiceById(id);
    } catch (err) {
      return null;
    }
  };

  const createService = async (service: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service | null> => {
    try {
      const newService = await apiService.createService(service);
      await fetchServices(); // Refresh list
      return newService;
    } catch (err) {
      throw err;
    }
  };

  const updateService = async (id: number, service: Partial<Service>): Promise<Service | null> => {
    try {
      const updatedService = await apiService.updateService(id, service);
      await fetchServices(); // Refresh list
      return updatedService;
    } catch (err) {
      throw err;
    }
  };

  const deleteService = async (id: number): Promise<void> => {
    try {
      await apiService.deleteService(id);
      await fetchServices(); // Refresh list
    } catch (err) {
      throw err;
    }
  };

  // Helper: Get active services only
  const getActiveServices = (): Service[] => {
    return services.filter(s => s.isActive);
  };

  // Helper: Get services by category
  const getServicesByCategory = (category: 'Surgery' | 'Non-Surgery'): Service[] => {
    return services.filter(s => s.category === category && s.isActive);
  };

  const getDoctorsForService = async (serviceId: number): Promise<ServiceDoctor[]> => {
    try {
      return await apiService.getDoctorsForService(serviceId);
    } catch (err) {
      return [];
    }
  };

  return {
    services,
    loading,
    error,
    fetchServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getActiveServices,
    getServicesByCategory,
    getDoctorsForService,
    addDoctorToService: async (serviceId: number, doctor: Partial<ServiceDoctor>) => {
      try {
        return await apiService.addDoctorToService(serviceId, doctor);
      } catch (err) {
        throw err;
      }
    },
    updateServiceDoctor: async (serviceId: number, doctorId: number, updates: Partial<ServiceDoctor>) => {
      try {
        return await apiService.updateServiceDoctor(serviceId, doctorId, updates);
      } catch (err) {
        throw err;
      }
    },
    removeDoctorFromService: async (serviceId: number, doctorId: number) => {
      try {
        await apiService.removeDoctorFromService(serviceId, doctorId);
      } catch (err) {
        throw err;
      }
    },
  };
}
