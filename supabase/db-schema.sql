-- Kohsar Supabase Backend Setup Script
-- Run this in the Supabase SQL Editor

-- 1. Enable PostGIS extension for spatial queries inside the extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Set search path for the session so type lookups resolve
SET search_path = public, extensions;

-- 2. Drop existing components (clean slate reset)
DROP TABLE IF EXISTS profiles, spots, spot_photos, saves, visits, explorer_badges, reports CASCADE;

DROP FUNCTION IF EXISTS get_nearby_spots(DECIMAL, DECIMAL, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_spot(DECIMAL, DECIMAL, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_save_count() CASCADE;
DROP FUNCTION IF EXISTS update_visit_count() CASCADE;
DROP FUNCTION IF EXISTS update_spots_submitted() CASCADE;
DROP FUNCTION IF EXISTS check_submission_limit(UUID) CASCADE;
DROP FUNCTION IF EXISTS auto_hide_reported_spot() CASCADE;

DROP POLICY IF EXISTS "Public Access Photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;

-- 3. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  city TEXT,  -- home city in Balochistan
  bio TEXT,
  explorer_count INTEGER DEFAULT 0,  -- number of spots where user was first submitter
  spots_submitted INTEGER DEFAULT 0,
  spots_visited INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Spots Table
CREATE TABLE IF NOT EXISTS spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('beach', 'waterfall', 'mountain', 'valley', 'viewpoint', 'historical', 'desert', 'forest')),
  city TEXT NOT NULL,  -- nearest city/area in Balochistan
  district TEXT,       -- district name
  access_notes TEXT,   -- how to get there, road conditions
  best_season TEXT,    -- best time to visit
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS point
  lat DECIMAL(10, 8) NOT NULL,   -- stored separately for easy querying
  lng DECIMAL(11, 8) NOT NULL,
  cover_photo_url TEXT,   -- first/main photo
  save_count INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT TRUE,  -- moderation flag
  is_explorer_claimed BOOLEAN DEFAULT FALSE,  -- has first explorer been assigned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for spots
CREATE INDEX IF NOT EXISTS spots_location_idx ON spots USING GIST (location);
CREATE INDEX IF NOT EXISTS spots_category_idx ON spots (category);
CREATE INDEX IF NOT EXISTS spots_city_idx ON spots (city);

-- 4. Create Spot Photos Table
CREATE TABLE IF NOT EXISTS spot_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Saves Table
CREATE TABLE IF NOT EXISTS saves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spot_id)
);

-- 6. Create Visits Table
CREATE TABLE IF NOT EXISTS visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  review TEXT,
  UNIQUE(user_id, spot_id)
);

-- 7. Create Explorer Badges Table
CREATE TABLE IF NOT EXISTS explorer_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE NOT NULL,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id)  -- only one explorer badge per spot
);

