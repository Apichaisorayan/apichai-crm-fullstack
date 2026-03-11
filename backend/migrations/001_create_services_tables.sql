CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  name TEXT NOT NULL,
  fullName TEXT,
  category TEXT,
  isManualSelection BOOLEAN DEFAULT 0,
  isActive BOOLEAN DEFAULT 1,
  displayOrder INTEGER DEFAULT 0,
  description TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  serviceId INTEGER,
  doctorName TEXT NOT NULL,
  country TEXT DEFAULT 'BOTH',
  isActive BOOLEAN DEFAULT 1,
  displayOrder INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (serviceId) REFERENCES services(id)
);

CREATE INDEX IF NOT EXISTS idx_services_isActive ON services(isActive);
CREATE INDEX IF NOT EXISTS idx_service_doctors_serviceId ON service_doctors(serviceId);
