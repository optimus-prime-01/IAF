# Abbreviations API

A Node.js/Express API for managing abbreviations and their full forms, using MongoDB for storage.

---

## 🚀 Features

- **Add** a new abbreviation and its full form
- **Get all** abbreviations
- **Search** for a specific abbreviation by its short form (case-insensitive)
- **Health Check Endpoints** for all main routes

---

## 🛣️ Endpoints

| Method | Route                          | Description                                 |
|--------|--------------------------------|---------------------------------------------|
| POST   | `/api/abbreviations/`          | Add a new abbreviation and full form        |
| GET    | `/api/abbreviations/all`       | Get all abbreviations and full forms        |
| GET    | `/api/abbreviations/:abbr`     | Get abbreviation and full form by short form|

---

## 🩺 Health Check

The API provides health check endpoints for each main route to help you monitor service availability and integration status.

### Health Check Endpoints

| Endpoint                                         | Description                                   |
|--------------------------------------------------|-----------------------------------------------|
| `GET /api/abbreviations/health`                  | General health check for the abbreviations API|
| `GET /api/abbreviations/health/post`             | Health check for the POST endpoint            |
| `GET /api/abbreviations/health/all`              | Health check for the GET all endpoint         |
| `GET /api/abbreviations/health/:abbr`            | Health check for the GET by abbreviation      |

#### Example Usage

```bash
curl http://localhost:3000/api/abbreviations/health
curl http://localhost:3000/api/abbreviations/health/post
curl http://localhost:3000/api/abbreviations/health/all
curl http://localhost:3000/api/abbreviations/health/NASA
```

**Sample Response:**
```json
{
  "status": "ok",
  "route": "GET /api/abbreviations/all"
}
```

Use these endpoints to verify that each API route is up and responding as expected.  
They are especially useful for automated monitoring and deployment readiness checks.

---

## 🧑‍💻 Usage

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Set up your `.env` file** with MongoDB URI and port.

   Example:
   ```
   MONGO_URI=mongodb://localhost:27017/abbreviations
   PORT=3000
   ```

3. **Start the server:**
   ```sh
   npm run dev
   ```

4. **Interact with the API:**

   - **Add an abbreviation (POST):**
     ```sh
     curl -X POST http://localhost:3000/api/abbreviations/ \
     -H "Content-Type: application/json" \
     -d '{"abbreviation":"NASA","fullForm":"National Aeronautics and Space Administration"}'
     ```

   - **Get all abbreviations (GET):**
     ```sh
     curl http://localhost:3000/api/abbreviations/all
     ```

   - **Get a specific abbreviation (GET):**
     ```sh
     curl http://localhost:3000/api/abbreviations/NASA
     ```

---

## 📝 Example Abbreviation Object

```json
{
  "abbreviation": "NASA",
  "fullForm": "National Aeronautics and Space Administration"
}
```

---

## 📁 Project Structure

```
abbreviations-api/
├── models/
│   └── achro.js         # Mongoose model for abbreviations
├── routes/
│   └── achroRoute.js    # Express routes for API
├── server.js            # Entry point
├── .env                 # Environment variables
└── README.md            # Documentation
```

---

## 🛑 Error Handling

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Abbreviation not found
- **500 Internal Server Error**: Server or database errors

---
