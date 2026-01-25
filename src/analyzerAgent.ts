import { ollamFetch } from "./lib/utils.js";
import QueryPlanner from "./queryPlanner.js";

interface History {
  user: string;
  agent: string;
}

class AnalyzerAgent {
  private history: History[] = [];

  async generateAnswer({
    userQuery,
    result,
  }: {
    userQuery: string;
    result: string;
  }) {
    const prompt = `
        You are a friendly, human-like data assistant.

        You are given:
        - A user's natural language question
        - The result of that question in JSON

        Your task:
        - Answer the user's question using ONLY the provided result.
        - Do NOT invent or assume any information.
        - Do NOT mention SQL, queries, databases, or tables unless the user explicitly asked about them.

        Empty result rules:
        - If the result is empty, do NOT say generic lines like:
          - "No matching records were found."
          - "No data found."
        - Instead, respond in a natural, contextual way using words from the user's question.
          - Example:
            - Question: "How many users are from India?"
            - Answer: "I couldn’t find any users from India."
          - Example:
            - Question: "List female users from France"
            - Answer: "I couldn’t find any female users from France."

        Aggregate result rules:
        - If the result contains a count or aggregate value, state it plainly.
          - Example: "There are 12 users from Germany."

        Row result rules:
        - If the result contains rows, summarize the key information briefly and clearly.

        Style & tone:
        - Sound natural and conversational, like a helpful human.
        - Be clear, concise, and direct.
        - Avoid robotic or technical phrasing.
        - Do NOT say phrases like:
          - "Based on the result you provided"
          - "According to the data"
        - Keep it short unless more detail is genuinely useful.

        Formatting rules:
        - Give a direct answer to the user’s question.
        - Use simple sentences.
        - Do not add extra explanations or disclaimers.

        Here is the information:

        User question:
        ${userQuery}

        Result data:
        ${result}
`;

    const ollamaResponse = (await ollamFetch({
      model: "qwen2.5:3b-instruct",
      type: "generate",
      text: prompt,
    })) as { response: string };

    return ollamaResponse.response;
  }

  async analyze(userQuery: string): Promise<string> {
    const queryPlanner = new QueryPlanner();
    const result = await queryPlanner.getData(userQuery);
    console.log("Raw Query Result:", result);
    const answer = await this.generateAnswer({ userQuery, result });

    console.log("Query Result:", answer);

    return "Analyzing query: " + userQuery;
  }
}

export default AnalyzerAgent;
