-- +goose Up
-- Create locations table to store points of interest
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- Possible values: 'travel', 'restaurant', 'entertainment', 'sport', 'education'
    visit_count INTEGER DEFAULT 0,
    cluster_id INTEGER 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for improved query performance
CREATE INDEX idx_locations_cluster_id ON locations(cluster_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_category ON locations(category);
CREATE INDEX idx_locations_visit_count ON locations(visit_count);

-- +goose Down
DROP INDEX IF EXISTS idx_locations_cluster_id;
DROP INDEX IF EXISTS idx_locations_user_id;
DROP INDEX IF EXISTS idx_locations_category;
DROP INDEX IF EXISTS idx_locations_visit_count;
DROP TABLE IF EXISTS locations;
