# Elasticsearch Integration

Guide to the search infrastructure powered by Elasticsearch.

## Overview

Elasticsearch (ES) provides high-performance fuzzy search and autocomplete functionality for:
-   **Dictionary Words** - Meanings, synonyms, antonyms.
-   **Abbreviations** - Full form expansion.

MongoDB writes are synchronized to ES to ensure search results are up-to-date.

---

## Configuration

**File**: `src/config/elasticsearch.js`

-   **Client**: `@elastic/elasticsearch`
-   **Connection**: Connects to the ES node defined in `ELASTICSEARCH_NODE` env var.
-   **Indices**:
    -   `vayu_words`: Dictionary data.
    -   `vayu_abbreviations`: Abbreviation data.

---

## Synchronization

### 1. Real-time Sync (Application Layer)

The `search.service.js` handles real-time sync. Whenever an admin creates, updates, or deletes a word/abbreviation, the change is immediately propagated to ES.

-   **Create/Update**: `indexWord(doc)`, `indexAbbreviation(doc)`
-   **Delete**: `deleteWord(id)`, `deleteAbbreviation(id)`

**Fail-safe**: If ES is down, the operation logs an error but doesn't fail the API request. The data will be consistent in MongoDB but stale in search until re-synced.

### 2. Bulk Sync (CLI Script)

**Script**: `scripts/syncElasticsearch.js`

Used to:
-   Populate ES from scratch.
-   Re-index data after schema changes.
-   Fix consistency issues.

**Usage**:
```bash
node scripts/syncElasticsearch.js
```

**Features**:
-   Checks MongoDB connection.
-   Ensures ES indices exist.
-   Processes documents in batches of 500.
-   Uses ES Bulk API for performance.

---

## Search Logic

**Service**: `src/services/search.service.js`

### Word Search Strategy
The search query uses a `bool` query with multiple `should` clauses to rank results:

1.  **Exact Keyword Match** (Boost: 10) - Matches exact uppercase word.
2.  **Prefix Match** (Boost: 5) - Word starts with query.
3.  **Fuzzy Match** (Boost: 2) - Handles typos (fuzziness: AUTO).
4.  **Standard Match** (Boost: 1) - Text analysis match.

### Abbreviation Search Strategy
1.  **Exact Abbreviation** (Boost: 10)
2.  **Fuzzy Abbreviation** (Boost: 5)
3.  **Full Form Match** (Boost: 2) - Search within the description/expansion.

---

## Data Mapping

**Words Index (`vayu_words`)**:
```json
{
  "word": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
  "meanings": { "type": "object" },
  "synonyms": { "type": "text" },
  "antonyms": { "type": "text" },
  "mongoId": { "type": "keyword" }
}
```

**Abbreviations Index (`vayu_abbreviations`)**:
```json
{
  "abbreviation": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
  "fullForm": { "type": "text" },
  "mongoId": { "type": "keyword" }
}
```

---

## Troubleshooting

### Connectivity

Check if ES is running:
```bash
curl http://localhost:9200
```

### Script Errors

If `syncElasticsearch.js` fails:
1.  Ensure ES container is up (`docker-compose ps`).
2.  Check network connectivity (backend can reach ES).
3.  Check MongoDB path/data.

### Search Returns No Results
1.  Verify data exists in MongoDB.
2.  Run the sync script to ensure ES is populated.
3.  Check `search.service.js` logs for connection timeouts.
