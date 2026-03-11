CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId TEXT UNIQUE NOT NULL,
  displayName TEXT,
  phone TEXT,
  email TEXT,
  platform TEXT,
  lineUid TEXT,
  lineId TEXT,
  country TEXT DEFAULT 'TH',
  source TEXT,
  serviceInterest TEXT,
  lifecycleStage TEXT,
  status TEXT DEFAULT 'New',
  reasonLost TEXT,
  isUQL TEXT DEFAULT '',
  isMQL TEXT DEFAULT '',
  isSQL TEXT DEFAULT '',
  mqlToSqlDays INTEGER,
  isCloseWon BOOLEAN DEFAULT 0,
  closeWonMonth TEXT,
  assignedSales TEXT,
  assignedDoctor TEXT,
  revenueWeight TEXT DEFAULT '-',
  isInactive BOOLEAN DEFAULT 0,
  notes TEXT,
  remark TEXT,
  month TEXT,
  importOrder INTEGER,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_customerId ON customers(customerId);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_lifecycleStage ON customers(lifecycleStage);
CREATE INDEX IF NOT EXISTS idx_customers_assignedSales ON customers(assignedSales);
