-- ==============================================================================
-- Memomeir - Personal Finance OS (Antigravity Suite)
-- PostgreSQL Database Schema
-- ==============================================================================

-- 1. Create enum type for transaction classification
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the core transactions table
-- Columns requested:
-- - id: unique identifier
-- - type: enum ('income', 'expense')
-- - amount: integer value (stored in minor currency units or whole numbers, e.g., cents or IDR/USD whole)
-- - category: string category name (e.g. 'Food & Dining', 'Salary', 'Transport', 'Utilities')
-- - payment_method: string identifier (e.g. 'BCA', 'Credit Card', 'Cash', 'GoPay', 'Bank Transfer')
-- - description: text description / notes from WhatsApp AI bot
-- - date: timestamp of transaction occurrence
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '',
    date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Optimization Indexes for Dashboard queries
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_composite_stats ON transactions(date, type, amount);

-- 4. Initial Seed Data (Minimalist demo dataset)
INSERT INTO transactions (type, amount, category, payment_method, description, date)
VALUES
    ('income', 18500000, 'Salary', 'Bank Wire', 'Monthly engineering consulting retainer', CURRENT_TIMESTAMP - INTERVAL '12 days'),
    ('expense', 45000, 'Food & Dining', 'BCA QRIS', 'Flat white & artisan sourdough at Monolith', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('expense', 185000, 'Utilities', 'Auto Debit', 'High-speed fiber internet subscription', CURRENT_TIMESTAMP - INTERVAL '8 days'),
    ('income', 4200000, 'Investments', 'Stock Broker', 'Q3 dividend yield payout', CURRENT_TIMESTAMP - INTERVAL '6 days'),
    ('expense', 320000, 'Transport', 'Credit Card', 'Executive airport express shuttle', CURRENT_TIMESTAMP - INTERVAL '4 days'),
    ('expense', 650000, 'Health & Wellness', 'Apple Pay', 'Annual biometric fitness pass', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('expense', 85000, 'Food & Dining', 'GoPay', 'Matcha latte and protein snack', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('expense', 1200000, 'Equipment', 'Credit Card', 'Studio noise-canceling headphones', CURRENT_TIMESTAMP - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
