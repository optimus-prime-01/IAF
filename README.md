# VayuReader Project

This project is a comprehensive platform for secure PDF management, content discovery, and administration. It consists of a robust backend, web-based admin dashboard, and a mobile application.

## 📂 Project Structure

- **`VayuReader_Backend_v2/`**: Node.js backend services, database (MongoDB), Redis cache, Elasticsearch, and Nginx (Dockerized).
- **`VayuReader_Frontend/`**: React Native (Expo) mobile application.
- **`admin-dashboard/`**: React-based web administration interface.

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- **Docker Desktop** (Make sure to enable Docker Compose v2)
- **Node.js** (LTS recommended)
- **npm** (comes with Node.js)

> **Note on Docker Compose:**
> This project uses the modern `docker compose` command (v2) instead of the legacy `docker-compose` (v1). Ensure your Docker installation is up to date.

---

### 1. Backend Setup (Docker)

The backend runs as a containerized stack including Node.js, MongoDB, Redis, Nginx, and an SMS simulator.

#### A. Generate SSL Certificates (One-time Setup)

Since the backend runs over HTTPS locally, you need to generate self-signed certificates.

1. Navigate to the backend directory:
   ```sh
   cd VayuReader_Backend_v2
   ```

2. Run the following command to generate certificates:
   ```sh
   docker run --rm -v "$(pwd)/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && \
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
   -keyout /certs/server.key -out /certs/server.crt \
   -subj '/C=US/ST=State/L=City/O=Organization/CN=localhost' \
   -addext 'subjectAltName = DNS:localhost, IP:127.0.0.1'"
   ```

#### B. Start Backend Services

Start the backend services using Docker Compose:

```sh
# Start services in detached mode with the 'dev' profile (includes SMS simulator)
docker compose --profile dev up -d --build
```

Wait a few moments for all containers to initialize.

#### C. Seed Super Admin User

Create a default Super Admin account to access the system:

```sh
docker compose exec app node scripts/seedAdmin.js "9999999999" "Password123" "Super Admin"
```
*(Replace the phone number and password as needed)*

#### D. Verify Backend

- **API Health Check**: [https://localhost/health](https://localhost/health) (Accept the self-signed certificate warning)
- **SMS Simulator**: [http://localhost:8000](http://localhost:8000)

---

### 2. Admin Dashboard Setup

The admin dashboard connects to the backend API. It can be run locally using `npm` or as a Docker container.

#### Option A: Run Locally (npm)

1. Open a new terminal and navigate to the `admin-dashboard` directory:
   ```sh
   cd admin-dashboard
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the dashboard:
   ```sh
   # Sets the port to 3001 and starts the app (HTTPS enabled per .env.local)
   PORT=3001 npm start
   ```

- Access the **Admin Dashboard** at: [https://localhost:3001](https://localhost:3001)
  *(Accept the self-signed certificate warning)*

#### Option B: Run with Docker

1. Navigate to the directory:
   ```sh
   cd admin-dashboard
   ```

2. Build and run the container:
   ```sh
   # Build the image
   docker build -t vayureader-admin .

   # Run container
   # - Maps host port 3001 to container port 3000
   # - Sets HOST=0.0.0.0 to allow external access
   docker run -d -p 3001:3000 -e HOST=0.0.0.0 --name vayureader-admin vayureader-admin
   ```

- Access the **Admin Dashboard** at: [https://localhost:3001](https://localhost:3001)

---

### 3. Mobile App Setup (Frontend)

The mobile app is built with React Native and Expo.

1. Open a new terminal and navigate to the `VayuReader_Frontend` directory:
   ```sh
   cd VayuReader_Frontend
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Start the app:
   ```sh
   npm run android
   # or
   npm run ios
   ```

This will launch the application on your connected device or emulator.

---

## 🛠 Troubleshooting

- **Check Logs**: If a service isn't starting, check the logs:
  ```sh
  cd VayuReader_Backend_v2
  docker compose logs -f app
  ```

- **Stop Services**: To stop all running backend containers:
  ```sh
  cd VayuReader_Backend_v2
  docker compose down
  ```

- **Rebuild Containers**: If you made changes to the `Dockerfile` or dependencies:
  ```sh
  docker compose --profile dev up -d --build
  ```

## 📚 Documentation

For more detailed guides, refer to:
- [Backend Setup Guide](setupBackend.md)
- [Frontend Setup Guide](setupFrontend.md)
- [Backend Startup Reference](backendstartup.md)
