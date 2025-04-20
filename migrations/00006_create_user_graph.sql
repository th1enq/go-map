-- +goose Up
-- +goose StatementBegin
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
-- +goose StatementEnd


-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS graph_edges;
DROP TABLE IF EXISTS graph_nodes;
DROP TABLE IF EXISTS hierarchical_graphs;
-- +goose StatementEnd
