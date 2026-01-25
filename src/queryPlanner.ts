import prisma from "./lib/db.js";
import { ollamFetch } from "./lib/utils.js";

type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull";

type QueryDSL = {
  orderBy: string;
  entity: "Users";
  action:
    | "findMany"
    | "findFirst"
    | "count"
    | "distinct"
    | "groupBy"
    | "aggregate";
  filters?: {
    field: string;
    op: FilterOp;
    value: string | string[] | number | boolean | null;
  }[];
  orFilters?: {
    field: string;
    op: FilterOp;
    value: string | string[] | number | boolean | null;
  }[];
  select?: string[];
  distinctField?: string;
  groupByField?: string;
  groupByGeneric?: boolean;
  aggregateField?: string;
  aggregateOp?: "count" | "avg" | "sum" | "min" | "max";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  skip?: number;
};

class QueryPlanner {
  private getPlannerPrompt(userQuery: string): string {
    const prompt = `
You are a query planner. Convert user questions into STRICT JSON Query DSL.

Schema: Users (id: Int, first_name: String, last_name: String, email: String, gender: String, job_title: String, device: String, car: String, language: String, country: String, created_at: DateTime)

JSON Format:
{
  "entity": "Users",
  "action": "findMany" | "findFirst" | "count" | "distinct" | "groupBy" | "aggregate",
  "filters": [{ "field": "country", "op": "eq", "value": "India" }],
  "orFilters": [{ "field": "country", "op": "eq", "value": "USA" }],
  "select": ["id", "first_name", "email"],
  "distinctField": "device",
  "groupByField": "car",
  "groupByGeneric": true,
  "aggregateField": "id",
  "aggregateOp": "count",
  "sortBy": "created_at",
  "sortOrder": "desc",
  "limit": 10,
  "skip": 0
}

Filter Operations:
- "eq": equals (exact match)
- "neq": not equals
- "contains": partial text match (case-insensitive)
- "startsWith": text starts with
- "endsWith": text ends with
- "gt": greater than (for numbers/dates)
- "gte": greater than or equal
- "lt": less than (for numbers/dates)
- "lte": less than or equal
- "in": value in list, e.g., {"field": "country", "op": "in", "value": ["USA", "India"]}
- "notIn": value not in list
- "isNull": field is null (value should be true)
- "isNotNull": field is not null (value should be true)

Actions:
- "findMany": get multiple records (default)
- "findFirst": get single record
- "count": count records matching filters
- "distinct": get unique values for distinctField
- "groupBy": group by field and count (for rankings, most/least popular)
- "aggregate": perform aggregation (count, avg, sum, min, max) on aggregateField

Rules:
- Output ONLY valid JSON, no comments
- Use "count" for "how many", "total", "number of"
- Use "distinct" for "unique", "different types", "all values of"
- Use "groupBy" for "most popular", "least used", "ranking", "top N by count"
- For groupBy on device/car: set "groupByGeneric": true for general queries (e.g., "most common device", "popular car brand"). Set to false only when user asks about specific versions (e.g., "Android versions", "iOS versions", "car models")
- Use "aggregate" for "average", "sum", "minimum", "maximum"
- Use "findFirst" for "first", "latest", "oldest", single record queries
- Use "orFilters" for OR conditions (matches ANY of these)
- Use "filters" for AND conditions (matches ALL of these)
- For dates: use ISO format "2025-01-01T00:00:00Z"
- For sorting: use sortBy with sortOrder ("asc" or "desc")
- For pagination: use limit and skip

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

    // Text fields that should use case-insensitive matching
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

    const buildCondition = (f: {
      field: string;
      op: FilterOp;
      value: string | string[] | number | boolean | null;
    }) => {
      const isTextField = textFields.includes(f.field);

      switch (f.op) {
        case "eq":
          // Use contains for text fields for fuzzy matching
          return isTextField ? { contains: f.value } : f.value;
        case "neq":
          return { not: f.value };
        case "contains":
          return { contains: f.value };
        case "startsWith":
          return { startsWith: f.value };
        case "endsWith":
          return { endsWith: f.value };
        case "gt":
          return { gt: f.value };
        case "gte":
          return { gte: f.value };
        case "lt":
          return { lt: f.value };
        case "lte":
          return { lte: f.value };
        case "in":
          return { in: f.value };
        case "notIn":
          return { notIn: f.value };
        case "isNull":
          return null;
        case "isNotNull":
          return { not: null };
        default:
          return isTextField ? { contains: f.value } : f.value;
      }
    };

    // Build AND conditions
    const andConditions: { [key: string]: any }[] = [];
    if (dsl.filters) {
      for (const f of dsl.filters) {
        andConditions.push({ [f.field]: buildCondition(f) });
      }
    }

    // Build OR conditions
    const orConditions: { [key: string]: any }[] = [];
    if (dsl.orFilters) {
      for (const f of dsl.orFilters) {
        orConditions.push({ [f.field]: buildCondition(f) });
      }
    }

    // Combine conditions
    let where: any = undefined;
    if (andConditions.length > 0 || orConditions.length > 0) {
      where = {};
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }
      if (orConditions.length > 0) {
        where.OR = orConditions;
      }
    }

    // Build select
    const select: { [key: string]: boolean } = {};
    if (dsl.select) {
      for (const field of dsl.select) {
        select[field] = true;
      }
    }

    // Build orderBy
    let orderBy: any = undefined;
    if (dsl.sortBy) {
      orderBy = { [dsl.sortBy]: dsl.sortOrder || "asc" };
    }

    const prismaQuery = {
      where,
      select: Object.keys(select).length ? select : undefined,
      orderBy,
      take: dsl.limit,
      skip: dsl.skip,
    };

    return prismaQuery;
  }

  private async executeDSL(dsl: QueryDSL): Promise<any> {
    if (dsl.entity !== "Users") {
      throw new Error("Unsupported entity: " + dsl.entity);
    }

    const query = this.buildQueryFromDSL(dsl);
    console.log("Prisma Query:", JSON.stringify(query, null, 2));

    switch (dsl.action) {
      case "findMany":
        return prisma.users.findMany(query);

      case "findFirst":
        return prisma.users.findFirst(query);

      case "count":
        return { count: await prisma.users.count({ where: query.where }) };

      case "distinct":
        if (!dsl.distinctField) {
          throw new Error("distinctField is required for distinct action");
        }
        const distinctResults = await prisma.users.findMany({
          where: query.where,
          select: { [dsl.distinctField]: true },
          distinct: [dsl.distinctField as any],
          orderBy: query.orderBy,
        });
        return {
          field: dsl.distinctField,
          values: distinctResults.map((r: any) => r[dsl.distinctField!]),
          total: distinctResults.length,
        };

      case "groupBy":
        if (!dsl.groupByField) {
          throw new Error("groupByField is required for groupBy action");
        }

        // If groupByGeneric is true, normalize values for device/car fields
        if (
          dsl.groupByGeneric &&
          ["device", "car"].includes(dsl.groupByField)
        ) {
          // Fetch all records and normalize in memory
          const allRecords = await prisma.users.findMany({
            where: query.where,
            select: { [dsl.groupByField]: true },
          });

          // Normalize device/car names to generic categories
          const normalizeValue = (value: string, field: string): string => {
            if (field === "device") {
              const lower = value.toLowerCase();
              if (lower.includes("android")) return "Android";
              if (
                lower.includes("ios") ||
                lower.includes("iphone") ||
                lower.includes("ipad")
              )
                return "iOS";
              if (lower.includes("windows")) return "Windows";
              if (lower.includes("feature phone")) return "Feature phone";
              if (lower.includes("proprietary")) return "Proprietary OS";
              return value; // Return as-is if no match
            }
            if (field === "car") {
              // Extract just the brand name (first word usually)
              return value.split(" ")[0];
            }
            return value;
          };

          // Count by normalized values
          const counts: Record<string, number> = {};
          for (const record of allRecords) {
            const rawValue = (record as any)[dsl.groupByField!];
            const normalized = normalizeValue(rawValue, dsl.groupByField!);
            counts[normalized] = (counts[normalized] || 0) + 1;
          }

          // Sort and limit
          const sorted = Object.entries(counts)
            .sort((a, b) =>
              dsl.sortOrder === "asc" ? a[1] - b[1] : b[1] - a[1],
            )
            .slice(0, dsl.limit || 10);

          return sorted.map(([value, count]) => ({
            [dsl.groupByField!]: value,
            count,
          }));
        }

        // Standard groupBy without normalization
        const groupResults = await prisma.users.groupBy({
          by: [dsl.groupByField as any],
          where: query.where,
          _count: { [dsl.groupByField]: true },
          orderBy: {
            _count: { [dsl.groupByField]: dsl.sortOrder || "desc" },
          },
          take: dsl.limit || 10,
        });
        return groupResults.map((r: any) => ({
          [dsl.groupByField!]: r[dsl.groupByField!],
          count: r._count[dsl.groupByField!],
        }));

      case "aggregate":
        if (!dsl.aggregateField || !dsl.aggregateOp) {
          throw new Error(
            "aggregateField and aggregateOp are required for aggregate action",
          );
        }
        const aggregateQuery: any = { where: query.where };
        if (dsl.aggregateOp === "count") {
          aggregateQuery._count = { [dsl.aggregateField]: true };
        } else if (dsl.aggregateOp === "avg") {
          aggregateQuery._avg = { [dsl.aggregateField]: true };
        } else if (dsl.aggregateOp === "sum") {
          aggregateQuery._sum = { [dsl.aggregateField]: true };
        } else if (dsl.aggregateOp === "min") {
          aggregateQuery._min = { [dsl.aggregateField]: true };
        } else if (dsl.aggregateOp === "max") {
          aggregateQuery._max = { [dsl.aggregateField]: true };
        }
        const aggResult = await prisma.users.aggregate(aggregateQuery);
        const opKey = `_${dsl.aggregateOp}` as keyof typeof aggResult;
        return {
          operation: dsl.aggregateOp,
          field: dsl.aggregateField,
          result: (aggResult[opKey] as any)?.[dsl.aggregateField],
        };

      default:
        throw new Error("Unsupported action: " + dsl.action);
    }
  }

  async getData(userQuery: string): Promise<string> {
    let dslString = await this.getDSL(userQuery);

    // Strip markdown code blocks if present (```json ... ```)
    dslString = dslString
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Strip single-line comments (// ...)
    dslString = dslString.replace(/\/\/.*$/gm, "");

    // Strip multi-line comments (/* ... */)
    dslString = dslString.replace(/\/\*[\s\S]*?\*\//g, "");

    const dsl = JSON.parse(dslString) as QueryDSL;

    const result = await this.executeDSL(dsl);
    console.log("Generated result:", result);

    return JSON.stringify(result);
  }
}

export default QueryPlanner;
