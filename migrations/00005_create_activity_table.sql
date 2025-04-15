-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for auto-incrementing IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    categories JSONB DEFAULT '[]'
);

-- Create index on name for faster lookups
CREATE INDEX idx_activities_name ON activities(name);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_activities_deleted_at ON activities(deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS activities;
-- +goose StatementEnd