-- BẢN SẮC CƠ SỞ DỮ LIỆU ĐẦY ĐỦ - TOUR CRM
-- Kích hoạt UUID extension nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng Profiles (Lưu thông tin mở rộng của User)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  role TEXT DEFAULT 'CTV',
  employment_status TEXT DEFAULT 'official',
  resigned_at TIMESTAMP WITH TIME ZONE,
  resigned_note TEXT,
  join_date DATE,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  leader_name TEXT,
  team_id UUID,
  team_name TEXT,
  email TEXT,
  address TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  tier TEXT DEFAULT 'Standard',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Bảng Tours (Quản lý các Tour du lịch)
CREATE TABLE IF NOT EXISTS tours (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  total_seats INTEGER NOT NULL DEFAULT 0,
  available_seats INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Planning',
  operator_id UUID REFERENCES profiles(id),
  guide_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  airline TEXT,
  hotel TEXT,
  commission NUMERIC DEFAULT 0,
  sold_seats INTEGER DEFAULT 0,
  hold_seats INTEGER DEFAULT 0,
  seat_status TEXT DEFAULT 'Còn chỗ',
  flight_out TEXT,
  flight_out_transit TEXT,
  flight_in TEXT,
  flight_in_transit TEXT,
  transit_info TEXT,
  guide_phone TEXT,
  ticket_status TEXT DEFAULT 'CHỜ XUẤT VÉ',
  ticket_deadline TEXT,
  visa_deadline TEXT,
  description TEXT,
  category TEXT,
  hold_duration_hours INTEGER DEFAULT 48,
  overbook_limit INTEGER DEFAULT 0,
  price_adult NUMERIC DEFAULT 0,
  price_child NUMERIC DEFAULT 0,
  price_infant NUMERIC DEFAULT 0,
  single_room_surcharge NUMERIC DEFAULT 0,
  itinerary_pdf_url TEXT,
  notice_sections TEXT,
  departure_time TEXT,
  return_time TEXT,
  tour_status TEXT DEFAULT 'available',
  tour_type TEXT DEFAULT 'internal',
  partner_name TEXT,
  partner_contact TEXT,
  organization_name TEXT,
  group_leader_contact TEXT,
  custom_requirements TEXT,
  visa_country TEXT,
  visa_service_type TEXT,
  visa_speed TEXT,
  departure_date DATE,
  price_visa_tour NUMERIC DEFAULT 0,
  CONSTRAINT tours_pkey PRIMARY KEY (id),
  CONSTRAINT tours_code_key UNIQUE (code)
);

-- Cuối file: Các câu lệnh cập nhật schema bổ sung cho database cũ
-- Chạy đoạn này nếu bạn gặp lỗi "Could not find column price_visa_tour"
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_visa_tour NUMERIC DEFAULT 0;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS needs_visa_service BOOLEAN DEFAULT FALSE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS passport_issue_date TEXT;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS passport_expiry_date TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS departure_date DATE;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_infant NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS single_room_surcharge NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS airline TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS hotel TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS itinerary_pdf_url TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS notice_sections TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS departure_time TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS return_time TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_status TEXT DEFAULT 'available';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_type TEXT DEFAULT 'internal';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS partner_contact TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS group_leader_contact TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS custom_requirements TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_country TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_service_type TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_speed TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_company_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_tax_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ctv_info TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  type TEXT NOT NULL, -- 'agency', 'collaborator', 'individual'
  address TEXT,
  total_bookings INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Bảng Bookings (Quản lý đặt chỗ - Ánh xạ sang Orders trong React)
