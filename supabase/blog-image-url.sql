-- Cover image for blog posts (stored in Supabase Storage so it survives the
-- WordPress cutover). Added for the WP blog import.
alter table public.blog_posts
  add column if not exists image_url text;
