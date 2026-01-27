# Analytics RAG POC

Problem Statement:
How can a person ask query in natural lanugage and get result as response in natural language.

**Approach**

1. Text to SQL
2. Embeddings
3. Hybrid (Text to SQL & Embeddings)

**Table of Content**

- [Implementation](#implementation)
- [Experiments](#experiments)
- [Getting Started](#getting-started)

## Implementation

#### Approach

1. Text-to-SQL
2. Query planner(Text-to-DSL-SQL)
3. Embedding

**1. Text-to-SQL**

_**Flow**_

1. User ask question in natural language
2. LLM convert it to raw SQL
3. Execute raw SQL on DB.
4. Pass result to LLM
5. LLM converts result to natural language based on user query.

---

**2. Query Planner**
_**Flow**_

1. User ask question in natural language
2. LLM converts question to DSL JSON (domain-specific-language)
3. Convert DSL to SQL query
4. Execute raw SQL on DB.
5. Pass result to LLM
6. LLM converts result to natural language based on user query.

---

**3. Embedding**
_Pre-req_

1. (Initial) Convert each user record to document
2. Generate embedding for each document, store it in db.

_**Flow**_

1. User ask query in natural language
2. Convert query to embedding
3. Compare generated query embedding with each record (slow)
4. Sort result based on score
5. Return top 5 results
6. LLM converts result to natural language based on user query

---

### Experiments

```
Que: how many user us Mercedes-Benz
Ans: There are 24 users who drive a Mercedes-Benz. _structured_
Result: **Pass**
```

```
Que: how many users are from united states who use android
Ans: I couldn’t find any users from the United States who use Android. _structured_
Result: **Failed**
```

```
Que: who use android
Ans:
Based on the semantic analysis provided in the JSON data, here are the key details for each person:

User ID: 309 - Software Consultant (Ezra Dudding)
Job Title: Software Consultant
Location: Chile
Device Used: Android 8.1, up to Android 10, MIUI 12
Car Brand: Chrysler
Language: Uzbek
Gender: Male
User ID: 282 - Help Desk Operator (Obadiah Guillerman)
Job Title: Help Desk Operator
Location: Morocco
Device Used: Android 10, FunTouch 10
Car Brand: Cadillac
Language: Burmese
Gender: Male
User ID: 75 - Programmer Analyst I (Flint Claesens)
Job Title: Programmer Analyst I
Location: China
Device Used: Android 7.0
Car Brand: Mitsubishi
Language: Oriya
Gender: Male
User ID: 550 - Software Test Engineer III (Jammal Athelstan)
Job Title: Software Test Engineer III
Location: Honduras
Device Used: Android 7.0
Car Brand: Mazda
Language: Bengali
Gender: Male
User ID: 261 - Help Desk Technician (Forbes Bransdon)
Job Title: Help Desk Technician
Location: Myanmar
Device Used: Android 4.0
Car Brand: Chevrolet
Language: Uighur
Gender: Male
The JSON data also includes a similarity score for each of these entries, which ranges from 0.651 to 0.659, indicating that these entries have varying degrees of relevance or overlap in their job titles and personal information.

If you need more specific insights or have any questions about the details provided, feel free to ask! hybrid
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Ollama** running locally with models:
  - `qwen2.5:3b-instruct` (for text generation)
  - `nomic-embed-text` (for embeddings)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/analytics-rag.git
cd analytics-rag

# 2. Install dependencies
npm install

# 3. Setup Prisma and database
npx prisma generate
npx prisma migrate dev

# 4. Seed the database with mock data
npm run dev
# Then run: seedDb() function or import mock_data.json
```

### Running Ollama

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama server
ollama serve

# Pull required models (in another terminal)
ollama pull qwen2.5:3b-instruct
ollama pull nomic-embed-text
```

### Build Knowledge Base (Embeddings)

Before using semantic search, generate embeddings for all users:

```bash
npm run dev
```

### Usage

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### Example Queries

| Query Type  | Example                                   |
| ----------- | ----------------------------------------- |
| Count       | "How many users from India?"              |
| Filter      | "List female managers"                    |
| Ranking     | "Top 5 car brands"                        |
| Aggregation | "Users by country"                        |
| Semantic    | "Find creative professionals"             |
| Similarity  | "Users similar to software engineers"     |
| Hybrid      | "Android developers interested in gaming" |
