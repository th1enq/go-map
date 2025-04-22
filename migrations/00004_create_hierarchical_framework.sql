-- +goose Up
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create hierarchical frameworks table for spatial data clustering
CREATE TABLE hierarchical_frameworks (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create layers table to represent different hierarchical levels
CREATE TABLE layers (
    id SERIAL PRIMARY KEY,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    level INTEGER NOT NULL, -- Hierarchical level (0 = top level, increasing numbers = lower levels)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create clusters table to group spatially related stay points
CREATE TABLE clusters (
    id SERIAL PRIMARY KEY,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    layer_id INTEGER NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius DOUBLE PRECISION NOT NULL, -- In meters
    visit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for improved query performance
CREATE INDEX idx_layers_framework_id ON layers(framework_id);
CREATE INDEX idx_layers_level ON layers(level);
CREATE INDEX idx_clusters_framework_id ON clusters(framework_id);
CREATE INDEX idx_clusters_layer_id ON clusters(layer_id);

-- +goose Down
DROP TABLE IF EXISTS clusters;
DROP TABLE IF EXISTS layers;
DROP TABLE IF EXISTS hierarchical_frameworks;
