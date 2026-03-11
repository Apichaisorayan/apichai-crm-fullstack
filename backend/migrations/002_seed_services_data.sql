-- Apichai Hospital Services
-- id, code, name, fullName, category, isManualSelection, isActive, displayOrder, description, createdAt, updatedAt
INSERT INTO services VALUES(1, 'H001', 'ศัลยกรรมความงาม', 'Aesthetic Surgery', 'Surgery', 0, 1, 1, 'ศัลยกรรมตกแต่งความงาม', '2024-03-03', '2024-03-03');
INSERT INTO services VALUES(2, 'H002', 'ศูนย์ตรวจสุขภาพ', 'Wellness & Checkup', 'Non-Surgery', 0, 1, 2, 'ตรวจสุขภาพและฟื้นฟู', '2024-03-03', '2024-03-03');
INSERT INTO services VALUES(3, 'H003', 'แผนกผู้ป่วยนอก (OPD)', 'Outpatient Department', 'Non-Surgery', 0, 1, 3, 'บริการตรวจรักษาโรคทั่วไป', '2024-03-03', '2024-03-03');
INSERT INTO services VALUES(4, 'H004', 'ศูนย์ทันตกรรม', 'Dental Clinic', 'Non-Surgery', 0, 1, 4, 'ทำฟันและจัดฟัน', '2024-03-03', '2024-03-03');
INSERT INTO services VALUES(5, 'H005', 'เลเซอร์และผิวพรรณ', 'Skin & Laser', 'Non-Surgery', 0, 1, 5, 'เลเซอร์ ทรีตเมนต์ และดูแลผิว', '2024-03-03', '2024-03-03');

-- Doctors for Apichai Hospital
-- id, serviceId, doctorName, country, isActive, displayOrder, createdAt, updatedAt
INSERT INTO service_doctors VALUES(1, 1, 'นพ.อภิชัย (หมอเอ)', 'BOTH', 1, 1, '2024-03-03', '2024-03-03');
INSERT INTO service_doctors VALUES(2, 1, 'พญ.นลิน', 'BOTH', 1, 2, '2024-03-03', '2024-03-03');
INSERT INTO service_doctors VALUES(3, 2, 'นพ.สมชาย', 'TH', 1, 1, '2024-03-03', '2024-03-03');
INSERT INTO service_doctors VALUES(4, 3, 'พญ.วิภา', 'TH', 1, 1, '2024-03-03', '2024-03-03');
INSERT INTO service_doctors VALUES(5, 4, 'นพ.ธนา', 'BOTH', 1, 1, '2024-03-03', '2024-03-03');
INSERT INTO service_doctors VALUES(6, 5, 'พญ.ปราง', 'BOTH', 1, 1, '2024-03-03', '2024-03-03');
