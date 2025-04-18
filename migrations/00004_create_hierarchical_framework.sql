-- +goose Up
CREATE TABLE hierarchical_frameworks (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE layers (
    id SERIAL PRIMARY KEY,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clusters (
    id SERIAL PRIMARY KEY,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    layer_id INTEGER NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius DOUBLE PRECISION NOT NULL,
    visit_count INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hierarchical_graphs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE graph_nodes (
    id SERIAL PRIMARY KEY,
    graph_id INTEGER NOT NULL REFERENCES hierarchical_graphs(id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    visit_count INTEGER NOT NULL,
    first_visit_at TIMESTAMP NOT NULL,
    last_visit_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE graph_edges (
    id SERIAL PRIMARY KEY,
    graph_id INTEGER NOT NULL REFERENCES hierarchical_graphs(id) ON DELETE CASCADE,
    from_node_id INTEGER NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    to_node_id INTEGER NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    transition_time INTEGER NOT NULL,
    visit_count INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- +goose Down
DROP TABLE IF EXISTS graph_edges;
DROP TABLE IF EXISTS graph_nodes;
DROP TABLE IF EXISTS hierarchical_graphs;
DROP TABLE IF EXISTS clusters;
DROP TABLE IF EXISTS layers;
DROP TABLE IF EXISTS hierarchical_frameworks;
