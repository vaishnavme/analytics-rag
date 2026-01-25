import chalk from "chalk";
import { ask, rl } from "./lib/utils.js";
import seedDatabase from "./lib/seedDb.js";
import { cli_commands } from "./lib/constants.js";
import BuildKnowledgeBase from "./buildKnowledgeBase.js";
import AnalyzerAgent from "./analyzerAgent.js";

const chatLoop = async () => {
  while (true) {
    const query = await ask(chalk.blue("You: "));
    console.log(chalk.gray(`(Debug) User Query: ${query}`));
    const analyzerAgent = new AnalyzerAgent();
    await analyzerAgent.analyze(query);
  }
};

async function main() {
  console.log(chalk.green.bold("Analytics RAG CLI"));

  Object.values(cli_commands).forEach((option) => {
    console.log(
      chalk.cyan(`- ${option.command}: ${chalk.gray(option.description)}`),
    );
  });

  const choice = await ask(chalk.gray("> "));

  switch (choice.toLowerCase().trim()) {
    case cli_commands.seed_database.command:
      await seedDatabase();
      break;

    case cli_commands.create_knowledge_base.command:
      const knowledgeBase = new BuildKnowledgeBase();
      await knowledgeBase.buildKnowledgeBase();
      break;

    case cli_commands.chat_with_your_data.command:
      await chatLoop();
      break;

    case cli_commands.exit.command:
      console.log(chalk.green("Closing down... Goodbye!"));
      rl.close();
      process.exit(0);

    default:
      console.log(chalk.red("Invalid command. Please try again."));
      rl.close();
      process.exit(1);
  }
}

main();
