import chalk from "chalk";
import { ollamFetch } from "./lib/utils.js";
import QueryPlanner from "./queryPlanner.js";
import SemanticSearch from "./semanticSearch.js";

interface History {
  user: string;
  agent: string;
}

type QueryType = "structured" | "semantic" | "hybrid";

class AnalyzerAgent {
  private history: History[] = [];

  private async generateAnswer({
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

  private async getQueryClassification(userQuery: string): Promise<QueryType> {
    const prompt = `
      You are a query classifier. Analyze the user's question and determine the best approach.

      Return ONLY one of these values:
      - "structured" - for exact filters, counts, aggregations, rankings (e.g., "how many users from India", "top 5 car brands", "users who joined in 2025")
      - "semantic" - for similarity/context queries (e.g., "find users similar to John", "users interested in technology", "people like software engineers")
      - "hybrid" - when both approaches would help (e.g., "find Android users who might like gaming", "software engineers from Asia")

      User question: "${userQuery}"

      Response (one word only):`;

    const response = (await ollamFetch({
      model: "qwen2.5:3b-instruct",
      type: "generate",
      text: prompt,
    })) as { response: string };

    const result = response.response.toLowerCase().trim();

    if (result.includes("semantic")) return "semantic";
    if (result.includes("hybrid")) return "hybrid";
    return "structured";
  }

  async analyze(userQuery: string) {
    const queryType = await this.getQueryClassification(userQuery);
    const queryPlanner = new QueryPlanner();
    const semnaticSearch = new SemanticSearch();

    console.debug(chalk.gray(`[AnalyzerAgent] Classified as: ${queryType}`));

    let answer;
    switch (queryType) {
      case "structured": {
        const structuredResult = await queryPlanner.getData(userQuery);
        answer = await this.generateAnswer({
          userQuery,
          result: JSON.stringify(structuredResult),
        });
        break;
      }

      case "semantic": {
        const semanticResult =
          await semnaticSearch.getRelaventDocuments(userQuery);
        answer = await this.generateAnswer({
          userQuery,
          result: JSON.stringify(semanticResult),
        });
        break;
      }

      case "hybrid": {
        const [structuredResult, semanticResults] = await Promise.all([
          queryPlanner.getData(userQuery),
          semnaticSearch.getRelaventDocuments(userQuery),
        ]);
        // console.log("Structured Result:", structuredResult);
        // console.log("Semantic Results:", semanticResults);
        answer = await this.generateAnswer({
          userQuery,
          result: JSON.stringify({
            structured: structuredResult,
            semantic: semanticResults,
          }),
        });
        break;
      }

      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
    this.history.push({
      user: userQuery,
      agent: answer,
    });

    console.log(
      chalk.blue("Bot:"),
      chalk.white(answer.trim()),
      chalk.gray(queryType.toLowerCase()),
    );
  }
}

export default AnalyzerAgent;
