# TS LLM Agent

Connect your functions to LLM agents with ease. This library provides a simple way to define tools and their parameters, and automatically generates the necessary JSON Schema for LLMs to understand how to call your functions.

Visit the [wiki](https://github.com/ye-yu/ts-llm-agent/wiki/TypeScript-LLM-Agent) for deep documentation.

## Quick Start

Define your agent and tools using decorators:

```typescript
import { Agent, Tool, Description } from "ts-llm-agent";

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
  await using promptGenerator = agent.startNewSession();
  // seed your generator with your prompt first
  // in the next iteration, update this variable to the llm responses
  let llmResponse: string = prompt;
  do {
    const { value: llmPrompt } = await promptGenerator.next(llmResponse);
    if (llmPrompt.type === "done") {
      return llmPrompt;
    }

    /** the text content from the response */
    const response = await getLLMResponseContent(
      llmPrompt.prompt,
      llmPrompt.responseFormat,
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

## Extra

Define your schema definitions. This will reflect in your response format

```typescript
import { Agent, JsonSchemaType } from "ts-llm-agent";

@Agent()
@JsonSchemaType("FileInfo", {
  type: "object",
  properties: {
    ...
  },
  additionalProperties: false, // important! must be false
  required: [] // important! must include all fields in the properties
})
```

Define your parameter names and types. This will reflect in your LLM prompts.

```typescript
import { Agent, Tool, Description, ParamName } from "ts-llm-agent";

@Agent()
class MyAgent {
    @Tool()
    @Description("Do something")
    async doThings(@ParamName("id") id: string): Promise<void> {}
```

Define your parameter type if type of array. TypeScript does not emit type of array, so we will need to add this extra information.

```typescript
import { Agent, Tool, Description, ParamName } from "ts-llm-agent";

@Agent()
class MyAgent {

    @Tool()
    @Description("Do something bulk")
    async doThingsAtOnce(@ParamName("id", String) id: string[]): Promise<void> {}
```

Fine-grained controls with:

```typescript
await using generator = agent.startNewSession();
// seed your generator with your prompt first
// in the next iteration, update this variable to the llm responses
let nextPromptSeed = "Test prompt"
let lastFunctionExecution: FunctionInvocationRequest | undefined = undefined
do {
  const prompt = generator.nextPrompt(nextPromptSeed)
  const responseFormat = generator.nextResponseFormat()

  /** the text content from the response */
  const response = await getLLMResponseContent(prompt, responseFormat);

  lastFunctionExecution = generator.parseLLMResponse(llmResponse)
  console.log("LLM requested to execute:", lastFunctionExecution.function)

  const result = 
    await generator.getFunctionInvocationResult(lastFunctionExecution)
  console.log("Function execution result:", result)
  nextPromptSeed = generator.stringifyResult(lastFunctionExecution, result)

} while(lastFunctionExecution.function === "complete");
