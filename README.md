# VayuReader 📚

> A comprehensive multi-platform solution for PDF management, document search, and content discovery

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0-green.svg)](https://www.mongodb.com/)

VayuReader is a powerful, multi-module platform designed for seamless PDF document management, intelligent search capabilities, and comprehensive content organization. The platform combines a mobile-first approach with robust backend services and an intuitive admin dashboard.

## ✨ Key Features

- 📱 **Android Mobile App** – Built with React Native (Expo) for Android platform
- 🔍 **Intelligent PDF Search** - Advanced search engine with full-text indexing
- 📖 **Dictionary Integration** - Built-in dictionary with synonyms and antonyms  
- 🔤 **Abbreviation Management** - Comprehensive abbreviation lookup system
- 🔐 **Secure Authentication** - JWT-based user authentication and authorization
- 👨‍💼 **Admin Dashboard** - Web-based content management interface
- ☁️ **Cloud-Ready** - Scalable microservices architecture

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
│   ├── abbreviations/               # Abbreviation API
│   ├── dictionary-api/              # Dictionary service
│   ├── auth/                        # Authentication service
│   └── shared/                      # Common utilities
│
└── 🌐 VayuReader_AdminDashboard/    # Web Admin Interface
    ├── frontend/                    # React dashboard
    ├── components/                  # Dashboard components
    └── services/                    # Admin API calls
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0+
- Expo CLI
- Git

### Installation

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

   After running the command, the Expo CLI will start the Metro Bundler in your terminal or browser.

  Press s in the terminal to switch to Expo Go mode.

  A QR code will be displayed.

  Open the Expo Go app on your Android or iOS device.

  Scan the QR code to launch the app on your phone.

  ⚠️ Make sure your phone and computer are connected to the same Wi-Fi network. This ensures QR scanning works properly.

   ```

4. **Admin Dashboard Setup**
   ```bash
   cd VayuReader_AdminDashboard/frontend
   npm install
   npm start
   ```

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

## 📱 Mobile App Features

- **Intuitive PDF Viewer** with zoom, navigation, and bookmarking
- **Advanced Search** with filters and sorting options
- **Offline Reading** with downloaded content
- **Dictionary Integration** for instant word lookup
- **Abbreviation Expansion** for technical documents
- **User Profiles** with reading history and preferences

## 🔌 API Documentation

### PDF Search Engine

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/upload` | POST | Upload new PDF documents |
| `/pdfs` | GET | List all available PDFs |
| `/pdfs/:id` | GET | Get specific PDF details |
| `/search` | GET | Search PDFs by content |
| `/categories` | GET | Get document categories |

### Abbreviations API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/abbreviations` | GET | List all abbreviations |
| `/abbreviations` | POST | Add new abbreviation |
| `/abbreviations/:id` | PUT | Update abbreviation |
| `/abbreviations/:id` | DELETE | Delete abbreviation |
| `/abbreviations/search` | GET | Search abbreviations |
| `/refresh` | POST | Refresh JWT token |

### Authentication API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/signup` | POST | Register new user |
| `/login` | POST | User authentication |
| `/me` | GET | Get current user profile |

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

## 📊 Features Breakdown

### 🔍 Search Engine
- Full-text search across PDF content
- Category-based filtering
- Advanced query syntax support
- Search result ranking and relevance
- Search history and suggestions

### 📚 Content Management
- Bulk PDF upload and processing
- Automatic text extraction and indexing
- Thumbnail generation
- Metadata management
- Category organization

### 👥 User Management
- Secure user registration and login
- Profile customization
- Reading preferences
- Access control and permissions
- Activity tracking

## 🧪 Testing

```bash
# Run backend tests
cd VayuReader_Backend/pdf-search-engine
npm test

# Run frontend tests
cd VayuReader_Frontend
npm test

# Run admin dashboard tests
cd VayuReader_AdminDashboard/frontend
npm test
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. **Backend Services**: Deploy to your preferred cloud provider (AWS, GCP, Azure)
2. **Frontend**: Build and deploy using Expo EAS
3. **Admin Dashboard**: Deploy to Vercel, Netlify, or similar platform

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- 📧 Email: support@vayureader.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/VayuReader/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/VayuReader/discussions)

## 🎯 Roadmap

- [ ] AI-powered content recommendations
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Integration with cloud storage providers
- [ ] Voice search capabilities
- [ ] Collaborative annotation features

---

<div align="center">
  <strong>Built with ❤️ for the learning community</strong>
</div>
