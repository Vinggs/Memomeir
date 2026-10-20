-- ==============================================================================
-- Memomeir - Personal Finance OS (Antigravity Suite)
-- PostgreSQL Database Schema (Multi-User & Family Ledgers Supported)
-- ==============================================================================

-- 1. Create enum type for transaction classification
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create users table for multi-user / family profile management
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(50) DEFAULT '',
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default user profiles
INSERT INTO users (id, name, phone, color)
VALUES 
    ('farrel', 'Farrel', '6281389352752', '#3b82f6'),
    ('amel', 'Amel', '', '#ec4899')
ON CONFLICT (id) DO NOTHING;

-- 3. Create the core transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    user_name VARCHAR(100) NOT NULL DEFAULT 'Farrel',
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Optimization Indexes for Dashboard queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_user_name ON transactions(user_name);
CREATE INDEX IF NOT EXISTS idx_transactions_composite_stats ON transactions(user_name, date, type, amount);
