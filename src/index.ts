import chalk from "chalk";
import { ask, rl } from "./lib/utils.js";
import seedDatabase from "./lib/seedDb.js";
import { cli_commands } from "./lib/constants.js";

const chatLoop = async () => {
  while (true) {
    const query = await ask(chalk.blue("You: "));
    const queryCommand = query.toLowerCase().trim();

    switch (queryCommand) {
      case cli_commands.seed_database:
        await seedDatabase();
        break;

      case cli_commands.create_knowledge_base:
        break;

      case cli_commands.chat_with_your_data:
        break;

      case cli_commands.exit:
        console.log(chalk.green("Closing down... Goodbye!"));
        rl.close();
        process.exit(0);

      default:
        break;
    }
  }
};

async function main() {
  console.log(chalk.green.bold("Analytics RAG CLI"));

  Object.values(cli_commands).forEach((command) => {
    console.log(chalk.cyan(`- ${command}`));
  });

  await chatLoop();
}

main();
