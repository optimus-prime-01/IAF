# Abbreviations API

This is a Node.js/Express API for managing abbreviations and their full forms, using MongoDB for storage.

---

## 🚀 Features

- **Add** a new abbreviation and its full form
- **Get all** abbreviations
- **Search** for a specific abbreviation by its short form (case-insensitive)

---

## 🛣️ Endpoints

| Method | Route                       | Description                                 | Try it! |
|--------|-----------------------------|---------------------------------------------|---------|
| POST   | `/api/abbreviations/`       | Add a new abbreviation and full form        | [Run in Postman](https://www.postman.com/) |
| GET    | `/api/abbreviations/all`    | Get all abbreviations and full forms        | [Try in Browser](http://localhost:3000/api/abbreviations/all) |
| GET    | `/api/abbreviations/:abbr`  | Get abbreviation and full form by short form| Replace `:abbr` with your abbreviation |

---

## 🧑‍💻 Usage

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Set up your `.env` file** with MongoDB URI and port.

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
     [http://localhost:3000/api/abbreviations/all](http://localhost:3000/api/abbreviations/all)

   - **Get a specific abbreviation (GET):**
     [http://localhost:3000/api/abbreviations/NASA](http://localhost:3000/api/abbreviations/NASA)

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
models/
  achro.js         # Mongoose model for abbreviations
routes/
  achroRoute.js    # Express routes for API
server.js          # Entry point
.env               # Environment variables
```

---

## 💡 Tips

- Use [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/) for interactive API testing.
- You can also use the browser for GET requests.

---
