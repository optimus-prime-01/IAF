# PDF API

## Endpoints

- **POST /api/pdfs/upload**  
  Upload a PDF and optional thumbnail.  
  **Body:** form-data (`title`, `content`, `category`, `pdf` as File, `thumbnail` as File)

- **GET /api/pdfs?search=...**  
  Search PDFs by title, content, or category.

- **GET /api/pdfs/all**  
  Get all PDFs sorted by view count (descending).

- **GET /api/pdfs/:id**  
  Get a single PDF by ID and increment its view count.

---

## How to Test in Postman

1. **Upload PDF with thumbnail:**  
   - POST `http://localhost:3000/api/pdfs/upload`  
   - Body: form-data  
     - `title` (Text)  
     - `content` (Text)  
     - `category` (Text)  
     - `pdf` (File)  
     - `thumbnail` (File, optional)

2. **Add PDF metadata:**  
   - POST `http://localhost:3000/api/pdfs`  
   - Body: raw JSON  
     ```json
     {
       "title": "Sample PDF",
       "content": "This is a test PDF document.",
       "pdfUrl": "/uploads/sample.pdf",
       "category": "report",
       "thumbnail": "/uploads/sample.jpg"
     }
     ```

3. **Search PDFs:**  
   - GET `http://localhost:3000/api/pdfs?search=your-keyword`

4. **Get all PDFs by view count:**  
   - GET `http://localhost:3000/api/pdfs/all`

5. **Get a single PDF (increments view count):**  
   - GET `http://localhost:3000/api/pdfs/<id>`

---

**Notes:**
- For file upload, use `form-data` and set `pdf` and `thumbnail` fields to `File`.
- Each GET by ID increases `viewCount`.
- All responses are JSON.
