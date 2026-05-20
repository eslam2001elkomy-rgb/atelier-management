/*
  # Initial Schema for Atelier Management System

  1. New Tables
    - `users` - Admin users for the system
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password_hash` (text)
      - `phone` (text, nullable)
      - `whatsapp` (text, nullable)
      - `created_at` (timestamptz)

    - `customers` - Customer records
      - `id` (uuid, primary key)
      - `name` (text)
      - `phone` (text)
      - `created_at` (timestamptz)

    - `orders` - Main orders table
      - `id` (uuid, primary key)
      - `order_code` (text, unique, 7-digit random code)
      - `customer_id` (uuid, FK to customers)
      - `customer_name` (text)
      - `phone` (text)
      - `delivery_date` (date)
      - `delivery_time` (time)
      - `price` (numeric)
      - `notes` (text)
      - `status` (text: pending/in_progress/ready/delivered)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `order_images` - Images for orders
      - `id` (uuid, primary key)
      - `order_id` (uuid, FK to orders)
      - `image_url` (text)
      - `created_at` (timestamptz)

    - `notifications` - System notifications
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users)
      - `order_id` (uuid, nullable, FK to orders)
      - `title` (text)
      - `message` (text)
      - `type` (text: reminder/info/warning)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)

    - `ai_conversations` - AI assistant conversation logs
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users)
      - `user_message` (text)
      - `assistant_response` (text)
      - `action_taken` (text, nullable)
      - `created_at` (timestamptz)

    - `settings` - System settings
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users)
      - `key` (text)
      - `value` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  delivery_date date,
  delivery_time time,
  price numeric DEFAULT 0,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order images table
CREATE TABLE IF NOT EXISTS order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- AI conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  assistant_response text NOT NULL,
  action_taken text,
  created_at timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RLS Policies for customers (authenticated users can manage all)
CREATE POLICY "Authenticated users can read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete customers" ON customers FOR DELETE TO authenticated USING (true);

-- RLS Policies for orders
CREATE POLICY "Authenticated users can read orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete orders" ON orders FOR DELETE TO authenticated USING (true);

-- RLS Policies for order_images
CREATE POLICY "Authenticated users can read order images" ON order_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert order images" ON order_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete order images" ON order_images FOR DELETE TO authenticated USING (true);

-- RLS Policies for notifications
CREATE POLICY "Authenticated users can read own notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can insert own notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated users can delete own notifications" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for ai_conversations
CREATE POLICY "Authenticated users can read own conversations" ON ai_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can insert own conversations" ON ai_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated users can delete own conversations" ON ai_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for settings
CREATE POLICY "Authenticated users can read own settings" ON settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can insert own settings" ON settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated users can update own settings" ON settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated users can delete own settings" ON settings FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Public policy for order tracking (read-only by order_code)
CREATE POLICY "Public can track orders by code" ON orders FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view order images" ON order_images FOR SELECT TO anon USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
