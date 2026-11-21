
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  phone text,
  address text,
  lat double precision,
  lng double precision,
  segment text NOT NULL DEFAULT 'regular',
  coins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Update own profile or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.trusted', true), '') <> 'on'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.coins := OLD.coins;
    NEW.segment := OLD.segment;
    NEW.email := OLD.email;
  END IF;
  IF NEW.coins < 0 THEN NEW.coins := 0; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (NEW.id, NEW.email,
          coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Store settings (single row, admin-only table)
CREATE TABLE public.store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name text NOT NULL DEFAULT 'Goregaon Mart',
  store_address text NOT NULL DEFAULT 'Goregaon West, Mumbai 400104',
  store_phone text,
  store_lat double precision NOT NULL DEFAULT 19.1663,
  store_lng double precision NOT NULL DEFAULT 72.8526,
  delivery_radius_km numeric NOT NULL DEFAULT 8,
  min_order_amount numeric NOT NULL DEFAULT 100,
  delivery_fee numeric NOT NULL DEFAULT 20,
  free_delivery_above numeric NOT NULL DEFAULT 499,
  delivery_eta_minutes integer NOT NULL DEFAULT 45,
  coin_spend_step numeric NOT NULL DEFAULT 100,
  coins_per_step integer NOT NULL DEFAULT 1,
  coin_value numeric NOT NULL DEFAULT 1,
  max_coin_redeem_percent numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings" ON public.store_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update settings" ON public.store_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.store_settings (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.get_public_store_settings()
RETURNS TABLE (
  id integer,
  store_name text,
  store_address text,
  store_lat double precision,
  store_lng double precision,
  delivery_radius_km numeric,
  min_order_amount numeric,
  delivery_fee numeric,
  free_delivery_above numeric,
  delivery_eta_minutes integer,
  coin_spend_step numeric,
  coins_per_step integer,
  coin_value numeric,
  max_coin_redeem_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.store_name, s.store_address, s.store_lat, s.store_lng,
         s.delivery_radius_km, s.min_order_amount, s.delivery_fee, s.free_delivery_above,
         s.delivery_eta_minutes, s.coin_spend_step, s.coins_per_step, s.coin_value,
         s.max_coin_redeem_percent
  FROM public.store_settings s
  WHERE s.id = 1
$$;
REVOKE ALL ON FUNCTION public.get_public_store_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store_settings() TO anon, authenticated, service_role;

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  mrp numeric NOT NULL CHECK (mrp >= 0),
  selling_price numeric NOT NULL CHECK (selling_price >= 0),
  images text[] NOT NULL DEFAULT '{}',
  stock integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active products" ON public.products FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update products" ON public.products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete products" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Banners
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active banners" ON public.banners FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert banners" ON public.banners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update banners" ON public.banners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete banners" ON public.banners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_discount numeric,
  min_order numeric NOT NULL DEFAULT 0,
  target_type text NOT NULL DEFAULT 'all' CHECK (target_type IN ('all','new_users','segment','user')),
  target_segment text,
  target_user_id uuid,
  usage_limit_per_user integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their coupons" ON public.coupons FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (is_active AND (expires_at IS NULL OR expires_at > now()) AND (
      target_type IN ('all','new_users')
      OR (target_type = 'user' AND target_user_id = auth.uid())
      OR (target_type = 'segment' AND target_segment = (SELECT p.segment FROM public.profiles p WHERE p.id = auth.uid()))
    ))
  );
