import { Users } from "@prisma/client";
import prisma from "./lib/db.js";
import { ollamFetch } from "./lib/utils.js";

class BuildKnowledgeBase {
  private getUserDocument(user: Users): string {
    return `
      User ID: ${user.id}
      Name: ${user.first_name} ${user.last_name}
      Email: ${user.email}
      Gender: ${user.gender}
      Job Title: ${user.job_title}
      Device: ${user.device}
      Car: ${user.car}
      Language: ${user.language}
      Country: ${user.country}
      Created At: ${user.created_at}
    `.trim();
  }

  async buildKnowledgeBase() {
    await prisma.$connect();

    const users = await prisma.users.findMany();

    let count = 0;

    await Promise.all(
      users.map(async (user) => {
        try {
          const document = this.getUserDocument(user);
          const embedResponse = (await ollamFetch({
            text: document,
            model: "nomic-embed-text",
            type: "embeddings",
          })) as { embedding: number[] };

          const vector = embedResponse?.embedding;

          await prisma.userEmbeddings.upsert({
            where: { user_id: user.id } as any,
            update: {
              content: document,
              embedding: JSON.stringify(vector),
            },
            create: {
              user_id: user.id,
              content: document,
              embedding: JSON.stringify(vector),
            },
          });

          console.log(`Processed user ID ${count++}: userId:${user.id}`);
        } catch (err) {
          console.log(`Error processing user ID ${user.id}:`, err);
        }
      }),
    );
  }
}

export default BuildKnowledgeBase;
