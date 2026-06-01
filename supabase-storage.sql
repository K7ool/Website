-- ============================================================
-- Supabase Storage RLS Policies
-- Run this in Supabase Dashboard → SQL Editor
--
-- Buckets to create in Supabase Dashboard → Storage → New Bucket:
--   1. Name: receipts, Public: true
--   2. Name: products,  Public: true
--   3. Name: avatars,   Public: true
-- ============================================================

-- ─── RECEIPTS BUCKET ──────────────────────────────────────────
-- Used by customers uploading payment receipts via CheckoutModal.
-- No auth session (Firebase Auth only), so policies use TO public.

CREATE POLICY "Public can upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

CREATE POLICY "Public can update receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Public can delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');

-- ─── PRODUCTS BUCKET ─────────────────────────────────────────
-- Used by admins uploading product thumbnails, gallery images,
-- and downloadable files. Admins are authenticated via Firebase,
-- but Supabase has no auth session — so TO public is required.
-- Path structure:
--   products/thumbnails/<productId>/<filename>
--   products/gallery/<productId>/<filename>
--   products/downloads/<productId>/<filename>

CREATE POLICY "Public can upload product files"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Public can view product files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

CREATE POLICY "Public can update product files"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Public can delete product files"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'products');

-- ─── AVATARS BUCKET ──────────────────────────────────────────
-- Used by users uploading profile pictures.
-- Same pattern — Firebase Auth, no Supabase session.

CREATE POLICY "Public can upload avatars"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Public can update avatars"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Public can delete avatars"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'avatars');
