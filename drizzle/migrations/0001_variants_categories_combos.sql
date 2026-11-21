-- Categories & subcategories (parent_id NULL = top-level category)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categories_name_parent_uniq ON public.categories (lower(name), coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active categories" ON public.categories FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update categories" ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete categories" ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.products
  ADD COLUMN category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

INSERT INTO public.categories (name, sort_order)
SELECT category, (row_number() OVER (ORDER BY category))::integer FROM (SELECT DISTINCT category FROM public.products) d;
UPDATE public.products p SET category_id = c.id
FROM public.categories c WHERE c.parent_id IS NULL AND lower(c.name) = lower(p.category);

-- Product variants (sizes / flavours)
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  subtitle text,
  sku text,
  mrp numeric NOT NULL,
  selling_price numeric NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_price_ok CHECK (selling_price > 0 AND mrp >= selling_price),
  CONSTRAINT product_variants_stock_ok CHECK (stock >= 0)
);
CREATE INDEX product_variants_product_idx ON public.product_variants (product_id);
GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active variants" ON public.product_variants FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert variants" ON public.product_variants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update variants" ON public.product_variants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete variants" ON public.product_variants FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Keep the product's shown price (cheapest option) and total stock in sync with its options
CREATE OR REPLACE FUNCTION public.sync_product_from_variants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN pid := OLD.product_id; ELSE pid := NEW.product_id; END IF;
  UPDATE public.products p SET selling_price = x.sp, mrp = x.mrp, stock = x.st
  FROM (
    SELECT (array_agg(v.selling_price ORDER BY v.selling_price, v.sort_order))[1] AS sp,
           (array_agg(v.mrp ORDER BY v.selling_price, v.sort_order))[1] AS mrp,
           sum(v.stock)::integer AS st
    FROM public.product_variants v WHERE v.product_id = pid AND v.is_active
    HAVING count(*) > 0
  ) x
  WHERE p.id = pid;
  RETURN NULL;
END $$;
CREATE TRIGGER product_variants_sync AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_from_variants();
REVOKE EXECUTE ON FUNCTION public.sync_product_from_variants() FROM PUBLIC, anon, authenticated;

-- Private cost prices (admin only)
CREATE TABLE public.product_costs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_price numeric NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_costs TO authenticated;
GRANT ALL ON public.product_costs TO service_role;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage product costs" ON public.product_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.variant_costs (
  variant_id uuid PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  cost_price numeric NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variant_costs TO authenticated;
GRANT ALL ON public.variant_costs TO service_role;
ALTER TABLE public.variant_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage variant costs" ON public.variant_costs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Combo offers. items: [{product_id, variant_id|null, qty}]
CREATE TABLE public.combo_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  combo_price numeric NOT NULL CHECK (combo_price > 0),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.combo_offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.combo_offers TO authenticated;
GRANT ALL ON public.combo_offers TO service_role;
ALTER TABLE public.combo_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads live combos" ON public.combo_offers FOR SELECT TO anon, authenticated
  USING ((is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()))
         OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert combos" ON public.combo_offers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update combos" ON public.combo_offers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete combos" ON public.combo_offers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- place_order: same signature; items may carry variant_id or combo_id
