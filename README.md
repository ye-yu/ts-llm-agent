# TS LLM Agent

Connect your functions to LLM agents with ease. This library provides a simple way to define tools and their parameters, and automatically generates the necessary JSON Schema for LLMs to understand how to call your functions.

Visit the [wiki](https://github.com/ye-yu/ts-llm-agent/wiki/TypeScript-LLM-Agent) for deep documentation.

## Quick Start

Define your agent and tools using decorators:

```typescript
import { Agent, Tool, JsonSchemaType } from "ts-agent-tool";

@Agent()
class MyAgent {
    @Tool()
    @Description("Do something")
    async doThings(id: string): Promise<void> {
        // implementation
    }
}
```

Iterate over your agent's prompts:

```typescript

const agent = new MyAgent();
async function runPrompt(prompt: string) {
  const promptGenerator = agent.prompt(prompt);
  let llmResponse: string = "";
  do {
    const { value: llmPrompt } = await promptGenerator.next(llmResponse);
    if (llmPrompt.type === "done") {
      return llmPrompt;
    }

    const { response } = await aiPrompt(
        llmPrompt.prompt, llmPrompt.type === SIMPLIFICATION_TYPE ? undefined 
        : agent.assembleResponseFormat()
    );
    llmResponse = response;
  } while (true);
}
```

Run your prompt:

```typescript
const result = await runPrompt("Search in my database and write a report.");
console.log(result);
```