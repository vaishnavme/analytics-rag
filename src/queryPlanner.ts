import prisma from "./lib/db.js";
import { ollamFetch } from "./lib/utils.js";

type QueryDSL = {
  entity: "Users";
  action: "findMany" | "count" | "distinct";
  filters?: {
    field: string;
    op: "eq" | "contains";
    value: string;
  }[];
  select?: string[];
  distinctField?: string;
  limit?: number;
};

class QueryPlanner {
  private getPlannerPrompt(userQuery: string): string {
    const prompt = `
      You are a query planner.

      Convert the user question into a STRICT JSON Query DSL.
      Schema:
      Users (id, first_name, last_name, email, gender, job_title, device, car, language, country, created_at)

      Allowed JSON format ONLY:
      {
        "entity": "Users",
        "action": "findMany" | "count" | "distinct",
        "filters": [
          { "field": "country", "op": "eq", "value": "India" }
        ],
        "select": ["id", "first_name", "email"],
        "distinctField": "device",
        "limit": 10
      }

      Rules:
      - Output ONLY valid JSON
      - Use only schema fields
      - Use "count" if user asks how many / total
      - Use "distinct" if user asks for unique/different/all types of values for a field (e.g., "what devices", "different countries", "unique jobs")
      - Use "findMany" otherwise
      - Use "eq" for exact match
      - Use "contains" for partial match
      - Include select only if specific fields requested
      - Include limit only if user asks for top / first / some
      - For "distinct" action, set "distinctField" to the field name to get unique values for

      User Question: "${userQuery}"
    `.trim();

    return prompt;
  }

  private async getDSL(userQuery: string): Promise<string> {
    const prompt = this.getPlannerPrompt(userQuery);

    const ollamaResponse = (await ollamFetch({
      text: prompt,
      type: "generate",
      model: "qwen2.5:3b-instruct",
    })) as { response: string };

    const dsl = ollamaResponse?.response;
    return dsl;
  }

  private buildQueryFromDSL(dsl: QueryDSL) {
    if (dsl.entity !== "Users") {
      throw new Error("Only Users entity is supported");
    }

    // Text fields that should use partial/fuzzy matching
    const textFields = [
      "first_name",
      "last_name",
      "email",
      "gender",
      "device",
      "car",
      "job_title",
      "language",
      "country",
    ];

    const where: { [key: string]: any } = {};

    if (dsl.filters) {
      for (const f of dsl.filters) {
        // Use contains for text fields regardless of op specified
        if (textFields.includes(f.field)) {
          where[f.field] = { contains: f.value };
        } else if (f.op === "eq") {
          where[f.field] = f.value;
        } else if (f.op === "contains") {
          where[f.field] = { contains: f.value };
        }
      }
    }

    const select: { [key: string]: boolean } = {};
    if (dsl.select) {
      for (const field of dsl.select) {
        select[field] = true;
      }
    }

    const prismaQuery = {
      where: Object.keys(where).length ? where : undefined,
      select: Object.keys(select).length ? select : undefined,
      take: dsl.limit,
    };

    return prismaQuery;
  }

  private async executeDSL(dsl: QueryDSL): Promise<any> {
    console.log("type of: ", typeof dsl, dsl.entity);
    if (dsl.entity !== "Users") {
      throw new Error("Unsupported entity: " + dsl.entity);
    }

    if (dsl.action === "findMany") {
      const query = this.buildQueryFromDSL(dsl);
      return prisma.users.findMany(query);
    }

    if (dsl.action === "count") {
      const query = this.buildQueryFromDSL(dsl);
      return prisma.users.count({ where: query.where });
    }

    if (dsl.action === "distinct" && dsl.distinctField) {
      const query = this.buildQueryFromDSL(dsl);
      const results = await prisma.users.findMany({
        where: query.where,
        select: { [dsl.distinctField]: true },
        distinct: [dsl.distinctField as any],
      });
      return results.map((r: any) => r[dsl.distinctField!]);
    }

    throw new Error("Unsupported action: " + dsl.action);
  }

  async getData(userQuery: string): Promise<string> {
    let dslString = await this.getDSL(userQuery);

    // Strip markdown code blocks if present (```json ... ```)
    dslString = dslString
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const dsl = JSON.parse(dslString) as QueryDSL;

    const result = await this.executeDSL(dsl);
    console.log("Generated result:", result);

    return JSON.stringify(result);
  }
}

export default QueryPlanner;
