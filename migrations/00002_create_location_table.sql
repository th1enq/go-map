-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for auto-incrementing IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DOUBLE PRECISION NOT NULL, -- Use DOUBLE PRECISION for floating-point numbers
    longitude DOUBLE PRECISION NOT NULL,
    activities JSONB DEFAULT '[]',
    user_id BIGINT, -- Remove UNSIGNED
    visit_count INT DEFAULT 0
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_locations_user_id ON locations(user_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_locations_deleted_at ON locations(deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS locations;
-- +goose StatementEnd