-- +goose Up
-- Create stay_points table to store locations where users spend significant time
CREATE TABLE stay_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trajectory_id INTEGER NOT NULL REFERENCES trajectories(id) ON DELETE CASCADE,
    location_id INTEGER, -- Can be NULL if not associated with a known location
    cluster_id INTEGER, -- Can be NULL if not part of a cluster
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for improved query performance
CREATE INDEX idx_stay_points_user_id ON stay_points(user_id);
CREATE INDEX idx_stay_points_trajectory_id ON stay_points(trajectory_id);
CREATE INDEX idx_stay_points_location_id ON stay_points(location_id);
CREATE INDEX idx_stay_points_cluster_id ON stay_points(cluster_id);
CREATE INDEX idx_stay_points_time_range ON stay_points(arrival_time, departure_time);

-- +goose Down
DROP TABLE stay_points;
