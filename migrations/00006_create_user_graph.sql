-- +goose Up
-- +goose StatementBegin
-- Create user-specific hierarchical graph tables
CREATE TABLE hierarchical_graphs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    framework_id INTEGER NOT NULL REFERENCES hierarchical_frameworks(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create table for nodes in user-specific graphs
CREATE TABLE graph_nodes (
    id SERIAL PRIMARY KEY,
    graph_id INTEGER NOT NULL REFERENCES hierarchical_graphs(id) ON DELETE CASCADE,
    cluster_id INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    visit_count INTEGER NOT NULL DEFAULT 0,
    first_visit_at TIMESTAMP NOT NULL,
    last_visit_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create table for edges connecting nodes in user-specific graphs
CREATE TABLE graph_edges (
    id SERIAL PRIMARY KEY,
    graph_id INTEGER NOT NULL REFERENCES hierarchical_graphs(id) ON DELETE CASCADE,
    from_node_id INTEGER NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    to_node_id INTEGER NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    transition_time INTEGER NOT NULL, -- In seconds
    visit_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- +goose StatementEnd

-- Create indexes for improved query performance
CREATE INDEX idx_hierarchical_graphs_user_id ON hierarchical_graphs(user_id);
CREATE INDEX idx_hierarchical_graphs_framework_id ON hierarchical_graphs(framework_id);
CREATE INDEX idx_graph_nodes_graph_id ON graph_nodes(graph_id);
CREATE INDEX idx_graph_nodes_cluster_id ON graph_nodes(cluster_id);
CREATE INDEX idx_graph_edges_graph_id ON graph_edges(graph_id);
CREATE INDEX idx_graph_edges_from_node_id ON graph_edges(from_node_id);
CREATE INDEX idx_graph_edges_to_node_id ON graph_edges(to_node_id);

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS graph_edges;
DROP TABLE IF EXISTS graph_nodes;
DROP TABLE IF EXISTS hierarchical_graphs;
-- +goose StatementEnd
