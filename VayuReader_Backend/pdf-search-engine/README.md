# PDF Search Engine API

A Node.js/Express API for uploading, searching, and retrieving PDF and image files, using MongoDB for storage.

---

## 🚀 Features

- **Upload** PDF or image files
- **Search** PDFs by metadata or content
- **Get all** PDFs
- **Get PDF by ID**
- **Health Check Endpoints** for all main routes

---

## 🛣️ Endpoints

| Method | Route                    | Description                        |
|--------|--------------------------|------------------------------------|
| POST   | `/api/pdfs/upload`       | Upload a PDF or image file         |
| GET    | `/api/pdfs?search=...`   | Search PDFs                        |
| GET    | `/api/pdfs/all`          | Get all PDFs                       |
| GET    | `/api/pdfs/:id`          | Get a PDF by its ID                |

---

## 🩺 Health Check

The API provides health check endpoints for each main route.

| Endpoint                        | Description                        |
|----------------------------------|------------------------------------|
| `GET /api/pdfs/health/search`    | Health check for search endpoint   |
| `GET /api/pdfs/health/upload`    | Health check for upload endpoint   |
| `GET /api/pdfs/health/all`       | Health check for all PDFs endpoint |
| `GET /api/pdfs/health/:id`       | Health check for get-by-id endpoint|

#### Example Usage

```bash
curl http://localhost:3000/api/pdfs/health/search
curl http://localhost:3000/api/pdfs/health/upload
curl http://localhost:3000/api/pdfs/health/all
curl http://localhost:3000/api/pdfs/health/123456
```

**Sample Response:**
```json
{
  "status": "ok",
  "route": "POST /api/pdfs/upload"
}
```

---

## 🧑‍💻 Usage

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Set up your `.env` file** with MongoDB URI and port.

   Example:
   ```
   MONGO_URI=mongodb://localhost:27017/pdfsearch
   PORT=3000
   ```

3. **Start the server:**
   ```sh
   npm run dev
   ```

---

## 📁 Project Structure

```
pdf-search-engine/
├── middleware/
├── models/
├── routes/
├── server.js
├── .env
└── README.md
```

---