CREATE TABLE IF NOT EXISTS bookings (
  id uuid NOT NULL DEFAULT uuid_generate_v4 (),
  code text NULL,
  tour_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  passengers integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NULL DEFAULT 'Pending'::text,
  salesperson_id uuid NOT NULL,
  created_at timestamp WITH TIME ZONE NOT NULL DEFAULT timezone ('utc'::text, now()),
  created_by text NULL,
  user_id uuid NULL,
  hold_expiry text NULL,
  invoice_status text NULL DEFAULT 'pending'::text,
  extension_status text NULL DEFAULT 'none'::text,
  extension_hours integer NULL DEFAULT 0,
  is_extended boolean NULL DEFAULT false,
  booker_name text NULL,
  booker_phone text NULL,
  adult_count integer NULL DEFAULT 1,
  child_count integer NULL DEFAULT 0,
  infant_count integer NULL DEFAULT 0,
  single_room_count integer NULL DEFAULT 0,
  room_share_info text NULL,
  vat_option text NULL DEFAULT 'no_vat'::text,
  special_requests text NULL,
  ctv_info text NULL,
  discount_type text NULL,
  discount_value numeric DEFAULT 0,
  surcharge_name text NULL,
  surcharge_amount numeric DEFAULT 0,
  cancel_reason text NULL,
  booking_date date NULL DEFAULT CURRENT_DATE,
  payment_status text NULL DEFAULT 'pending'::text,
  seats integer NULL DEFAULT 1,
  contract_url text NULL,
  is_locked boolean NULL DEFAULT false,
  seller_type text NULL DEFAULT 'direct'::text,
  partner_id uuid NULL,
  original_price numeric NULL DEFAULT 0,
  selling_price numeric NULL DEFAULT 0,
  price_markup numeric NULL DEFAULT 0,
  cit_tax_percent numeric NULL DEFAULT 17,
  vat_tax_percent numeric NULL DEFAULT 8,
  markup_fee_amount numeric NULL DEFAULT 0,
  net_commission_amount numeric NULL DEFAULT 0,
  net_payable_amount numeric NULL DEFAULT 0,
  agent_commission_amount numeric NULL DEFAULT 0,
  customer_source text NULL DEFAULT 'Quảng cáo'::text,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_code_key UNIQUE (code),
  CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id),
  CONSTRAINT bookings_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES profiles (id),
  CONSTRAINT bookings_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES tours (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- 5. Bảng Invoices (Quản lý hóa đơn - Thu/Chi)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_code TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  file_url TEXT,
  created_by TEXT,
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. Bảng Passengers (Hành khách chi tiết trong từng Booking)
CREATE TABLE IF NOT EXISTS passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  is_payer BOOLEAN DEFAULT FALSE,
  full_name TEXT NOT NULL,
  passport_number TEXT,
  phone TEXT,
  dob TEXT,
  passport_url TEXT,
  labor_contract_url TEXT,
  visa_status TEXT DEFAULT 'pending',
  needs_visa_service BOOLEAN DEFAULT FALSE,
  visa_submitted_at TEXT,
  visa_disqualified_reason TEXT,
  gender TEXT,
  nationality TEXT,
  passport_issue_date TEXT,
  passport_expiry_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. Bảng System Notifications (Thông báo hệ thống)
CREATE TABLE IF NOT EXISTS system_notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  read BOOLEAN DEFAULT FALSE
);

-- 9. Bảng Tour Categories (Danh mục sản phẩm)
CREATE TABLE IF NOT EXISTS tour_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. Bảng App Settings (Cấu hình hệ thống chung)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. Bảng Chi phí Tour (Tour Costs - Lưu trữ chi tiết chi phí riêng biệt cho từng tour để tránh xung đột ghi đè)
CREATE TABLE IF NOT EXISTS tour_costs (
  tour_id UUID PRIMARY KEY REFERENCES tours(id) ON DELETE CASCADE,
  flight_amount NUMERIC NOT NULL DEFAULT 0,
  insurance_amount NUMERIC NOT NULL DEFAULT 0,
  tour_guide_amount NUMERIC NOT NULL DEFAULT 0,
  gift_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  advertising_amount NUMERIC NOT NULL DEFAULT 0,
  other_amount NUMERIC NOT NULL DEFAULT 0,
  visa_amount NUMERIC NOT NULL DEFAULT 0,
  landtours JSONB NOT NULL DEFAULT '[]'::jsonb,
  partner_payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- KÍCH HOẠT ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_costs ENABLE ROW LEVEL SECURITY;

-- CẤP QUYỀN TRUY CẬP CHO USER ĐÃ ĐĂNG NHẬP
DROP POLICY IF EXISTS "Allow authenticated access to profiles" ON profiles;
CREATE POLICY "Allow authenticated access to profiles" ON profiles FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to tours" ON tours;
CREATE POLICY "Allow authenticated access to tours" ON tours FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to customers" ON customers;
CREATE POLICY "Allow authenticated access to customers" ON customers FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to bookings" ON bookings;
CREATE POLICY "Allow authenticated access to bookings" ON bookings FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to visas" ON visas;
CREATE POLICY "Allow authenticated access to visas" ON visas FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to invoices" ON invoices;
CREATE POLICY "Allow authenticated access to invoices" ON invoices FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to passengers" ON passengers;
CREATE POLICY "Allow authenticated access to passengers" ON passengers FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to system_notifications" ON system_notifications;
CREATE POLICY "Allow authenticated access to system_notifications" ON system_notifications FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to tour_categories" ON tour_categories;
CREATE POLICY "Allow authenticated access to tour_categories" ON tour_categories FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated access to app_settings" ON app_settings;
CREATE POLICY "Allow authenticated access to app_settings" ON app_settings FOR ALL TO authenticated USING (true);

-- TỰ ĐỘNG TẠO PROFILE KHI ĐĂNG KÝ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, company_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    CASE
      WHEN LOWER(new.email) IN ('admin@yourcompany.com') THEN 'admin'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'CTV')
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger vào auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Chèn dữ liệu mẫu ban đầu cho danh mục nếu chưa có
INSERT INTO tour_categories (name) VALUES 
('Du lịch Đông Nam Á'), 
('Du lịch Châu Âu'), 
('Du lịch Đông Bắc Á'), 
('Du lịch Trong Nước') 
ON CONFLICT (name) DO NOTHING;

