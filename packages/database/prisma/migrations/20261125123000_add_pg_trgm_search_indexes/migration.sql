-- Enable pg_trgm for typo-tolerant fuzzy search and fast ILIKE / similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_ads_title_trgm ON ads USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ads_description_trgm ON ads USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ad_attribute_values_value_trgm ON ad_attribute_values USING gin (value gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm ON categories USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm ON locations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON profiles USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_business_name_trgm ON profiles USING gin (business_name gin_trgm_ops);