CREATE OR REPLACE FUNCTION public.place_order(
  _items jsonb, _coupon_code text, _coins_to_use integer,
  _name text, _phone text, _address text, _lat double precision, _lng double precision
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s public.store_settings;
  it jsonb;
  ci jsonb;
  p public.products;
  pv public.product_variants;
  cb public.combo_offers;
  q integer;
  unit_q integer;
  cq integer;
  comp_vid uuid;
  comps jsonb;
  cmrp numeric;
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

    IF nullif(it->>'combo_id','') IS NOT NULL THEN
      SELECT * INTO cb FROM public.combo_offers
      WHERE id = (it->>'combo_id')::uuid AND is_active
        AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now());
      IF NOT FOUND THEN RAISE EXCEPTION 'A combo offer in your cart has ended'; END IF;
      IF jsonb_array_length(cb.items) = 0 THEN RAISE EXCEPTION 'Combo % is not available', cb.title; END IF;
      comps := '[]'::jsonb;
      cmrp := 0;
      FOR ci IN SELECT * FROM jsonb_array_elements(cb.items) LOOP
        unit_q := greatest(coalesce((ci->>'qty')::integer, 1), 1);
        cq := unit_q * q;
        comp_vid := NULL;
        SELECT * INTO p FROM public.products WHERE id = (ci->>'product_id')::uuid AND is_active FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Combo % is no longer available', cb.title; END IF;
        IF nullif(ci->>'variant_id','') IS NOT NULL THEN
          SELECT * INTO pv FROM public.product_variants
          WHERE id = (ci->>'variant_id')::uuid AND product_id = p.id AND is_active FOR UPDATE;
          IF NOT FOUND THEN RAISE EXCEPTION 'Combo % is no longer available', cb.title; END IF;
          IF pv.stock < cq THEN RAISE EXCEPTION 'Only % left of % — %', pv.stock, p.name, pv.name; END IF;
          UPDATE public.product_variants SET stock = stock - cq WHERE id = pv.id;
          cmrp := cmrp + pv.mrp * unit_q;
          comp_vid := pv.id;
        ELSE
          IF p.stock < cq THEN RAISE EXCEPTION 'Only % left of %', p.stock, p.name; END IF;
          UPDATE public.products SET stock = stock - cq WHERE id = p.id;
          cmrp := cmrp + p.mrp * unit_q;
        END IF;
        comps := comps || jsonb_build_object('product_id', p.id, 'variant_id', comp_vid, 'qty', cq);
      END LOOP;
      sub := sub + cb.combo_price * q;
      snapshot := snapshot || jsonb_build_object('combo_id', cb.id, 'name', 'Combo: ' || cb.title, 'qty', q,
        'price', cb.combo_price, 'mrp', greatest(cmrp, cb.combo_price), 'image', cb.image_url, 'components', comps);
    ELSE
      SELECT * INTO p FROM public.products WHERE id = (it->>'product_id')::uuid AND is_active FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'A product in your cart is no longer available'; END IF;
      IF nullif(it->>'variant_id','') IS NOT NULL THEN
        SELECT * INTO pv FROM public.product_variants
        WHERE id = (it->>'variant_id')::uuid AND product_id = p.id AND is_active FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'An option of % in your cart is no longer available', p.name; END IF;
        IF pv.stock < q THEN RAISE EXCEPTION 'Only % left of % — %', pv.stock, p.name, pv.name; END IF;
        UPDATE public.product_variants SET stock = stock - q WHERE id = pv.id;
        sub := sub + pv.selling_price * q;
        snapshot := snapshot || jsonb_build_object('product_id', p.id, 'variant_id', pv.id,
          'name', p.name || ' — ' || pv.name, 'qty', q, 'price', pv.selling_price, 'mrp', pv.mrp,
          'image', coalesce(pv.image_url, p.images[1]));
      ELSE
        IF EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = p.id AND is_active) THEN
          RAISE EXCEPTION 'Please choose a size or flavour for %', p.name;
        END IF;
        IF p.stock < q THEN RAISE EXCEPTION 'Only % left of %', p.stock, p.name; END IF;
        UPDATE public.products SET stock = stock - q WHERE id = p.id;
        sub := sub + p.selling_price * q;
        snapshot := snapshot || jsonb_build_object('product_id', p.id, 'name', p.name, 'qty', q,
          'price', p.selling_price, 'mrp', p.mrp, 'image', p.images[1]);
      END IF;
    END IF;
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

CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE it jsonb; ci jsonb;
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
      IF jsonb_typeof(it->'components') = 'array' THEN
        FOR ci IN SELECT * FROM jsonb_array_elements(it->'components') LOOP
          IF nullif(ci->>'variant_id','') IS NOT NULL THEN
            UPDATE public.product_variants SET stock = stock + (ci->>'qty')::integer WHERE id = (ci->>'variant_id')::uuid;
          ELSE
            UPDATE public.products SET stock = stock + (ci->>'qty')::integer WHERE id = (ci->>'product_id')::uuid;
          END IF;
        END LOOP;
      ELSIF nullif(it->>'variant_id','') IS NOT NULL THEN
        UPDATE public.product_variants SET stock = stock + (it->>'qty')::integer WHERE id = (it->>'variant_id')::uuid;
      ELSE
        UPDATE public.products SET stock = stock + (it->>'qty')::integer WHERE id = (it->>'product_id')::uuid;
      END IF;
    END LOOP;
  END IF;
  PERFORM set_config('app.trusted', 'off', true);
  RETURN NEW;
END $$;