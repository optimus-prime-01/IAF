

# 📚 Dictionary API

A RESTful API to store and retrieve dictionary data using Node.js, Express, and MongoDB.

### 🚀 Features

* `POST /api/dictionary/upload` — Upload dictionary JSON data
* `GET /api/dictionary/word/:word` — Fetch meaning of a word
* `GET /api/dictionary/words` — Get words
* Health check routes for monitoring

### 🔧 Setup

1. Clone repo and install:

   ```bash
   npm install
   ```
2. Add `.env`:

   ```
   MONGODB_URI=mongodb://localhost:27017/dictionary
   PORT=3000
   ```
3. Run app:

   ```bash
   npm run dev   # for development
   npm start     # for production
   ```

### 📦 Data Format

```json
{
  "WORD": {
    "MEANINGS": [["Verb", "Definition", ["syn1"], ["example"]]],
    "ANTONYMS": ["ant1"],
    "SYNONYMS": ["syn1"]
  }
}
```

### ✅ Endpoints

* `POST /api/dictionary/upload`
* `GET /api/dictionary/word/:word`
* `GET /api/dictionary/words`
* `GET /api/dictionary/health`
* `GET /api/dictionary/health/upload`
* `GET /api/dictionary/health/word/:word`
* `GET /api/dictionary/health/words`

### 🧪 Testing

* Use cURL or Postman to test endpoints
* Upload a sample dictionary JSON
* Query words and check health endpoints

### 🛠 Project Structure

```
├── server.js
├── .env
├── config/database.js
├── models/Word.js
├── routes/dictionary.js
```

### ⚠️ Errors

* `400`: Bad input
* `404`: Word not found
* `500`: Server error

