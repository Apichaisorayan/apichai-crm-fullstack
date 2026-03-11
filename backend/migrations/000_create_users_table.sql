CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  phone TEXT,
  status TEXT DEFAULT 'active',
  avatar TEXT,
  country TEXT DEFAULT 'BOTH',
  caseType TEXT DEFAULT 'BOTH',
  queueOrder INTEGER DEFAULT 0,
  serviceInterests TEXT DEFAULT '[]',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
