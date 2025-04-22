# Go-Map

Go-Map is a comprehensive geospatial application built with Go and JavaScript that allows users to track, analyze, and visualize location data, trajectories, and explore nearby points of interest.

## Features

### 📍 Location Services
- **Search Locations**: Find nearby places based on your current location or any selected point on the map
- **Activity-Based Search**: Search for locations by activities or categories (restaurants, entertainment, sports, etc.)
- **Route Calculation**: Visualize routes between your location and points of interest with distance and time information
- **Custom Location Markers**: Save your own custom locations with categories and descriptions

### 🛣️ Trajectory Management
- **Trajectory Recording**: Create and save your movement paths using various input methods:
  - Manual entry of GPS coordinates
  - Upload GPX, KML, or JSON files containing trajectory data
  - Draw trajectories directly on the map
- **Trajectory Visualization**: View your saved trajectories on an interactive map
- **Stay Point Detection**: Automatically identify locations where users spend significant time

### 🔍 Recommendation System
- **Collaborative Filtering**: Get location recommendations based on similar user trajectories
- **Popularity-Based Recommendations**: Discover hot spots visited by many users
- **Personalized Suggestions**: Receive location recommendations based on your movement patterns

### 👥 User Management
- **User Authentication**: Secure login and registration system with JWT-based authentication
- **User Profiles**: Update personal information and manage location preferences
- **Role-Based Authorization**: Different access levels for regular users and administrators

### ⚙️ Administration Panel
- **User Management**: Create, view, update, and delete user accounts
- **Location Management**: Administer all locations in the system with CRUD operations
- **Trajectory Administration**: Review and manage all user trajectories with visualization capabilities

### 🗺️ Map Features
- **Interactive Maps**: Powered by Leaflet.js for a smooth mapping experience
- **Geocoding**: Convert coordinates to address information and vice versa
- **Current Location Detection**: Easily find and use your current location
- **Distance Calculation**: Calculate distances between points using both as-the-crow-flies and actual route distances

## Technologies

### Backend
- **Go (Golang)**: Primary backend language
- **Gin**: Web framework for handling HTTP requests
- **GORM**: Object-Relational Mapping for database interactions
- **PostGIS/PostgreSQL**: Spatial database for storing location data
- **Goose**: Database migration tool
- **JWT**: For secure authentication

### Frontend
- **HTML/CSS/JavaScript**: Core frontend technologies
- **Bootstrap**: For responsive UI components
- **Leaflet.js**: Interactive map implementation
- **Fetch API**: For making HTTP requests to the backend

### Algorithms
- **Stay Point Detection**: Identifies locations where users spend significant time
- **Hierarchical Clustering**: Groups similar locations together
- **Collaborative Filtering**: For recommendation systems based on user similarities

## Installation and Setup

### Prerequisites
- Docker and Docker Compose

### Environment Variables
Create a `.env` file in the root directory with the following variables:

```
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=go_map
DB_USER=user
DB_PASSWORD=password
JWT_SECRET=your_secret_key_here
```

### Database Setup
1. Start the PostgreSQL database using Docker:

```bash
docker-compose up
```    
2. Load the database schema and initial data:
```bash
make load
```

### Running the Application
```bash
make run
```

Access the application at http://localhost:8080

## Usage Guide

### User Interface
- **Home Page**: Main landing page with links to search and recommendation features
- **Search Page**: Find locations near a specified point or your current location
- **Recommend Page**: Get personalized location recommendations
- **Settings Page**: Manage your profile and your saved locations/trajectories
- **Admin Page**: Access administrative features (admin users only)

### Basic Workflow
1. Register an account or log in
2. Use the search functionality to find locations near you
3. Save trajectories using various input methods
4. Explore recommended locations based on your movements
5. Use the admin panel to manage users and data (admin only)

## API Endpoints

The application exposes the following main API endpoints:

### Authentication
- `POST /api/auth/login`: User login
- `POST /api/auth/register`: User registration
- `POST /api/auth/logout`: User logout
- `GET /api/auth/status`: Check authentication status

### Location Services
- `GET /api/location/search/place`: Search for places by activity
- `GET /api/location/search/activity`: Search for activities by location
- `GET /api/location/rcm/hot`: Get popular locations (hot spots)
- `GET /api/location/rcm/same/:id`: Get recommendations based on similar trajectories

### User Profile
- `GET /api/users/profile`: Get user profile information
- `PUT /api/users/profile`: Update user profile
- `PUT /api/users/password`: Change user password

### Location Management
- `GET /api/locations`: Get user's saved locations
- `POST /api/locations`: Create a new location

### Trajectory Management
- `GET /api/trajectories`: Get user's trajectories
- `POST /api/trajectories`: Create a new trajectory

### Admin API
- `GET /api/admin/users`: Get all users
- `GET /api/admin/locations`: Get all locations
- `GET /api/admin/trajectories`: Get all trajectories
- Plus full CRUD operations for each resource type

## Project Structure

- `cmd/`: Application entry points
- `config/`: Configuration management
- `dataset/`: Sample dataset files
- `internal/`: Application core components
  - `algorithms/`: Trajectory and location analysis algorithms
  - `api/`: Router setup
  - `db/`: Database connection management
  - `handlers/`: Request handlers
  - `middleware/`: Authentication and authorization middleware
  - `models/`: Data models
  - `services/`: Business logic services
- `migrations/`: Database migration files
- `static/`: Static assets (CSS, JavaScript, images)
- `templates/`: HTML templates

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- The GeoLife dataset provided by Microsoft Research for trajectory data
- OpenStreetMap for map data
- OSRM for route calculation services
- Nominatim for geocoding services