-- 8. Create Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  spot_id UUID REFERENCES spots(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('duplicate', 'inappropriate', 'wrong_location', 'spam', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Stored Procedures & Functions

-- Nearby Spots Function
CREATE OR REPLACE FUNCTION get_nearby_spots(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km INTEGER DEFAULT 50,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID, name TEXT, category TEXT, city TEXT,
  lat DECIMAL, lng DECIMAL, cover_photo_url TEXT,
  save_count INTEGER, visit_count INTEGER,
  distance_km DECIMAL, submitted_by UUID, created_at TIMESTAMPTZ
)
LANGUAGE sql
SET search_path = public, extensions
AS $$
  SELECT 
    s.id, s.name, s.category, s.city,
    s.lat, s.lng, s.cover_photo_url,
    s.save_count, s.visit_count,
    ROUND((ST_Distance(s.location, ST_Point(user_lng, user_lat)::geography) / 1000)::DECIMAL, 1) as distance_km,
    s.submitted_by, s.created_at
  FROM spots s
  WHERE 
    s.is_approved = TRUE
    AND ST_DWithin(s.location, ST_Point(user_lng, user_lat)::geography, radius_km * 1000)
  ORDER BY distance_km ASC
  LIMIT limit_count;
$$;

-- Duplicate Detection Function
CREATE OR REPLACE FUNCTION check_duplicate_spot(
  new_lat DECIMAL,
  new_lng DECIMAL,
  radius_meters INTEGER DEFAULT 100
)
RETURNS TABLE (id UUID, name TEXT, distance_m INTEGER)
LANGUAGE sql
SET search_path = public, extensions
AS $$
  SELECT 
    s.id, s.name,
    ROUND(ST_Distance(s.location, ST_Point(new_lng, new_lat)::geography))::INTEGER as distance_m
  FROM spots s
  WHERE ST_DWithin(s.location, ST_Point(new_lng, new_lat)::geography, radius_meters)
  LIMIT 3;
$$;

-- 10. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE explorer_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Spots Policies
CREATE POLICY "Approved spots viewable" ON spots FOR SELECT USING (is_approved = true);
CREATE POLICY "Auth users submit spots" ON spots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owners update own spots" ON spots FOR UPDATE USING (auth.uid() = submitted_by);

-- Spot Photos Policies
CREATE POLICY "Photos viewable" ON spot_photos FOR SELECT USING (true);
CREATE POLICY "Auth insert photos" ON spot_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Saves Policies
CREATE POLICY "Own saves" ON saves FOR ALL USING (auth.uid() = user_id);

-- Visits Policies
CREATE POLICY "Own visits" ON visits FOR ALL USING (auth.uid() = user_id);

-- Explorer Badges Policies
CREATE POLICY "Badges viewable" ON explorer_badges FOR SELECT USING (true);

-- Reports Policies
CREATE POLICY "Auth submit reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Storage Setup
-- Storage buckets must be created manually or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('spot-photos', 'spot-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Public buckets avatars & spot-photos allow public downloads via their public URL directly (without requiring select policies).
-- We omit SELECT policies on storage.objects to prevent clients from listing entire bucket folders.
CREATE POLICY "Auth Upload Photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'spot-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- 12. Triggers

-- Trigger: Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'explorer_' || SUBSTR(NEW.id::TEXT, 1, 6)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: Auto-increment spot save count
CREATE OR REPLACE FUNCTION update_save_count()
RETURNS TRIGGER LANGUAGE plpgsql 
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE spots SET save_count = save_count + 1 WHERE id = NEW.spot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE spots SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.spot_id;
  END If;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_save_change ON saves;
CREATE TRIGGER on_save_change 
  AFTER INSERT OR DELETE ON saves 
  FOR EACH ROW EXECUTE FUNCTION update_save_count();

-- Trigger: Auto-increment visit count
CREATE OR REPLACE FUNCTION update_visit_count()
RETURNS TRIGGER LANGUAGE plpgsql 
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE spots SET visit_count = visit_count + 1 WHERE id = NEW.spot_id;
  UPDATE profiles SET spots_visited = spots_visited + 1 WHERE id = NEW.user_id;
  
  -- Handle explorer badge award on first visit if not claimed
  -- Check if explorer badge is already awarded for this spot
  IF NOT EXISTS (SELECT 1 FROM explorer_badges WHERE spot_id = NEW.spot_id) THEN
    -- Award explorer badge to the visitor
    INSERT INTO explorer_badges (user_id, spot_id) VALUES (NEW.user_id, NEW.spot_id);
    -- Mark spot as explorer claimed
    UPDATE spots SET is_explorer_claimed = TRUE WHERE id = NEW.spot_id;
    -- Increment explorer badge count for the user
    UPDATE profiles SET explorer_count = explorer_count + 1 WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_visit_insert ON visits;
CREATE TRIGGER on_visit_insert 
  AFTER INSERT ON visits 
  FOR EACH ROW EXECUTE FUNCTION update_visit_count();

-- Trigger: Increment spots submitted count
CREATE OR REPLACE FUNCTION update_spots_submitted()
RETURNS TRIGGER LANGUAGE plpgsql 
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.submitted_by IS NOT NULL THEN
    UPDATE profiles SET spots_submitted = spots_submitted + 1 WHERE id = NEW.submitted_by;
  ELSIF TG_OP = 'DELETE' AND OLD.submitted_by IS NOT NULL THEN
    UPDATE profiles SET spots_submitted = GREATEST(spots_submitted - 1, 0) WHERE id = OLD.submitted_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_spot_change ON spots;
CREATE TRIGGER on_spot_change
  AFTER INSERT OR DELETE ON spots
  FOR EACH ROW EXECUTE FUNCTION update_spots_submitted();

-- 13. Submission limit security check (max 5 spots per 24 hours)
CREATE OR REPLACE FUNCTION check_submission_limit(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count 
  FROM spots 
  WHERE submitted_by = user_id AND created_at >= NOW() - INTERVAL '24 hours';
  RETURN recent_count < 5;
END;
$$;

-- Recreate spots insert policy with rate limit check
DROP POLICY IF EXISTS "Auth users submit spots" ON spots;
CREATE POLICY "Auth users submit spots" ON spots FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND check_submission_limit(auth.uid())
);

-- 14. Report abuse auto-hide trigger (hide spot if 5+ reports)
CREATE OR REPLACE FUNCTION auto_hide_reported_spot()
RETURNS TRIGGER LANGUAGE plpgsql 
SET search_path = public, extensions
AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count FROM reports WHERE spot_id = NEW.spot_id;
  IF report_count >= 5 THEN
    UPDATE spots SET is_approved = FALSE WHERE id = NEW.spot_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_change ON reports;
CREATE TRIGGER on_report_change
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION auto_hide_reported_spot();

-- Revoke direct execute privileges on security definer functions to prevent RPC abuse
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION check_submission_limit(UUID) FROM PUBLIC, anon;

