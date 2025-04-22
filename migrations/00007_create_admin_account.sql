-- +goose Up
-- +goose StatementBegin
INSERT INTO users (username, email, password, role, first_name, last_name, last_login, is_active)
VALUES ('admin', 'admin@geolife.local', '', 'admin', 'Admin', 'Admin', NULL, TRUE)
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM users WHERE email = 'admin@geolife.local'
-- +goose StatementEnd
