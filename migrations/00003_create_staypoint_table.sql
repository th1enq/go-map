-- +goose Up
-- +goose StatementBegin
CREATE TABLE IF NOT EXISTS stay_points (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for auto-incrementing IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    user_id BIGINT, -- Remove UNSIGNED
    trajectory_id BIGINT, -- Remove UNSIGNED
    latitude DOUBLE PRECISION NOT NULL, -- Use DOUBLE PRECISION for floating-point numbers
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIMESTAMP NOT NULL, -- Use TIMESTAMP instead of DATETIME
    leave_time TIMESTAMP NOT NULL,
    activities JSONB DEFAULT '[]'
);

-- Create index on user_id for faster queries by user
CREATE INDEX idx_staypoints_user_id ON stay_points(user_id);

-- Create index on trajectory_id to optimize trajectory-based queries
CREATE INDEX idx_staypoints_trajectory_id ON stay_points(trajectory_id);

-- Create index on deleted_at for soft deletes
CREATE INDEX idx_staypoints_deleted_at ON stay_points(deleted_at);

-- Create combined index on arrival/leave time for time-based queries
CREATE INDEX idx_staypoints_time_range ON stay_points(arrival_time, leave_time);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS stay_points;
-- +goose StatementEnd