-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS trajectories (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for auto-incrementing IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    user_id BIGINT, -- Remove UNSIGNED
    points JSONB NOT NULL DEFAULT '[]',
    start_time TIMESTAMP NOT NULL, -- Use TIMESTAMP instead of DATETIME
    end_time TIMESTAMP NOT NULL
);

-- Create index on user_id for faster user-based queries
CREATE INDEX idx_trajectories_user_id ON trajectories(user_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_trajectories_deleted_at ON trajectories(deleted_at);

-- Create index on time range for efficient time-based queries
CREATE INDEX idx_trajectories_time_range ON trajectories(start_time, end_time);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS trajectories;
-- +goose StatementEnd