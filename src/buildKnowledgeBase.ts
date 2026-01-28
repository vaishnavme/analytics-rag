import { Users } from "@prisma/client";
import prisma from "./lib/db.js";
import { ollamFetch } from "./lib/utils.js";

class BuildKnowledgeBase {
  private getUserDocument(user: Users): string {
    const name = `${user.first_name} ${user.last_name}`;
    const jobTitle = user.job_title?.toLowerCase() || "";
    const country = user.country?.toLowerCase() || "";
    const device = user.device?.toLowerCase() || "";
    const car = user.car?.toLowerCase() || "";
    const language = user.language?.toLowerCase() || "";
    const gender = user.gender?.toLowerCase() || "";

    // Natural language document - lowercase for better semantic matching
    // Repeat important terms multiple times for stronger signal
    return `This person works as a ${jobTitle} and lives in ${country}.
  They use a ${device} as their primary device and drive a ${car}.
  They speak ${language} and identify as ${gender}.
  Overall, this is a ${jobTitle} based in ${country} who uses a ${device} and drives a ${car}.
  `.trim();
  }

  async buildKnowledgeBase() {
    await prisma.$connect();

    const usersCount = await prisma.users.count();
    const users = await prisma.users.findMany();

    let count = 1;

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
        } finally {
          if (count >= usersCount) {
            console.log("Knowledge base build complete.");
          }
        }
      }),
    );
  }
}

export default BuildKnowledgeBase;
