import prisma from "./lib/db.js";
import { ollamFetch } from "./lib/utils.js";

class SemanticSearch {
  private async getQueryEmbedding(text: string): Promise<number[]> {
    const embedResponse = (await ollamFetch({
      model: "nomic-embed-text",
      type: "embeddings",
      text,
    })) as { embedding: number[] };

    return embedResponse?.embedding;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  async getRelaventDocuments(
    userQuery: string,
    options: { topK?: number; minSimilarity?: number } = {},
  ) {
    const { topK = 5, minSimilarity = 0.4 } = options;

    // Normalize query to lowercase for consistent matching
    const normalizedQuery = userQuery.toLowerCase().trim();
    const queryEmbedding = await this.getQueryEmbedding(normalizedQuery);

    const embeddingRows = await prisma.userEmbeddings.findMany();

    const similarities = embeddingRows
      .map((row) => {
        const rowEmbedding = JSON.parse(row.embedding) as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, rowEmbedding);
        return {
          user_id: row.user_id,
          content: row.content,
          similarity: Math.round(similarity * 1000) / 1000,
        };
      })
      .filter((item) => item.similarity >= minSimilarity);

    similarities.sort((a, b) => b.similarity - a.similarity);

    console.log(
      `[SemanticSearch] Query: "${normalizedQuery}" | Found: ${similarities.length} matches above ${minSimilarity}`,
    );

    return similarities.slice(0, topK);
  }
}

export default SemanticSearch;
