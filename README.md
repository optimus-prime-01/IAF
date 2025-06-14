# VayuReader 📚

> A comprehensive multi-platform solution for PDF management, document search, and content discovery

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Container-blue?logo=docker&logoColor=white)](https://www.docker.com/)

VayuReader is a powerful, multi-module platform designed for seamless PDF document management, intelligent search capabilities, and comprehensive content organization. The platform combines a mobile-first approach with robust backend services and an intuitive admin dashboard.

---

## ✨ Key Features

- 📱 **Android Mobile App** – Built with React Native (Expo) for Android platform
- 🔍 **Intelligent PDF Search** - Advanced search engine with full-text indexing
- 📖 **Dictionary Integration** - Built-in dictionary with synonyms and antonyms  
- 🔤 **Abbreviation Management** - Comprehensive abbreviation lookup system
- 🔐 **Secure Authentication** - JWT-based user authentication and authorization
- 👨‍💼 **Admin Dashboard** - Web-based content management interface
- ☁️ **Cloud-Ready** - Scalable microservices architecture

---

## 🏗️ Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Mobile App        │    │   Backend APIs      │    │   Admin Dashboard   │
│   (React Native)    │◄──►│   (Node.js/Express) │◄──►│   (React/Tailwind)  │
│                     │    │                     │    │                     │
│ • PDF Viewer        │    │ • PDF Search        │    │ • Content Management│
│ • Search Interface  │    │ • Authentication    │    │ • User Management   │
│ • Dictionary        │    │ • Abbreviations     │    │ • File Operations   │
│ • Abbreviations     │    │ • Dictionary API    │    │ • Admin Tools       │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │   MongoDB Atlas     │
                           │   (Database)        │
                           └─────────────────────┘
```

---

## 📂 Project Structure

```
VayuReader/
├── 📱 VayuReader_Frontend/          # Mobile Application
│   ├── app/                         # File-based routing
│   ├── components/                  # Reusable UI components
│   ├── services/                    # API integration
│   └── assets/                      # Images, fonts, etc.
│
├── 🖥️ VayuReader_Backend/           # Backend Services
│   ├── pdf-search-engine/           # PDF management & search
│   ├── abrebiations/                # Abbreviation API
│   ├── dictionary-api/              # Dictionary service
│   ├── auth/                        # Authentication service
│   └── shared/                      # Common utilities
│
└── 🌐 VayuReader_AdminDashboard/    # Web Admin Interface
    ├── frontend/                    # React dashboard
    ├── components/                  # Dashboard components
    └── services/                    # Admin API calls
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0+ (or MongoDB Atlas)
- Expo CLI
- Git
- Docker & Docker Compose (for containerized deployment)

---

### Installation (Manual)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/VayuReader.git
   cd VayuReader
   ```

2. **Backend Setup**
   ```bash
   # PDF Search Engine
   cd VayuReader_Backend/pdf-search-engine
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   
   # Authentication Service
   cd ../auth
   npm install
   cp .env.example .env
   npm run dev
   
   # Repeat for other services...
   ```

3. **Frontend Setup**
   ```bash
   cd VayuReader_Frontend
   npm install
   npm start
   npx expo start --clear

   # Scan the QR code with Expo Go app on your device.
   ```

4. **Admin Dashboard Setup**
   ```bash
   cd VayuReader_AdminDashboard/frontend
   npm install
   npm start
   ```

---

### 🐳 Dockerized Backend (Recommended)

#### 1. **Configure Environment Variables**

Create `.env` files in each backend service directory (see `.env.example` for reference).

#### 2. **Build and Run All Backend Services**

From the `VayuReader_Backend` directory:

```bash
docker-compose up --build
```

This will build and start all backend services as Docker containers.

#### 3. **Access Services**

- Abbreviations API: [http://localhost:4000/api/abbreviations/all](http://localhost:4000/api/abbreviations/all)
- PDF Search Engine: [http://localhost:4001/](http://localhost:4001/)
- Dictionary API: [http://localhost:4002/](http://localhost:4002/)
- Auth API: [http://localhost:4003/](http://localhost:4003/)

#### 4. **Example `docker-compose.yml`**

```yaml
version: "3"
services:
  abrebiations:
    build: ./abrebiations
    ports:
      - "4000:3000"
    env_file:
      - ./abrebiations/.env

  pdf-search-engine:
    build: ./pdf-search-engine
    ports:
      - "4001:3000"
    env_file:
      - ./pdf-search-engine/.env

  dictionary-api:
    build: ./dictionary-api
    ports:
      - "4002:3000"
    env_file:
      - ./dictionary-api/.env

  auth:
    build: ./auth
    ports:
      - "4003:3000"
    env_file:
      - ./auth/.env
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` files in each service directory:

```env
# Example .env configuration
PORT=3000
MONGODB_URI=mongodb://localhost:27017/vayureader
JWT_SECRET=your_super_secure_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10MB
```

---

## 📱 Mobile App Features

- **Intuitive PDF Viewer** with zoom, navigation, and bookmarking
- **Advanced Search** with filters and sorting options
- **Offline Reading** with downloaded content
- **Dictionary Integration** for instant word lookup
- **Abbreviation Expansion** for technical documents
- **User Profiles** with reading history and preferences

---

## 🔌 API Documentation

### PDF Search Engine

| Endpoint      | Method | Description                  |
|---------------|--------|------------------------------|
| `/upload`     | POST   | Upload new PDF documents     |
| `/pdfs`       | GET    | List all available PDFs      |
| `/pdfs/:id`   | GET    | Get specific PDF details     |
| `/search`     | GET    | Search PDFs by content       |


### Abbreviations API

| Endpoint                       | Method | Description                       |
|---------------------------------|--------|-----------------------------------|
| `/abbreviations`               | GET    | List all abbreviations            |
| `/abbreviations`               | POST   | Add new abbreviation              |
| `/refresh`                     | POST   | Refresh JWT token                 |

### Authentication API

| Endpoint   | Method | Description              |
|------------|--------|--------------------------|
| `/signup`  | POST   | Register new user        |
| `/login`   | POST   | User authentication      |
| `/profile` | GET    | Get current user profile |

### Dictionary API

```json
GET /dictionary/:word

Response:
{
  "word": {
    "meanings": [
      ["noun", "definition", ["synonym1", "synonym2"], ["example"]]
    ],
    "synonyms": ["word1", "word2"],
    "antonyms": ["opposite1", "opposite2"]
  }
}
```

---

## 🛠️ Technology Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Navigation library
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **Multer** - File upload handling
- **bcrypt** - Password hashing

### Admin Dashboard
- **React** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Chart.js** - Data visualization

---

## 📊 Features Breakdown

### 🔍 Search Engine
- Full-text search across PDF content
- Advanced query syntax support
- Search result ranking and relevance
- Search history and suggestions

### 📚 Content Management
- Bulk PDF upload and processing
- Metadata management

### 👥 User Management
- Secure user registration and login
- Access control and permissions

---

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
cd VayuReader_Backend
docker-compose up --build
```

### Manual Deployment

1. **Backend Services**: Deploy to your preferred cloud provider (AWS, GCP, Azure, Render, etc.)
2. **Frontend**: Build and deploy using Expo EAS
3. **Admin Dashboard**: Deploy to Vercel, Netlify, or similar platform

### Docker Hub

You can also push your backend images to Docker Hub for easy deployment:

```bash
# Tag and push example for abbreviations service
docker tag vayureader_backend-abrebiations optimusprime01/abreviations:latest
docker push optimusprime01/abreviations:latest
```

Repeat for other services.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

- 📧 Email: support@vayureader.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/VayuReader/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/VayuReader/discussions)

---

## 🎯 Roadmap

- [ ] AI-powered content recommendations
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with cloud storage providers
- [ ] Voice search capabilities
- [ ] Collaborative annotation features

---

<div align="center">
  <strong>Built with ❤️ for the Indian AirForce community</strong>
</div>
