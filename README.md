### POC for testing RAG on user data

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
Based on the similarity scores provided in the JSON data, here are the top matches for each user ID:

User ID: 7 - Ranice Klein
Most Similar to User ID: 911 - Terrell Scedall

Similarity Score: 0.5624
User ID: 911 - Terrell Scedall
Most Similar to User ID: 7 - Ranice Klein

Similarity Score: 0.5590
User ID: 708 - Genia Scally
Most Similar to User ID: 689 - Kingston Donner

Similarity Score: 0.5583
User ID: 689 - Kingston Donner
Most Similar to User ID: 708 - Genia Scally

Similarity Score: 0.5556
User ID: 348 - Aimil Furst
Most Similar to User ID: 348 - Aimil Furst

Similarity Score: 1.0000 (Perfect Match)
In this dataset, the user ID of Aimil Furst has a perfect match with itself in terms of similarity scores.

Additional Notes:
User IDs 7 and 911 are very similar to each other.
User IDs 708 and 689 have some similarities but not as strong as the main matches above.
The user ID 348 has a perfect match with itself, indicating that it might be a unique entry or part of an internal system.
Summary:
User ID: 7 (Ranice Klein) - Matches to User ID: 911
User ID: 911 (Terrell Scedall) - Matches to User ID: 7
User IDs: 689 and 708 are somewhat similar but not as closely related.
User ID: 348 (Aimil Furst) is a perfect match with itself. hybrid

```
