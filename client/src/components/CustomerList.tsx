import { useCustomers } from '../hooks/useCustomers';
import { Customer } from '../types/crm';

export const CustomerList = () => {
  const {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  // ตัวอย่างการสร้างลูกค้าใหม่
  const handleCreateCustomer = async () => {
    try {
      const newCustomer: Omit<Customer, 'id'> = {
        customerId: `CUS-${Date.now()}`,
        displayName: 'คุณทดสอบ',
        phone: '081-234-5678',
        email: 'test@example.com',
        platform: 'Line',
        country: 'TH',
        source: 'Facebook',
        lifecycleStage: 'MQL',
        status: 'Contact',
        isUQL: "",
        isMQL: "",
        isSQL: "",
        isInactive: false,
        revenueWeight: 0,
        createdAt: new Date().toISOString().split('T')[0],
      };

      await createCustomer(newCustomer);
      alert('สร้างลูกค้าสำเร็จ!');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างลูกค้า');
    }
  };

  // ตัวอย่างการแก้ไขข้อมูลลูกค้า
  const handleUpdateCustomer = async (id: number) => {
    try {
      await updateCustomer(id, {
        status: 'Consulted',
        isMQL: true,
      });
      alert('แก้ไขข้อมูลสำเร็จ!');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    }
  };

  // ตัวอย่างการลบลูกค้า
  const handleDeleteCustomer = async (id: number) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบลูกค้านี้?')) {
      try {
        await deleteCustomer(id);
        alert('ลบลูกค้าสำเร็จ!');
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการลบลูกค้า');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-500">เกิดข้อผิดพลาด: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">รายการลูกค้า</h2>
        <button
          onClick={handleCreateCustomer}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ชื่อ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                เบอร์โทร
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                อีเมล
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.customerId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {customer.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button
                    onClick={() => handleUpdateCustomer(customer.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {customers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ไม่มีข้อมูลลูกค้า
        </div>
      )}
    </div>
  );
};
