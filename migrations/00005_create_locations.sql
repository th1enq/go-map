-- +goose Up
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    visit_count INTEGER DEFAULT 0,
    popularity DOUBLE PRECISION DEFAULT 0,
    cluster_id INTEGER REFERENCES clusters(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_locations_cluster_id ON locations(cluster_id);

-- +goose Down
DROP INDEX IF EXISTS idx_locations_cluster_id;
DROP TABLE IF EXISTS locations;
