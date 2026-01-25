import chalk from "chalk";
import dummyData from "../../mock_data.json" with { type: "json" };
import prisma from "./db.js";

const seedDatabase = async () => {
  try {
    console.log(chalk.yellow("Seeding database with dummy data..."));
    await prisma.$connect();

    await prisma.users.createMany({
      data: dummyData,
    });

    await prisma.$disconnect();

    console.log(chalk.green("Database seeding completed."));
  } catch (err) {
    console.log(chalk.red("Error seeding database:", err));
  }
};

export default seedDatabase;
