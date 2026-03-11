-- Admin User for Apichai Hospital (Password: admin1234)
INSERT INTO users VALUES(1, 'Admin Apichai', 'admin@apichai.com', 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', 'ADMIN', '081-000-0001', 'active', NULL, 'BOTH', 'BOTH', 1, '[]', '2024-03-03', '2024-03-03');

-- Staff for Apichai Hospital (Password: 123456)
-- Hash for 123456: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
INSERT INTO users VALUES(2, 'Sale Sarah', 'sarah@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'SALES', '081-000-0002', 'active', NULL, 'BOTH', 'Surgery', 1, '[]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(3, 'Sale Mike', 'mike@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'SALES', '081-000-0003', 'active', NULL, 'TH', 'OPD', 2, '[]', '2024-03-03', '2024-03-03');

-- Doctors for Apichai Hospital (Password: 123456)
INSERT INTO users VALUES(4, 'นพ.อภิชัย (หมอเอ)', 'apichai@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0004', 'active', NULL, 'BOTH', 'Surgery', 1, '[1]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(5, 'พญ.นลิน', 'nalin@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0005', 'active', NULL, 'BOTH', 'Surgery', 2, '[1]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(6, 'นพ.สมชาย', 'somchai@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0006', 'active', NULL, 'TH', 'Wellness', 1, '[2]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(7, 'พญ.วิภา', 'wipha@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0007', 'active', NULL, 'TH', 'OPD', 1, '[3]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(8, 'นพ.ธนา', 'tana@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0008', 'active', NULL, 'BOTH', 'Dental', 1, '[4]', '2024-03-03', '2024-03-03');
INSERT INTO users VALUES(9, 'พญ.ปราง', 'prang@apichai.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'DOCTOR', '081-000-0009', 'active', NULL, 'BOTH', 'Skin', 1, '[5]', '2024-03-03', '2024-03-03');
