import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Customer, Service, ServiceDoctor } from "../types/crm";
import { useCustomers } from "../hooks/useCustomers";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface AssignDoctorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: Customer;
    services: Service[];
    onSuccess: () => void;
    getDoctorsForService: (serviceId: number) => Promise<ServiceDoctor[]>;
    updateServiceDoctor: (serviceId: number, doctorId: number, updates: Partial<ServiceDoctor>) => Promise<any>;
}

export function AssignDoctorDialog({
    open,
    onOpenChange,
    customer,
    services,
    onSuccess,
    getDoctorsForService,
    updateServiceDoctor
}: AssignDoctorDialogProps) {
    const { updateCustomer } = useCustomers();
    const [selectedDoctorName, setSelectedDoctorName] = useState<string>("");
    const [skipReason, setSkipReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [candidateDoctors, setCandidateDoctors] = useState<ServiceDoctor[]>([]);
    const [recommendedDoctor, setRecommendedDoctor] = useState<ServiceDoctor | null>(null);
    const [currentServiceId, setCurrentServiceId] = useState<number | null>(null);

    // Return null if customer is not provided
    if (!customer) {
        return null;
    }

    // Initialize candidates when dialog opens
    useEffect(() => {
        if (open && customer.serviceInterest) {
            const service = services.find(s => customer.serviceInterest === `${s.code} ${s.name}` || s.name === customer.serviceInterest);

            if (service) {
                setCurrentServiceId(service.id);
                // Fetch ServiceDoctor data for this service (sorted by displayOrder)
                getDoctorsForService(service.id).then(serviceDocs => {
                    const candidates = serviceDocs
                        .filter(d => d.isActive)
                        .sort((a, b) => a.displayOrder - b.displayOrder);

                    setCandidateDoctors(candidates);

                    // Auto-select the first one as recommended
                    if (candidates.length > 0) {
                        setRecommendedDoctor(candidates[0]);
                        setSelectedDoctorName(candidates[0].doctorName);
                    } else {
                        setRecommendedDoctor(null);
                        setSelectedDoctorName("");
                    }
                }).catch(err => {
                    setCandidateDoctors([]);
                    setRecommendedDoctor(null);
                    setSelectedDoctorName("");
                });
            } else {
                setCurrentServiceId(null);
                setCandidateDoctors([]);
                setRecommendedDoctor(null);
                setSelectedDoctorName("");
            }

            setSkipReason("");
        }
    }, [open, customer, services]);

    const handleConfirm = async () => {
        if (!selectedDoctorName) return;

        setLoading(true);
        try {
            // 1. Update Customer
            await updateCustomer(customer.id, {
                assignedDoctor: selectedDoctorName,
                remark: (recommendedDoctor && selectedDoctorName !== recommendedDoctor.doctorName && skipReason)
                    ? (customer.remark ? customer.remark + ` | Skipped Queue: ${skipReason}` : `Skipped Queue: ${skipReason}`)
                    : customer.remark
            });

            // 2. Rotate Queue using ServiceDoctor.displayOrder (per-service)
            // This is the same logic as CRMManagement auto-assign
            if (currentServiceId) {
                const service = services.find(s => s.id === currentServiceId);
                const selectedServiceDoc = candidateDoctors.find(d => d.doctorName === selectedDoctorName);

                if (selectedServiceDoc) {
                    // 2.1 Rotate in current service
                    const reordered = candidateDoctors.map(d => {
                        if (d.id === selectedServiceDoc.id) return { ...d, displayOrder: 9999 };
                        return d;
                    }).sort((a, b) => a.displayOrder - b.displayOrder);

                    reordered.forEach((doc, idx) => {
                        const newOrder = idx + 1;
                        if (doc.displayOrder !== newOrder) {
                            updateServiceDoctor(currentServiceId, doc.id, { displayOrder: newOrder })
                                .catch(err => { });
                        }
                    });

                    // 2.2 Rotate doctor in ALL other services too
                    for (const otherService of services) {
                        if (otherService.id !== currentServiceId && otherService.isActive) {
                            try {
                                const otherServiceDoctors = await getDoctorsForService(otherService.id);
                                const otherCandidates = otherServiceDoctors
                                    .filter(d => d.isActive)
                                    .sort((a, b) => a.displayOrder - b.displayOrder);

                                // Check if selected doctor is in this service
                                const docInOtherService = otherCandidates.find(d => d.doctorName === selectedDoctorName);
                                if (docInOtherService) {
                                    // Move to end in this service too
                                    const otherReordered = otherCandidates.map(d => {
                                        if (d.doctorName === selectedDoctorName) return { ...d, displayOrder: 9999 };
                                        return d;
                                    }).sort((a, b) => a.displayOrder - b.displayOrder);

                                    otherReordered.forEach((doc, idx) => {
                                        const newOrder = idx + 1;
                                        if (doc.displayOrder !== newOrder) {
                                            updateServiceDoctor(otherService.id, doc.id, { displayOrder: newOrder })
                                                .catch(err => { });
                                        }
                                    });
                                }
                            } catch (err) {
                            }
                        }
                    }
                }
            }

            onSuccess();
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const isSkippingQueue = recommendedDoctor && selectedDoctorName !== recommendedDoctor.doctorName;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#c5a059]" />
                        Assign Doctor
                    </DialogTitle>
                    <DialogDescription>
                        เลือกแพทย์สำหรับลูกค้า <strong>{customer.displayName}</strong>
                        <br />
                        <span className="text-xs text-slate-500">Service: {customer.serviceInterest || "Not specified"}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Recommended Section */}
                    {recommendedDoctor && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold uppercase text-green-700 bg-green-200 px-2 py-0.5 rounded-full">Next Queue</span>
                                <div className="text-sm font-medium text-green-900">{recommendedDoctor.doctorName}</div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 bg-white text-green-700 border-green-200 hover:bg-green-100"
                                onClick={() => setSelectedDoctorName(recommendedDoctor.doctorName)}
                            >
                                Select
                            </Button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Select Doctor</Label>
                        <Select value={selectedDoctorName} onValueChange={setSelectedDoctorName}>
                            <SelectTrigger className={isSkippingQueue ? "border-orange-300 ring-orange-100" : ""}>
                                <SelectValue placeholder="Choose a doctor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {candidateDoctors.map((doc, idx) => (
                                    <SelectItem key={doc.id} value={doc.doctorName}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${idx === 0 ? "bg-[#c5a059] text-white" : "bg-slate-100 text-slate-500"}`}>
                                                {idx + 1}
                                            </div>
                                            <span>{doc.doctorName}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Reason for skipping */}
                    {isSkippingQueue && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-orange-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Reason for skipping queue *
                            </Label>
                            <Textarea
                                placeholder="Why did you skip the recommended doctor?"
                                value={skipReason}
                                onChange={(e) => setSkipReason(e.target.value)}
                                className="focus:border-orange-500"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading || (isSkippingQueue && !skipReason.trim())}
                        className="bg-[#c5a059] hover:bg-[#008a8f]"
                    >
                        {loading ? "Assigning..." : "Confirm Assignment"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
