-- +goose Up
-- Create trajectories table to store user movement paths
CREATE TABLE trajectories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    points JSONB NOT NULL, -- Stores an array of GPSPoint objects with lat, lng, altitude and timestamp
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for improved query performance
CREATE INDEX idx_trajectories_user_id ON trajectories(user_id);
CREATE INDEX idx_trajectories_time_range ON trajectories(start_time, end_time);

-- +goose Down
DROP TABLE trajectories;
