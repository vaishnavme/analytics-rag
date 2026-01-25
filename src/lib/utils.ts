import readline from "readline";

export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const ask = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
};

export const ollamFetch = async ({
  model,
  type,
  text,
}: {
  model: "nomic-embed-text" | "qwen2.5:3b-instruct";
  type: "generate" | "embeddings";
  text: string;
}) => {
  try {
    const response = await fetch(`http://localhost:11434/api/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: text,
      }),
    });
    return response.json();
  } catch (err) {
    console.log(
      `Failed to connect to Ollama server. Please ensure Ollama is running and the model "${model}" is installed.`,
    );
    console.log(err);
    process.exit(1);
  }
};
