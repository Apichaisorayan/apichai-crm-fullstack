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
import { Avatar, AvatarFallback } from "./ui/avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotificationDialog } from "./NotificationDialog";
import {
  Plus,
  Edit2,
  Trash2,
  User as UserIcon,
  ShieldCheck,
  Stethoscope,
  Search,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useAppDialogs } from "../hooks/useAppDialogs";
import { UserRole, User } from '../types/crm';
import { useUsers } from '../hooks/useUsers';
import { useServices } from '../hooks/useServices';

export function UserManagement() {
  const { users, loading, createUser, updateUser, deleteUser, refresh } = useUsers();
  const { services, loading: servicesLoading } = useServices();

  const { confirm, notification } = useAppDialogs();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [filterType, setFilterType] = useState<string>("all"); // "all" | "TH-Surgery" | "TH-NonSurgery" | "IN-Surgery" | "IN-NonSurgery"
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: UserRole.SALES,
    phone: "",
    status: "active" as "active" | "inactive",
    country: "TH" as "TH" | "IN" | "BOTH",
    caseType: "Surgery" as "Surgery" | "Non-Surgery" | "BOTH",
    queueOrder: 1,
    serviceIds: [] as number[], // เพิ่ม serviceIds
  });

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      role: UserRole.SALES,
      phone: "",
      status: "active",
      country: "TH",
      caseType: "Surgery",
      queueOrder: 1,
      serviceIds: [],
    });
    setShowPassword(false);
  };

  const handleAddClick = () => {
    setIsEditMode(false);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (user: User) => {
    setIsEditMode(true);
    setSelectedUser(user);

    setFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
      phone: user.phone || "",
      status: user.status,
      country: user.country || "TH",
      caseType: user.caseType || "Surgery",
      queueOrder: user.queueOrder || 1,
      serviceIds: user.serviceIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    confirm.show(
      "ยืนยันการลบ",
      `คุณต้องการลบผู้ใช้ ${user.name} ออกจากระบบใช่หรือไม่?`,
      async () => {
        notification.show("กำลังลบ", "กรุณารอสักครู่...", "loading");

        try {
          await deleteUser(user.id);
          notification.show("ลบสำเร็จ", `ลบผู้ใช้ ${user.name} เรียบร้อยแล้ว`, "success");
        } catch (error) {
          notification.show("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "ไม่สามารถลบผู้ใช้ได้", "error");
        }
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    confirm.show(
      isEditMode ? "บันทึกการแก้ไข" : "เพิ่มผู้ใช้ใหม่",
      isEditMode
        ? `คุณต้องการบันทึกการแก้ไขข้อมูล ${formData.name} ใช่หรือไม่?`
        : `คุณต้องการเพิ่มผู้ใช้ ${formData.name} ใช่หรือไม่?`,
      async () => {
        setIsDialogOpen(false);
        notification.show("กำลังบันทึก", "กรุณารอสักครู่...", "loading");

        try {
          if (isEditMode && selectedUser) {
            // Update user
            const updateData: any = {
              email: formData.email,
              name: formData.name,
              role: formData.role,
              phone: formData.phone || null,
              status: formData.status,
            };

            // Only include country, caseType, queueOrder, and serviceIds for SALES and DOCTOR role
            if (formData.role === UserRole.SALES || formData.role === UserRole.DOCTOR) {
              updateData.country = formData.country;
              updateData.caseType = formData.caseType;
              updateData.queueOrder = formData.queueOrder;
              updateData.serviceIds = formData.serviceIds;
            } else {
              updateData.country = null;
              updateData.caseType = null;
              updateData.queueOrder = null;
              updateData.serviceIds = [];
            }

            // Only include password if it's not empty
            if (formData.password) {
              updateData.password = formData.password;
            }

            await updateUser(selectedUser.id, updateData);
            await refresh();
            notification.show("บันทึกสำเร็จ", `แก้ไขข้อมูล ${formData.name} เรียบร้อยแล้ว`, "success");
          } else {
            // Create new user
            if (!formData.password) {
              throw new Error("กรุณากรอกรหัสผ่าน");
            }

            const createData: any = {
              email: formData.email,
              password: formData.password,
              name: formData.name,
              role: formData.role,
              phone: formData.phone || undefined,
              status: formData.status,
            };

            // Only include country, caseType, queueOrder, and serviceIds for SALES and DOCTOR role
            if (formData.role === UserRole.SALES || formData.role === UserRole.DOCTOR) {
              createData.country = formData.country;
              createData.caseType = formData.caseType;
              createData.queueOrder = formData.queueOrder;
              createData.serviceIds = formData.serviceIds;
            }

            await createUser(createData);
            await refresh();
            notification.show("เพิ่มสำเร็จ", `เพิ่มผู้ใช้ ${formData.name} เรียบร้อยแล้ว`, "success");
          }
          resetForm();
        } catch (error) {
          notification.show("เกิดข้อผิดพลาด", error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้", "error");
        }
      }
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;

    // Filter by type (country + caseType combination)
    let matchesType = true;
    if (filterType !== "all") {
      const [country, caseType] = filterType.split("-");
      const matchesCountry = user.country === "BOTH" || user.country === country;
      const targetCaseType = caseType === "NonSurgery" ? "Non-Surgery" : caseType;
      const matchesCaseType = user.caseType === "BOTH" || user.caseType === targetCaseType;
      matchesType = matchesCountry && matchesCaseType;
    }

    return matchesSearch && matchesRole && matchesType;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <ShieldCheck className="h-4 w-4" />;
      case UserRole.MANAGER:
        return <Stethoscope className="h-4 w-4" />;
      case UserRole.SALES:
        return <UserIcon className="h-4 w-4" />;
      case UserRole.DOCTOR:
        return <Stethoscope className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-[#800200]/10 text-[#800200] border-[#800200]/20";
      case UserRole.MANAGER:
        return "bg-[#c5a059]/10 text-[#c5a059] border-[#c5a059]/20";
      case UserRole.SALES:
        return "bg-[#c9b896]/20 text-[#4a4a4a] border-[#c9b896]";
      case UserRole.DOCTOR:
        return "bg-green-50 text-green-700 border-green-200";
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Notification Dialog */}
      <NotificationDialog
        open={notification.isOpen}
        onOpenChange={notification.setIsOpen}
        title={notification.title}
        description={notification.description}
        type={notification.type}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.isOpen}
        onOpenChange={confirm.setIsOpen}
        title={confirm.title}
        description={confirm.description}
        onConfirm={confirm.action || (() => { })}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">จัดการผู้ใช้ในระบบ</p>
        </div>
        <Button
          className="bg-[#c5a059] hover:bg-[#008a8f]"
          onClick={handleAddClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          เพิ่มผู้ใช้ใหม่
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, อีเมล..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-[200px]">
            <Select
              value={filterRole}
              onValueChange={(value: string) => setFilterRole(value as UserRole | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="กรองตามบทบาท" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">บทบาททั้งหมด</SelectItem>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              size="sm"
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
              className={filterType === "all" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              ทั้งหมด
            </Button>
            <Button
              size="sm"
              variant={filterType === "TH-NonSurgery" ? "default" : "outline"}
              onClick={() => setFilterType("TH-NonSurgery")}
              className={filterType === "TH-NonSurgery" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              TH, Non-sur
            </Button>
            <Button
              size="sm"
              variant={filterType === "TH-Surgery" ? "default" : "outline"}
              onClick={() => setFilterType("TH-Surgery")}
              className={filterType === "TH-Surgery" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              TH, Sur
            </Button>
            <Button
              size="sm"
              variant={filterType === "IN-Surgery" ? "default" : "outline"}
              onClick={() => setFilterType("IN-Surgery")}
              className={filterType === "IN-Surgery" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              IN, Sur
            </Button>
            <Button
              size="sm"
              variant={filterType === "IN-NonSurgery" ? "default" : "outline"}
              onClick={() => setFilterType("IN-NonSurgery")}
              className={filterType === "IN-NonSurgery" ? "bg-[#c5a059] hover:bg-[#008a8f]" : ""}
            >
              IN, Non-sur
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>รหัสผ่าน</TableHead>
                <TableHead>เบอร์โทร</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>ประเภทลูกค้า</TableHead>
                <TableHead>ประเภทงาน</TableHead>
                <TableHead>บริการ</TableHead>
                {/* <TableHead>ลำดับคิว</TableHead> */}
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การจัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#c5a059] text-white">
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        {user.role === UserRole.SALES && user.country && user.caseType ? (
                          <p className="text-xs text-muted-foreground">
                            {user.country} {user.caseType === 'Surgery' ? 'Sur' : 'Non-sur'}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono tracking-widest">
                        ••••••••
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{user.role}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(user.role === UserRole.SALES || user.role === UserRole.DOCTOR) && user.country ? (
                      <Badge
                        variant="outline"
                        className={
                          user.country === "TH"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : user.country === "IN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        {user.country === "TH" ? "TH" : user.country === "IN" ? "IN" : "ทั้งคู่"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(user.role === UserRole.SALES || user.role === UserRole.DOCTOR) && user.caseType ? (
                      <Badge
                        variant="outline"
                        className={
                          user.caseType === "Surgery"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : user.caseType === "Non-Surgery"
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {user.caseType === "Surgery" ? "Sur" : user.caseType === "Non-Surgery" ? "Non-sur" : "Both"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role === UserRole.DOCTOR && user.serviceIds && user.serviceIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.serviceIds.slice(0, 2).map((serviceId) => {
                          const service = services.find(s => s.id === serviceId);
                          return service ? (
                            <Badge key={serviceId} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              {(`${service.code} ${service.name}`).length > 20 ? (`${service.code} ${service.name}`).substring(0, 20) + '...' : `${service.code} ${service.name}`}
                            </Badge>
                          ) : null;
                        })}
                        {user.serviceIds.length > 2 && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                            +{user.serviceIds.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  {/* <TableCell>
                    {(user.role === UserRole.SALES || user.role === UserRole.DOCTOR) ? (
                      <div className="flex items-center justify-center">
                        <span className="text-muted-foreground text-sm text-center block">-</span>
                      </div>
                    )}
                  </TableCell> */}
                  <TableCell>
                    {user.status === "active" ? (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        ใช้งาน
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 border-gray-200"
                      >
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
                        onClick={() => handleEditClick(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[#800200] hover:text-[#800200] hover:bg-[#800200]/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteClick(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? `แก้ไขข้อมูล ${selectedUser?.name}`
                : "กรอกข้อมูลผู้ใช้ใหม่"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อ-นามสกุล *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                รหัสผ่าน {isEditMode && "(เว้นว่างหากไม่ต้องการเปลี่ยน)"}
                {!isEditMode && " *"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEditMode}
                  className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">บทบาท *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: string) => setFormData({ ...formData, role: value as UserRole })}
              >
                <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager</SelectItem>
                  <SelectItem value={UserRole.SALES}>Sales</SelectItem>
                  <SelectItem value={UserRole.DOCTOR}>Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">สถานะ *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value as "active" | "inactive" })}
              >
                <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Country, Case Type and Queue Order for SALES and DOCTOR role */}
            {(formData.role === UserRole.SALES || formData.role === UserRole.DOCTOR) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="country">ประเภทลูกค้า *</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value: string) => setFormData({ ...formData, country: value as "TH" | "IN" | "BOTH" })}
                  >
                    <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TH">TH (ไทย)</SelectItem>
                      <SelectItem value="IN">IN (ต่างชาติ)</SelectItem>
                      <SelectItem value="BOTH">ทั้งคู่</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caseType">ประเภทงาน *</Label>
                  <Select
                    value={formData.caseType}
                    onValueChange={(value: string) => setFormData({ ...formData, caseType: value as "Surgery" | "Non-Surgery" | "BOTH" })}
                  >
                    <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Surgery">Surgery (Sur)</SelectItem>
                      <SelectItem value="Non-Surgery">Non-Surgery (Non-sur)</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="queueOrder">ลำดับคิว *</Label>
                  <Input
                    id="queueOrder"
                    type="number"
                    min="1"
                    value={formData.queueOrder}
                    onChange={(e) => setFormData({ ...formData, queueOrder: parseInt(e.target.value) || 1 })}
                    className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all"
                    placeholder="1, 2, 3..."
                  />
                  <p className="text-xs text-muted-foreground">
                    กำหนดลำดับการรันคิว (เลขน้อยได้ก่อน)
                  </p>
                </div> */}

                {/* Services Multi-Select for DOCTOR only */}
                {formData.role === UserRole.DOCTOR && (
                  <div className="space-y-2">
                    <Label>บริการที่รับผิดชอบ</Label>
                    {servicesLoading ? (
                      <div className="h-12 flex items-center justify-center border rounded-md bg-slate-50">
                        <span className="text-sm text-muted-foreground">กำลังโหลด...</span>
                      </div>
                    ) : (
                      <>
                        <Select
                          value=""
                          onValueChange={(value: string) => {
                            const serviceId = parseInt(value);
                            if (!formData.serviceIds.includes(serviceId)) {
                              setFormData({ ...formData, serviceIds: [...formData.serviceIds, serviceId] });
                            }
                          }}
                        >
                          <SelectTrigger className="border-2 border-slate-300 focus:border-[#c5a059] focus:ring-2 focus:ring-[#c5a059]/20 transition-all">
                            <SelectValue placeholder="เลือกบริการ..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {services
                              .filter(s => s.isActive && !formData.serviceIds.includes(s.id))
                              .sort((a, b) => a.displayOrder - b.displayOrder)
                              .map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.code} {service.name} <span className="text-muted-foreground text-xs">({service.category === 'Surgery' ? 'Sur' : 'Non-sur'})</span>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>

                        {/* Selected Services */}
                        {formData.serviceIds.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-md border">
                            {formData.serviceIds.map((serviceId) => {
                              const service = services.find(s => s.id === serviceId);
                              return service ? (
                                <Badge key={serviceId} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                                  {service.code} {service.name}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        serviceIds: formData.serviceIds.filter(id => id !== serviceId)
                                      });
                                    }}
                                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          เลือกบริการที่หมอท่านนี้รับผิดชอบ (สามารถเลือกได้หลายรายการ)
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-[#c5a059] hover:bg-[#008a8f]"
              >
                {isEditMode ? "บันทึกการเปลี่ยนแปลง" : "เพิ่มผู้ใช้"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
