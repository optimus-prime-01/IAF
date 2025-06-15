# Dictionary API

A  REST API for storing and retrieving dictionary data using Node.js, Express, and MongoDB.

## Features

- **POST** `/api/dictionary/upload` - Upload large dictionary JSON data
- **GET** `/api/dictionary/word/:word` - Get meaning of a specific word
- **GET** `/api/dictionary/words` - Get list of all words (limited to 100 for testing)

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation (for local development)

1. **Clone or create the project directory**
   ```bash
   mkdir dictionary-api
   cd dictionary-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your MongoDB connection string and port as shown below:

   #### Example `.env` file structure:
   ```
   MONGODB_URI=mongodb://localhost:27017/dictionary
   PORT=3000
   ```

4. **Start MongoDB**
   - For local MongoDB: `mongod`
   - For MongoDB Atlas: Use the connection string provided

5. **Run the application**
   ```bash
   # Development mode with auto-restart
   npm run dev

   # Production mode
   npm start
   ```

## API Usage

All endpoints are available at the deployed URL:  
**https://dictionary-service-k9cu.onrender.com**

### 1. Upload Dictionary Data

**Endpoint:** `POST https://iaf-dictionary.onrender.com/api/dictionary/upload`

**Request Body:** JSON object with dictionary data

```bash
curl -X POST https://iaf-dictionary.onrender.com/api/dictionary/upload \
  -H "Content-Type: application/json" \
  -d @your-dictionary-file.json
```

**Response:**
```json
{
  "message": "Dictionary uploaded successfully",
  "totalWords": 150,
  "processedWords": 150,
  "insertedWords": 145,
  "skippedWords": 0,
  "duplicatesSkipped": 5
}
```

### 2. Get Word Meaning

**Endpoint:** `GET https://iaf-dictionary.onrender.com/api/dictionary/word/:word`

```bash
curl https://iaf-dictionary.onrender.com/api/dictionary/word/ABANDON
```

**Response:**
```json
{
  "word": "ABANDON",
  "meanings": [
    {
      "partOfSpeech": "Verb",
      "definition": "forsake, leave behind",
      "synonyms": ["Discard", "Fling", "Toss"],
      "examples": ["We abandoned the old car in the empty parking lot"]
    }
  ],
  "synonyms": ["Abandon", "Desolate", "Vacate", "Desert"],
  "antonyms": []
}
```

### 3. Get All Words (Testing)

**Endpoint:** `GET https://iaf-dictionary.onrender.com/api/dictionary/words`

```bash
curl https://iaf-dictionary.onrender.com/api/dictionary/words
```

## Project Structure

```
dictionary-api/
├── package.json          # Dependencies and scripts
├── server.js             # Main application entry point
├── .env                  # Environment variables
├── config/
│   └── database.js       # Database connection
├── models/
│   └── Word.js           # Word schema definition
├── routes/
│   └── dictionary.js     # API routes
└── README.md            # Documentation
```

## Data Format

The API expects dictionary data in the following format:

```json
{
  "WORD": {
    "MEANINGS": [
      ["PartOfSpeech", "Definition", ["synonym1", "synonym2"], ["example1"]]
    ],
    "ANTONYMS": ["antonym1", "antonym2"],
    "SYNONYMS": ["synonym1", "synonym2"]
  }
}
```

## Testing

1. **Health Check**
   ```bash
   curl https://iaf-dictionary.onrender.com/health
   ```

2. **Upload Sample Data**
   - Create a small JSON file with dictionary data
   - Use the POST endpoint to upload it

3. **Query a Word**
   - Use the GET endpoint to retrieve word meanings

## Error Handling

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Word not found in dictionary
- **500 Internal Server Error**: Server or database errors

## Production Deployment

This API is already deployed at:  
**https://iaf-dictionary.onrender.com**

If you wish to deploy your own instance:
1. Set up MongoDB Atlas or a production MongoDB instance
2. Update the `MONGODB_URI` in your environment variables
3. Deploy to your preferred platform (Render, Heroku, AWS, etc.)
4. Ensure environment variables are set in your deployment platform