-- Chèn dữ liệu mẫu cài đặt hạng thành viên
INSERT INTO app_settings (key, value) VALUES 
('membership_settings', '{"silverMin": 20000000, "goldMin": 50000000, "platinumMin": 100000000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- BẬT LẠI RLS CHO TẤT CẢ CÁC BẢNG
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_costs ENABLE ROW LEVEL SECURITY;

-- 13. Bảng Activity Logs (Nhật ký thao tác hệ thống)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT DEFAULT 'CTV',
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- CẤP QUYỀN TRUY CẬP (ĐỌC & GHI) CHO TÀI KHOẢN ĐÃ ĐĂNG NHẬP
DO $$
BEGIN
    -- Xóa các policy cũ để tránh trùng lặp
    DROP POLICY IF EXISTS "Allow authenticated access to profiles" ON profiles;
    DROP POLICY IF EXISTS "Allow authenticated access to tours" ON tours;
    DROP POLICY IF EXISTS "Allow authenticated access to customers" ON customers;
    DROP POLICY IF EXISTS "Allow authenticated access to bookings" ON bookings;
    DROP POLICY IF EXISTS "Allow authenticated access to visas" ON visas;
    DROP POLICY IF EXISTS "Allow authenticated access to invoices" ON invoices;
    DROP POLICY IF EXISTS "Allow authenticated access to passengers" ON passengers;
    DROP POLICY IF EXISTS "Allow authenticated access to system_notifications" ON system_notifications;
    DROP POLICY IF EXISTS "Allow authenticated access to tour_categories" ON tour_categories;
    DROP POLICY IF EXISTS "Allow authenticated access to app_settings" ON app_settings;
    DROP POLICY IF EXISTS "Allow authenticated access to tour_costs" ON tour_costs;
    DROP POLICY IF EXISTS "Allow authenticated access to activity_logs" ON activity_logs;

    -- Tạo policy mới với USING và WITH CHECK để cho phép Thêm/Sửa/Xóa (Insert/Update/Delete)
    CREATE POLICY "Allow authenticated access to profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to tours" ON tours FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to customers" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to bookings" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to visas" ON visas FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to invoices" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to passengers" ON passengers FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to system_notifications" ON system_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to tour_categories" ON tour_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to app_settings" ON app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to tour_costs" ON tour_costs FOR ALL TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Allow authenticated access to activity_logs" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- NÂNG CẤP SCHEMA: Tự động thêm các cột cho bảng tours, tour_costs, profiles nếu đã tồn tại bảng trước đó
ALTER TABLE tour_costs ADD COLUMN IF NOT EXISTS visa_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_salesperson_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_salesperson_id_fkey FOREIGN KEY (salesperson_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS ticket_deadline TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_deadline TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS ticket_status TEXT DEFAULT 'CHỜ XUẤT VÉ';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS hold_duration_hours INTEGER DEFAULT 48;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS overbook_limit INTEGER DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_adult NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_child NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_infant NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS single_room_surcharge NUMERIC DEFAULT 0;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS itinerary_pdf_url TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS notice_sections TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS departure_time TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS return_time TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_status TEXT DEFAULT 'available';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_type TEXT DEFAULT 'internal';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS partner_contact TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS group_leader_contact TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS custom_requirements TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_country TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_service_type TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visa_speed TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_visa_tour NUMERIC DEFAULT 0;

-- ==============================================================================
-- POSTGRESQL VIEWS CHO EXECUTIVE DASHBOARD (/dashboard/executive)
-- ==============================================================================

-- 1. View Tỉ lệ lấp đầy sát ngày bay (< 75% occupancy, khởi hành trong 30 ngày)
CREATE OR REPLACE VIEW executive_tour_occupancy AS
SELECT 
  t.id AS tour_id,
  t.code AS tour_code,
  t.name AS tour_name,
  t.start_date,
  t.total_seats,
  COALESCE(t.sold_seats, 0) AS sold_seats,
  COALESCE(t.hold_seats, 0) AS hold_seats,
  COALESCE(t.sold_seats, 0) + COALESCE(t.hold_seats, 0) AS filled_seats,
  CASE 
    WHEN COALESCE(t.total_seats, 0) > 0 THEN 
      ROUND(((COALESCE(t.sold_seats, 0) + COALESCE(t.hold_seats, 0))::numeric / t.total_seats::numeric) * 100, 2)
    ELSE 0 
  END AS occupancy_rate,
  (t.start_date - CURRENT_DATE) AS days_until_departure
FROM tours t
WHERE t.start_date >= CURRENT_DATE 
  AND t.start_date <= (CURRENT_DATE + INTERVAL '30 days')
  AND (
    CASE 
      WHEN COALESCE(t.total_seats, 0) > 0 THEN 
        ((COALESCE(t.sold_seats, 0) + COALESCE(t.hold_seats, 0))::numeric / t.total_seats::numeric) * 100
      ELSE 0 
    END
  ) < 75;

-- 2. View Quản trị rủi ro hạn chót Visa (< 5 ngày)
CREATE OR REPLACE VIEW executive_visa_risk AS
SELECT 
  p.id AS passenger_id,
  p.full_name AS passenger_name,
  p.passport_number,
  p.visa_status,
  o.id AS order_id,
  o.created_by AS sales_person,
  o.status AS order_status,
  t.id AS tour_id,
  t.code AS tour_code,
  t.name AS tour_name,
  t.visa_deadline
FROM passengers p
JOIN bookings o ON p.order_id = o.id
JOIN tours t ON o.tour_id = t.id
WHERE (o.status = 'Confirmed' OR o.status = 'sure' OR o.status = 'paid')
  AND (p.visa_status IN ('pending', 'processing') OR p.needs_visa_service = TRUE)
  AND t.visa_deadline IS NOT NULL;

-- 3. View Bảng tính Lợi nhuận thuần thực tế
CREATE OR REPLACE VIEW executive_financial_margins AS
SELECT 
  COALESCE(SUM(COALESCE(o.selling_price, o.total_amount, 0)), 0) AS gross_revenue,
  COALESCE(SUM(tc.flight_amount), 0) AS total_flight_cost,
  COALESCE(SUM(tc.commission_amount), 0) AS total_commission_cost,
  COALESCE(SUM(tc.flight_amount + tc.insurance_amount + tc.tour_guide_amount + tc.gift_amount + tc.commission_amount + tc.advertising_amount + tc.other_amount + tc.visa_amount), 0) AS total_expenses,
  (COALESCE(SUM(COALESCE(o.selling_price, o.total_amount, 0)), 0) - COALESCE(SUM(tc.flight_amount + tc.insurance_amount + tc.tour_guide_amount + tc.gift_amount + tc.commission_amount + tc.advertising_amount + tc.other_amount + tc.visa_amount), 0)) AS net_profit
FROM bookings o
LEFT JOIN tour_costs tc ON o.tour_id = tc.tour_id
WHERE o.status IN ('Confirmed', 'sure', 'paid');

-- 4. View Hiệu suất & Tỉ lệ đổi đơn Đại lý
CREATE OR REPLACE VIEW executive_agent_performance AS
SELECT 
  COALESCE(o.user_id::text, o.created_by) AS agent_key,
  o.created_by AS agent_name,
  COUNT(CASE WHEN o.status = 'Hold' OR o.status = 'hold' THEN 1 END) AS hold_count,
  COUNT(CASE WHEN o.status IN ('Confirmed', 'sure', 'paid') THEN 1 END) AS sure_count,
  COUNT(CASE WHEN o.status = 'Cancelled' OR o.status = 'cancelled' THEN 1 END) AS expired_count,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(CASE WHEN o.status IN ('Confirmed', 'sure', 'paid') THEN COALESCE(o.selling_price, o.total_amount, 0) ELSE 0 END), 0) AS total_revenue,
  CASE 
    WHEN COUNT(o.id) > 0 THEN ROUND((COUNT(CASE WHEN o.status IN ('Confirmed', 'sure', 'paid') THEN 1 END)::numeric / COUNT(o.id)::numeric) * 100, 2)
    ELSE 0 
  END AS conversion_rate_pct,
  CASE 
    WHEN COUNT(o.id) > 0 THEN ROUND((COUNT(CASE WHEN o.status = 'Cancelled' OR o.status = 'cancelled' THEN 1 END)::numeric / COUNT(o.id)::numeric) * 100, 2)
    ELSE 0 
  END AS expired_rate_pct
FROM bookings o
GROUP BY COALESCE(o.user_id::text, o.created_by), o.created_by;

-- ==============================================================================
-- BẢNG ĐỀ NGHỊ THANH TOÁN (PAYMENT PROPOSALS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS payment_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  proposal_type TEXT DEFAULT 'individual',
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Chuyển khoản',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  tour_code TEXT,
  tour_name TEXT,
  due_date TEXT,
  file_url TEXT,
  note TEXT,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  leader_status TEXT DEFAULT 'pending',
  leader_approved_by TEXT,
  leader_approved_at TIMESTAMPTZ,
  leader_note TEXT,
  accounting_status TEXT DEFAULT 'pending',
  accounting_approved_by TEXT,
  accounting_approved_at TIMESTAMPTZ,
  accounting_note TEXT,
  accounting_proof_url TEXT,
  status TEXT DEFAULT 'pending_leader'
);

-- ==============================================================================
-- BẢNG ẢNH ĐOÀN / ALBUM KỶ NIỆM TOUR (TOUR MEDIA)
-- ==============================================================================
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_guide_id UUID REFERENCES profiles(id);

CREATE TABLE IF NOT EXISTS tour_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  tour_code TEXT,
  file_url TEXT NOT NULL,
  file_id TEXT,
  file_name TEXT NOT NULL,
  file_size NUMERIC,
  uploaded_by TEXT NOT NULL,
  uploader_role TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho tour_media
CREATE INDEX IF NOT EXISTS idx_tour_media_tour_id ON tour_media(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_media_tour_code ON tour_media(tour_code);

-- Enable RLS & add policies for tour_media and public access
ALTER TABLE tour_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to tours" ON tours;
CREATE POLICY "Allow public read access to tours" ON tours FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow public access to tour_media" ON tour_media;
CREATE POLICY "Allow public access to tour_media" ON tour_media FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Nâng cấp schema cho Đơn hàng: Phân loại cơ chế tài chính giữa Đại lý (Agent) và CTV
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seller_type TEXT DEFAULT 'direct';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partner_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_markup NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS markup_tax_percent NUMERIC DEFAULT 25;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS markup_fee_amount NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS surcharges JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cit_tax_percent NUMERIC DEFAULT 17;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vat_tax_percent NUMERIC DEFAULT 8;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS net_commission_amount NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agent_commission_amount NUMERIC DEFAULT 0;

-- Cập nhật dữ liệu mặc định cho các đơn hàng cũ (Sử dụng đúng cột total_amount)
UPDATE bookings 
SET 
  selling_price = COALESCE(NULLIF(selling_price, 0), total_amount, 0),
  net_payable_amount = COALESCE(NULLIF(net_payable_amount, 0), total_amount, 0)
WHERE selling_price = 0 OR net_payable_amount = 0;

-- Chuyển đổi toàn bộ người dùng có vai trò 'CTV' hiện tại sang 'agent' (Đại lý)
UPDATE profiles SET role = 'agent' WHERE role = 'CTV';
UPDATE bookings SET seller_type = 'agent' WHERE seller_type = 'CTV' OR seller_type = 'ctv';

-- ==============================================================================
-- BẢNG QUẢN LÝ TEAM KINH DOANH (TEAMS) & PHÂN BỔ NHÂN SỰ
-- ==============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  leader_name TEXT,
  kpi_target NUMERIC DEFAULT 800000000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung cột team_id, team_name và các trường mở rộng vào bảng profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_holder TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Standard';

-- Gỡ bỏ ràng buộc khóa ngoại tới auth.users(id) nếu có để cho phép lưu profile của Đại lý/CTV tạo thủ công từ giao diện
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Kích hoạt Row Level Security (RLS) & cấp quyền truy cập đầy đủ cho profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public access to profiles" ON profiles;
CREATE POLICY "Allow public access to profiles" ON profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated access to teams" ON teams;
CREATE POLICY "Allow authenticated access to teams" ON teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to teams" ON teams;
CREATE POLICY "Allow public read access to teams" ON teams FOR SELECT TO anon USING (true);

-- Enable Realtime cho bảng teams, profiles, payment_proposals và chat_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teams;
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    ALTER PUBLICATION supabase_realtime ADD TABLE payment_proposals;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  ELSE
    CREATE PUBLICATION supabase_realtime FOR TABLE teams, profiles, payment_proposals, chat_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ==============================================================================
-- BẢNG QUẢN LÝ TRÒ CHUYỆN NỘI BỘ (CHAT MESSAGES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id TEXT,
  recipient_id TEXT,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  tour_code TEXT,
  order_code TEXT,
  proposal_code TEXT,
  reactions JSONB,
  reply_to JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to chat_messages" ON chat_messages;
CREATE POLICY "Allow public access to chat_messages" ON chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- BẢNG QUẢN LÝ NHÓM / KÊNH TRÒ CHUYỆN NỘI BỘ (CHAT CHANNELS)
CREATE TABLE IF NOT EXISTS chat_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '💬',
  role_access JSONB,
  members JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to chat_channels" ON chat_channels;
CREATE POLICY "Allow public access to chat_channels" ON chat_channels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $;

-- ============================================================================
-- 10. PHÂN HỆ ĐO LƯỜNG META ADS CONVERSIONS API (CAPI) & TRACKING SCHEMA
-- ============================================================================

-- Bổ sung các cột lưu trữ nguồn chiến dịch & Meta tracking vào bảng bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meta_lead_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS conversion_event_id TEXT;

-- Bảng Cấu hình Meta Pixel & CAPI (Meta CAPI Settings)
CREATE TABLE IF NOT EXISTS meta_capi_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  pixel_id TEXT,
  access_token TEXT,
  test_event_code TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE meta_capi_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to meta_capi_settings" ON meta_capi_settings;
CREATE POLICY "Allow public access to meta_capi_settings" ON meta_capi_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bảng Nhật ký Sự kiện Chuyển đổi Meta (Meta Conversion Logs)
CREATE TABLE IF NOT EXISTS meta_conversion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tour_id UUID,
  tour_code TEXT,
  event_name TEXT NOT NULL,
  tracking_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  meta_lead_id TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  hashed_phone TEXT,
  hashed_email TEXT,
  revenue_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'VND',
  payload JSONB,
  response_data JSONB,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_meta_conversion_logs_order_id ON meta_conversion_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_logs_event_name ON meta_conversion_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_meta_conversion_logs_created_at ON meta_conversion_logs(created_at DESC);

ALTER TABLE meta_conversion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to meta_conversion_logs" ON meta_conversion_logs;
CREATE POLICY "Allow public access to meta_conversion_logs" ON meta_conversion_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Kích hoạt Realtime cho Meta Conversion Logs
DO $
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meta_conversion_logs;
    ALTER PUBLICATION supabase_realtime ADD TABLE meta_capi_settings;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $;

-- ==========================================
-- TÍCH HỢP META MESSENGER (CHAT & LEAD SYNC)
-- ==========================================

-- 1. Bảng Fanpage kết nối (facebook_pages)
CREATE TABLE IF NOT EXISTS facebook_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  webhook_subscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE facebook_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to facebook_pages" ON facebook_pages;
CREATE POLICY "Allow access to facebook_pages" ON facebook_pages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Bảng Cuộc hội thoại Meta Messenger (meta_chat_conversations)
CREATE TABLE IF NOT EXISTS meta_chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id TEXT NOT NULL,
  psid TEXT NOT NULL,
  customer_name TEXT,
  customer_avatar TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  ad_id TEXT,
  meta_lead_id TEXT,
  utm_source TEXT DEFAULT 'facebook_messenger',
  utm_campaign TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  last_sender TEXT DEFAULT 'customer',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'lead_captured' | 'lead_converted' | 'archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_page_psid UNIQUE (page_id, psid)
);

CREATE INDEX IF NOT EXISTS idx_meta_conv_page_psid ON meta_chat_conversations(page_id, psid);
CREATE INDEX IF NOT EXISTS idx_meta_conv_last_message_at ON meta_chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_conv_phone ON meta_chat_conversations(customer_phone);

ALTER TABLE meta_chat_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to meta_chat_conversations" ON meta_chat_conversations;
CREATE POLICY "Allow access to meta_chat_conversations" ON meta_chat_conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Bảng Chi tiết Tin nhắn Meta Messenger (meta_chat_messages)
CREATE TABLE IF NOT EXISTS meta_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES meta_chat_conversations(id) ON DELETE CASCADE,
  mid TEXT,
  sender_type TEXT NOT NULL, -- 'customer' | 'page' | 'agent'
  sender_id TEXT,
  sender_name TEXT,
  message_text TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_meta_msg_conv_id ON meta_chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_meta_msg_created_at ON meta_chat_messages(created_at ASC);

ALTER TABLE meta_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to meta_chat_messages" ON meta_chat_messages;
CREATE POLICY "Allow access to meta_chat_messages" ON meta_chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Bảng Khách hàng tiềm năng (leads) từ Pancake & Meta Messenger & Lead Forms
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_avatar TEXT,
  gender TEXT, -- 'Nam' | 'Nữ' | 'Khác'
  source_channel TEXT DEFAULT 'facebook_messenger', -- 'facebook_messenger' | 'pancake_messenger' | 'meta_lead_form' | 'manual'
  page_id TEXT,
  psid TEXT,
  ad_id TEXT,
  form_id TEXT,
  leadgen_id TEXT UNIQUE,
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  message_text TEXT,
  form_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'lead_captured', -- 'lead_captured' | 'contacted' | 'lead_converted' | 'unqualified'
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  tour_interest TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(customer_phone);
CREATE INDEX IF NOT EXISTS idx_leads_psid ON leads(psid);
CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to leads" ON leads;
CREATE POLICY "Allow access to leads" ON leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Bảng Cấu hình Tích hợp bên thứ ba (system_integrations - Pancake, POS Cake, Meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_type TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE system_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to system_integrations" ON system_integrations;
CREATE POLICY "Allow access to system_integrations" ON system_integrations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bổ sung các cột phục vụ tích hợp Botcake / Meta Lead Ads
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meta_lead_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'pending';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_lead_id TEXT;

-- ============================================================
-- 7. BẢNG QUẢN LÝ NGHỈ PHÉP & BẢNG CHẤM CÔNG (HR & TIMESHEET)
-- ============================================================

-- Bảng Ngày Lễ Quốc Gia & Nghỉ Bù
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to holidays" ON holidays;
CREATE POLICY "Allow access to holidays" ON holidays FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bảng Đơn Xin Nghỉ Phép (2 Cấp Phê Duyệt: Leader -> Kế toán/HR)
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_session TEXT DEFAULT 'all_day',
  total_days NUMERIC DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'annual', -- 'annual', 'unpaid', 'compensatory', 'special'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved_level_1', 'approved_final', 'rejected'
  reason TEXT NOT NULL,
  handover_user_id UUID,
  handover_user_name TEXT,
  level_1_approved_by UUID,
  level_1_approved_name TEXT,
  level_1_approved_at TIMESTAMPTZ,
  final_approved_by UUID,
  final_approved_name TEXT,
  final_approved_at TIMESTAMPTZ,
  reject_reason TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bổ sung các cột mở rộng cho leave_requests (nếu bảng đã tồn tại từ trước)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_session TEXT DEFAULT 'all_day';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS total_days NUMERIC DEFAULT 1;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS handover_user_name TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS level_1_approved_name TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS final_approved_name TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to leave_requests" ON leave_requests;
CREATE POLICY "Allow access to leave_requests" ON leave_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bảng Quỹ Phép Năm Nhân Viên
CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days NUMERIC NOT NULL DEFAULT 12,
  used_days NUMERIC NOT NULL DEFAULT 0,
  remaining_days NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Bổ sung các cột mở rộng cho leave_balances (cho các DB đã khởi tạo từ trước)
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS remaining_days NUMERIC DEFAULT 0;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bổ sung cột cho holidays & profiles
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS holiday_type TEXT DEFAULT 'official_paid';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS join_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'official';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resigned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resigned_note TEXT;

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow access to leave_balances" ON leave_balances;
CREATE POLICY "Allow access to leave_balances" ON leave_balances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. Kích hoạt Realtime cho các bảng Chấm công & Nghỉ phép & Leads
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE leave_balances;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE leads;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 9. Bổ sung các cột mở rộng cho leads & customers từ POS Cake / Pancake / Meta Ads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fb_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS adset_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS adset_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS fb_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT;

-- 10. Bảng system_docs (Trung tâm Hướng dẫn & Tài liệu Quy trình hệ thống)
CREATE TABLE IF NOT EXISTS system_docs (
  id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'overview',
  order_index INTEGER NOT NULL DEFAULT 1,
  target_roles TEXT[] DEFAULT ARRAY['all']::TEXT[],
  badge TEXT,
  summary TEXT,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Ban Quản Trị',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index tìm kiếm tài liệu
CREATE INDEX IF NOT EXISTS idx_system_docs_slug ON system_docs (slug);
CREATE INDEX IF NOT EXISTS idx_system_docs_category ON system_docs (category);
CREATE INDEX IF NOT EXISTS idx_system_docs_order ON system_docs (order_index);

-- Bật Row Level Security (RLS) cho system_docs
ALTER TABLE system_docs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_docs' AND policyname = 'Cho phép tất cả đọc tài liệu hướng dẫn'
  ) THEN
    CREATE POLICY "Cho phép tất cả đọc tài liệu hướng dẫn" 
    ON system_docs FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_docs' AND policyname = 'Cho phép người dùng đã đăng nhập quản lý tài liệu'
  ) THEN
    CREATE POLICY "Cho phép người dùng đã đăng nhập quản lý tài liệu" 
    ON system_docs FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Kích hoạt Realtime cho bảng system_docs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE system_docs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Bổ sung cột employment_status cho bảng profiles (Quản lý Thử việc / Chính thức)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'official';

-- ==============================================================================
-- 29. BẢNG CẤU HÌNH TÍCH HỢP WOOCOMMERCE & ACF (WORDPRESS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS woocommerce_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_sync_on_save BOOLEAN DEFAULT false,
  auto_sync_on_booking BOOLEAN DEFAULT false,
  field_mappings JSONB DEFAULT '{
    "start_date": "ngay_khoi_hanh",
    "end_date": "ngay_ve",
    "duration": "thoi_luong",
    "price_child": "gia_tre_em",
    "price_infant": "gia_em_be",
    "single_room_surcharge": "phu_thu_phong_don",
    "price_visa_tour": "phi_visa",
    "airline": "hang_hang_khong",
    "hotel": "khach_san",
    "destination": "diem_den",
    "itinerary_pdf_url": "link_lich_trinh",
    "flight_out": "chuyen_bay_di",
    "flight_in": "chuyen_bay_ve"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kích hoạt Realtime cho bảng woocommerce_configs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE woocommerce_configs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Bổ sung các cột trạng thái đồng bộ WordPress vào bảng tours
ALTER TABLE tours ADD COLUMN IF NOT EXISTS wp_product_id BIGINT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS wp_product_sku TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS wp_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS wp_last_synced_at TIMESTAMPTZ;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS wp_sync_message TEXT;








