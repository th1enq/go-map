load: 
	@echo "Loading dataset..."
	@go run ./cmd/migrate up
	@go run ./cmd/load_dataset 
	@echo "Dataset loaded successfully."

run:
	@echo "Running the application..."
	@go run ./cmd/go_map

admin:
	@echo "Creating admin user..."
	@go run ./cmd/update_admin_password
	@echo "Admin user created successfully."