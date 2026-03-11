import React, { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationDialog } from "./NotificationDialog";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Scissors,
  Sparkles,
  User as UserIcon,
  Users
} from "lucide-react";
import { motion } from "motion/react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useServices } from '../hooks/useServices';
import { useUsers } from '../hooks/useUsers';
import { Service, UserRole } from '../types/crm';
import { useAppDialogs } from '../hooks/useAppDialogs';

export function ServiceManagement() {
  const {
    services,
    loading,
    createService,
    updateService,
    deleteService,
  } = useServices();

  const { users } = useUsers();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | "Surgery" | "Non-Surgery">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const { confirm: appConfirm, notification: appNotification } = useAppDialogs();

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    category: "Surgery" as "Surgery" | "Non-Surgery",
    description: "", // Kept for API compatibility, though not used in UI
    isActive: true,
    displayOrder: 0,
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      category: "Surgery",
      description: "",
      isActive: true,
      displayOrder: 0,
    });
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (service: Service) => {
    setIsEditMode(true);
    setSelectedService(service);
    setFormData({
      code: (service as any).code || "",
      name: service.name,
      category: service.category,
      description: service.description || "",
      isActive: service.isActive,
      displayOrder: service.displayOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    appConfirm.show(
      "ยืนยันการลบ",
      `คุณต้องการลบบริการ "${service.name}" ออกจากระบบใช่หรือไม่?`,
      async () => {
        appNotification.show("กำลังลบ", "กรุณารอสักครู่...", "loading");

        try {
          await deleteService(service.id);
          appNotification.show("ลบสำเร็จ", `ลบบริการ "${service.name}" เรียบร้อยแล้ว`, "success");
        } catch (error) {
          appNotification.show("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "ไม่สามารถลบบริการได้", "error");
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    appConfirm.show(
      isEditMode ? "บันทึกการแก้ไข" : "เพิ่มบริการใหม่",
      isEditMode
        ? `คุณต้องการบันทึกการแก้ไขบริการ "${formData.name}" ใช่หรือไม่?`
        : `คุณต้องการเพิ่มบริการ "${formData.name}" ใช่หรือไม่?`,
      async () => {
        setIsDialogOpen(false);
        appNotification.show("กำลังบันทึก", "กรุณารอสักครู่...", "loading");

        try {
          if (isEditMode && selectedService) {
            await updateService(selectedService.id, formData);
            appNotification.show("บันทึกสำเร็จ", `แก้ไขบริการ "${formData.name}" เรียบร้อยแล้ว`, "success");
          } else {
            await createService(formData);
            appNotification.show("เพิ่มสำเร็จ", `เพิ่มบริการ "${formData.name}" เรียบร้อยแล้ว`, "success");
          }
          resetForm();
        } catch (error) {
          appNotification.show("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้", "error");
        }
      }
    );
  };

  const filteredServices = services.filter((service) => {
    const searchQueryLower = searchQuery.toLowerCase();
    const matchesSearch =
      service.name.toLowerCase().includes(searchQueryLower) ||
      service.code.toLowerCase().includes(searchQueryLower);
    const matchesCategory = filterCategory === "all" || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    return category === "Surgery" ? <Scissors className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />;
  };

  const getCategoryBadgeColor = (category: string) => {
    return category === "Surgery"
      ? "bg-orange-50 text-orange-700 border-orange-200"
      : "bg-teal-50 text-teal-700 border-teal-200";
  };

  // Helper to get active doctors for a service using the centralized users list
  const getDoctorsForThisService = (serviceId: number) => {
    return users
      .filter(u =>
        u.role === UserRole.DOCTOR &&
        u.status === 'active' &&
        u.serviceIds?.includes(serviceId)
      )
      .sort((a, b) => (a.queueOrder || 999) - (b.queueOrder || 999));
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Notification Dialog */}
      <NotificationDialog
        open={appNotification.isOpen}
        onOpenChange={appNotification.setIsOpen}
        title={appNotification.title}
        description={appNotification.description}
        type={appNotification.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={appConfirm.isOpen}
        onOpenChange={appConfirm.setIsOpen}
        title={appConfirm.title}
        description={appConfirm.description}
        onConfirm={appConfirm.action || (() => { })}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#c5a059] to-[#007f85] bg-clip-text text-transparent">
            จัดการบริการ (Services)
          </h2>
          <p className="text-muted-foreground">จัดการบริการและหัตถการทั้งหมดในระบบ</p>
        </div>
        <Button
          className="bg-[#c5a059] hover:bg-[#008a8f]"
          onClick={handleAddClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มบริการใหม่
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อบริการ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              size="sm"
              variant={filterCategory === "all" ? "default" : "outline"}
              onClick={() => setFilterCategory("all")}
              className={filterCategory === "all" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              ทั้งหมด ({services.length})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === "Surgery" ? "default" : "outline"}
              onClick={() => setFilterCategory("Surgery")}
              className={filterCategory === "Surgery" ? "bg-orange-500 hover:bg-orange-600" : ""}
            >
              <Scissors className="h-3 w-3 mr-1" />
              Sur ({services.filter(s => s.category === "Surgery").length})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === "Non-Surgery" ? "default" : "outline"}
              onClick={() => setFilterCategory("Non-Surgery")}
              className={filterCategory === "Non-Surgery" ? "bg-teal-500 hover:bg-teal-600" : ""}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Non-sur ({services.filter(s => s.category === "Non-Surgery").length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Services Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">รหัส</TableHead>
                <TableHead>ชื่อบริการ</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>หมอ (คิว)</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices
                .sort((a, b) => {
                  // เรียงตาม category ก่อน (Surgery ก่อน Non-Surgery)
                  if (a.category !== b.category) {
                    return a.category === 'Surgery' ? -1 : 1;
                  }
                  // ถ้า category เดียวกัน เรียงตาม displayOrder
                  return a.displayOrder - b.displayOrder;
                })
                .map((service, index) => {
                  const activeDoctors = getDoctorsForThisService(service.id);
                  return (
                    <motion.tr
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-muted/50"
                    >
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-300 font-mono">
                          {service.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${service.category === "Surgery" ? "bg-orange-50" : "bg-teal-50"}`}>
                            {getCategoryIcon(service.category)}
                          </div>
                          <span className="font-medium">{service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryBadgeColor(service.category)}>
                          {service.category === "Surgery" ? "Sur" : "Non-sur"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {activeDoctors.length > 0 ? (
                            activeDoctors.map((doc) => (
                              <Badge
                                key={doc.id}
                                variant="secondary"
                                className={`px-1 py-0 text-[10px] font-normal cursor-help border ${doc.country === 'IN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  doc.country === 'BOTH' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                title={doc.name}
                              >
                                {doc.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {service.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            ใช้งาน
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            ไม่ใช้งาน
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditClick(service)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#800200] hover:text-[#800200] hover:bg-[#800200]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteClick(service)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? `แก้ไขข้อมูลบริการ "${selectedService?.name}"`
                : "กรอกข้อมูลบริการใหม่"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">รหัสบริการ (Code) *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="เช่น 1, 1.1, 1.2, 9.1"
                className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
              />
              <p className="text-xs text-muted-foreground">
                รหัสบริการต้องไม่ซ้ำกัน (เช่น 1, 1.1, 2)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">ชื่อบริการ (Name) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="เช่น Liposuction, Fat Graft (Body)"
                className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
              />
            </div>



            <div className="space-y-2">
              <Label htmlFor="category">ประเภท *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: string) => setFormData({ ...formData, category: value as "Surgery" | "Non-Surgery" })}
              >
                <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Surgery">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-orange-600" />
                      <span>Surgery (Sur)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Non-Surgery">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600" />
                      <span>Non-Surgery (Non-sur)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Management Hint */}
            <div className="bg-slate-50 p-3 rounded-md border text-sm text-slate-500 mt-2">
              <p className="flex items-center gap-2 font-medium text-slate-700">
                <Users className="h-4 w-4 text-[#c5a059]" />
                การจัดการแพทย์
              </p>
              <p className="mt-2 ml-1 leading-relaxed">
                ระบบได้เปลี่ยนไปใช้การจัดการแบบรวมศูนย์ คุณสามารถกำหนดแพทย์ประจำบริการนี้ได้ที่เมนู
                <span className="font-semibold text-[#c5a059] mx-1">ตั้งค่า (Settings) &gt; ผู้ใช้งาน (Users)</span>
                โดยการเพิ่ม "Service Interests" ให้กับแพทย์แต่ละท่าน
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-[#c5a059] hover:bg-[#008a8f]">
                {isEditMode ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