CREATE POLICY "Admins insert coupons" ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update coupons" ON public.coupons FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete coupons" ON public.coupons FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no bigserial UNIQUE,
  user_id uuid NOT NULL,
  items jsonb NOT NULL,
  subtotal numeric NOT NULL,
  coupon_code text,
  coupon_discount numeric NOT NULL DEFAULT 0,
  coins_used integer NOT NULL DEFAULT 0,
  coin_discount numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  coins_earned integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  status text NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','confirmed','packed','out_for_delivery','delivered','cancelled')),
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  distance_km numeric NOT NULL,
  expected_delivery_at timestamptz,
  delivered_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders(user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own orders or admin" ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coin history
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own coin history or admin" ON public.coin_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  amount numeric NOT NULL CHECK (amount >= 0),
  spent_on date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helpers
CREATE OR REPLACE FUNCTION public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

CREATE OR REPLACE FUNCTION public.coupon_discount_for(_user uuid, _code text, _subtotal numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.coupons;
  used integer;
  seg text;
  d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(code) = upper(trim(_code));
  IF NOT FOUND OR NOT c.is_active THEN RAISE EXCEPTION 'Coupon not valid'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RAISE EXCEPTION 'Coupon has expired'; END IF;
  IF _subtotal < c.min_order THEN RAISE EXCEPTION 'Add items worth ₹% to use this coupon', c.min_order; END IF;
  IF c.target_type = 'user' AND c.target_user_id IS DISTINCT FROM _user THEN RAISE EXCEPTION 'Coupon not valid for your account'; END IF;
  IF c.target_type = 'segment' THEN
    SELECT segment INTO seg FROM public.profiles WHERE id = _user;
    IF seg IS DISTINCT FROM c.target_segment THEN RAISE EXCEPTION 'Coupon not valid for your account'; END IF;
  END IF;
  IF c.target_type = 'new_users' AND EXISTS (SELECT 1 FROM public.orders WHERE user_id = _user AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Coupon is only for first orders';
  END IF;
  SELECT count(*) INTO used FROM public.orders
    WHERE user_id = _user AND upper(coupon_code) = upper(c.code) AND status <> 'cancelled';
  IF used >= c.usage_limit_per_user THEN RAISE EXCEPTION 'You have already used this coupon'; END IF;
  IF c.discount_type = 'percent' THEN d := round(_subtotal * c.discount_value / 100, 2);
  ELSE d := c.discount_value; END IF;
  IF c.max_discount IS NOT NULL THEN d := least(d, c.max_discount); END IF;
  RETURN least(d, _subtotal);
END $$;

CREATE OR REPLACE FUNCTION public.preview_coupon(_code text, _subtotal numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  RETURN public.coupon_discount_for(auth.uid(), _code, _subtotal);
END $$;

CREATE OR REPLACE FUNCTION public.place_order(
  _items jsonb, _coupon_code text, _coins_to_use integer,
  _name text, _phone text, _address text, _lat double precision, _lng double precision
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s public.store_settings;
  it jsonb;
  p public.products;
  q integer;
  snapshot jsonb := '[]'::jsonb;
  sub numeric := 0;
  cdisc numeric := 0;
  v_balance integer;
  v_max integer;
  v_redeem integer := 0;
  coin_disc numeric := 0;
  fee numeric := 0;
  payable numeric;
  earned integer;
  dist double precision;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  IF coalesce(trim(_name),'') = '' OR coalesce(trim(_phone),'') = '' OR coalesce(trim(_address),'') = '' THEN
    RAISE EXCEPTION 'Name, phone and address are required';
  END IF;
  SELECT * INTO s FROM public.store_settings WHERE id = 1;

  dist := public.distance_km(s.store_lat, s.store_lng, _lat, _lng);
  IF dist > s.delivery_radius_km THEN
    RAISE EXCEPTION 'Sorry, we deliver only within % km of the store (you are % km away)', s.delivery_radius_km, round(dist::numeric, 1);
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    q := (it->>'qty')::integer;
    IF q IS NULL OR q < 1 OR q > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    SELECT * INTO p FROM public.products WHERE id = (it->>'product_id')::uuid AND is_active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'A product in your cart is no longer available'; END IF;
    IF p.stock < q THEN RAISE EXCEPTION 'Only % left of %', p.stock, p.name; END IF;
    UPDATE public.products SET stock = stock - q WHERE id = p.id;
    sub := sub + p.selling_price * q;
    snapshot := snapshot || jsonb_build_object('product_id', p.id, 'name', p.name, 'qty', q,
      'price', p.selling_price, 'mrp', p.mrp, 'image', p.images[1]);
  END LOOP;

  IF sub < s.min_order_amount THEN
    RAISE EXCEPTION 'Minimum order for delivery is ₹%', s.min_order_amount;
  END IF;

  IF coalesce(trim(_coupon_code),'') <> '' THEN
    cdisc := public.coupon_discount_for(uid, _coupon_code, sub);
  END IF;

  SELECT pr.coins INTO v_balance FROM public.profiles pr WHERE pr.id = uid FOR UPDATE;
  IF coalesce(_coins_to_use, 0) > 0 AND s.coin_value > 0 THEN
    v_max := floor(((sub - cdisc) * s.max_coin_redeem_percent / 100) / s.coin_value);
    v_redeem := least(_coins_to_use, coalesce(v_balance, 0), greatest(v_max, 0));
    coin_disc := v_redeem * s.coin_value;
  END IF;

  IF sub < s.free_delivery_above THEN fee := s.delivery_fee; END IF;
  payable := greatest(sub - cdisc - coin_disc, 0);
  earned := CASE WHEN s.coin_spend_step > 0 THEN floor(payable / s.coin_spend_step)::integer * s.coins_per_step ELSE 0 END;

  INSERT INTO public.orders (user_id, items, subtotal, coupon_code, coupon_discount, coins_used, coin_discount,
    delivery_fee, total, coins_earned, customer_name, phone, address, lat, lng, distance_km, expected_delivery_at)
  VALUES (uid, snapshot, sub, NULLIF(upper(trim(coalesce(_coupon_code,''))), ''), cdisc, v_redeem, coin_disc,
    fee, payable + fee, earned, trim(_name), trim(_phone), trim(_address), _lat, _lng, round(dist::numeric, 2),
    now() + make_interval(mins => s.delivery_eta_minutes))
  RETURNING id INTO new_id;

  PERFORM set_config('app.trusted', 'on', true);
  UPDATE public.profiles pr SET address = trim(_address), lat = _lat, lng = _lng,
    phone = coalesce(pr.phone, trim(_phone)), full_name = coalesce(pr.full_name, trim(_name)),
    coins = pr.coins - v_redeem
  WHERE pr.id = uid;
  IF v_redeem > 0 THEN
    INSERT INTO public.coin_transactions (user_id, order_id, amount, reason)
    VALUES (uid, new_id, -v_redeem, 'Redeemed on order');
  END IF;
  PERFORM set_config('app.trusted', 'off', true);
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_my_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET status = 'cancelled'
  WHERE id = _order_id AND user_id = auth.uid() AND status IN ('placed','confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'This order can no longer be cancelled'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status IN ('delivered','cancelled') THEN
    RAISE EXCEPTION 'Order is already %', OLD.status;
  END IF;
  PERFORM set_config('app.trusted', 'on', true);
  IF NEW.status = 'delivered' THEN
    NEW.delivered_at := now();
    IF NEW.coins_earned > 0 THEN
      UPDATE public.profiles SET coins = coins + NEW.coins_earned WHERE id = NEW.user_id;
      INSERT INTO public.coin_transactions (user_id, order_id, amount, reason)
      VALUES (NEW.user_id, NEW.id, NEW.coins_earned, 'Earned on order #' || NEW.order_no);
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.coins_used > 0 THEN
      UPDATE public.profiles SET coins = coins + NEW.coins_used WHERE id = NEW.user_id;
      INSERT INTO public.coin_transactions (user_id, order_id, amount, reason)
      VALUES (NEW.user_id, NEW.id, NEW.coins_used, 'Refund for cancelled order #' || NEW.order_no);
    END IF;
    FOR it IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      UPDATE public.products SET stock = stock + (it->>'qty')::integer WHERE id = (it->>'product_id')::uuid;
    END LOOP;
  END IF;
  PERFORM set_config('app.trusted', 'off', true);
  RETURN NEW;
END $$;
CREATE TRIGGER orders_status_change BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, text, integer, text, text, text, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.preview_coupon(text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_my_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.coupon_discount_for(uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text, integer, text, text, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_coupon(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_order(uuid) TO authenticated;

-- Product image storage policies (private bucket, admin only)
CREATE POLICY "Admins view product images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Sample data
INSERT INTO public.banners (title, subtitle, image_url, sort_order) VALUES
('Big Savings Week', 'Up to 60% off on top picks', 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400', 1),
('Fast delivery in Goregaon', 'Cash on Delivery · within 8 km', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400', 2);

INSERT INTO public.products (name, description, category, mrp, selling_price, images, is_featured) VALUES
('Red Runner Sneakers', 'Lightweight everyday running shoes with cushioned sole.', 'Footwear', 2999, 1499, ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'], true),
('Classic Analog Watch', 'Minimal dial, leather strap, water resistant.', 'Watches', 3499, 2199, ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'], true),
('Wireless Headphones', 'Over-ear, 30h battery, deep bass.', 'Electronics', 4999, 2499, ARRAY['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'], true),
('Retro Sunglasses', 'UV400 protection with a classic frame.', 'Accessories', 1299, 799, ARRAY['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'], false),
('Street Sneakers', 'Comfortable canvas sneakers for daily wear.', 'Footwear', 1999, 1999, ARRAY['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800'], false),
('Instant Film Camera', 'Fun instant prints for every moment.', 'Electronics', 6999, 5499, ARRAY['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'], true),
('Smart Fitness Watch', 'Heart rate, steps and sleep tracking.', 'Watches', 5999, 3299, ARRAY['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800'], false),
('Studio Headphones', 'Clear sound with a foldable design.', 'Electronics', 2499, 1799, ARRAY['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800'], false),
('Daily Skin Care Kit', 'Cleanser, toner and moisturiser set.', 'Beauty', 1499, 999, ARRAY['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800'], false),
('Vitamin C Serum', 'Brightening serum for glowing skin.', 'Beauty', 899, 549, ARRAY['https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800'], false);

INSERT INTO public.coupons (code, description, discount_type, discount_value, max_discount, min_order, target_type)
VALUES ('WELCOME10', '10% off your first order (max ₹150)', 'percent', 10, 150, 199, 'new_users');
