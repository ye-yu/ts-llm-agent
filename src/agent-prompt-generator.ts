import type { Tiktoken } from "tiktoken";
import type { BaseAgent } from "./agent.ts";
import { ACTION_TYPE, SIMPLIFICATION_TYPE, type Conversation, type FunctionInvocationRequest, type PromptType } from "./types.ts";

type AgentPromptGeneratorBase = AsyncGenerator<
  { prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: FunctionInvocationRequest },
  { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[] },
  string
>
export class AgentPromptGenerator implements AgentPromptGeneratorBase {
  initialPrompts: Conversation[]
  generatedPrompts: Conversation[]
  systemPrompt: string
  responseFormat: any
  agentFunctionHistory: FunctionInvocationRequest[];
  agent: BaseAgent
  simplifyThreshold: number
  simplificationPrompt: string
  simplificationResponseFormat: any
  enc: Tiktoken

  proto: any;
  clazz: any;

  // state
  expectContinue: boolean

  constructor(options: {
    systemPrompt: string,
    responseFormat: any,
    simplificationResponseFormat: any,
    agent: BaseAgent,
    simplifyThreshold: number,
    simplificationPrompt: string
    enc: Tiktoken
  }) {
    this.initialPrompts = []
    this.generatedPrompts = []
    this.agentFunctionHistory = []
    this.systemPrompt = options.systemPrompt
    this.responseFormat = options.responseFormat
    this.agent = options.agent
    this.simplifyThreshold = options.simplifyThreshold
    this.simplificationPrompt = options.simplificationPrompt
    this.simplificationResponseFormat = options.simplificationResponseFormat
    this.enc = options.enc

    this.proto = Object.getPrototypeOf(this.agent)
    this.clazz = this.proto.constructor

    this.expectContinue = false
  }

  async next(prompt: string): Promise<IteratorResult<{ prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: FunctionInvocationRequest; }, { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; }>> {
    if (!this.initialPrompts.length) {
      this.initialPrompts = [
        {
          role: "system",
          content: this.systemPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ]

      this.generatedPrompts = [...this.initialPrompts]
      return {
        done: false,
        value: {
          prompt: this.generatedPrompts,
          type: ACTION_TYPE,
          responseFormat: this.responseFormat,
          previousFunctionCall: {
            function: "initialPrompt",
            intention: "Processing prompt: " + prompt,
            arguments: [],
          }
        }
      }
    }

    const agentResponse = prompt
    if (!agentResponse) {
      throw new Error("Response is required. Call .next(response) with the response from the model.");
    }

    const parsed: FunctionInvocationRequest = JSON.parse(agentResponse);
    if (this.expectContinue) {
      if (parsed.function !== "continue") {
        throw new Error(
          `Function ${parsed.function} not found on agent. Expected "continue" for simplification response.`,
        );
      }
      const [simplificationContent] = Array.isArray(parsed.arguments) ? parsed.arguments[0] : [];
      if (typeof simplificationContent !== "string" || !simplificationContent) {
        throw new Error("Invalid simplified history format.", { cause: { simplifiedHistory: simplificationContent } });
      }

      this.agentFunctionHistory.push(parsed);

      const simplificationPromptsFollowUp: Conversation[] = [
        {
          role: "system",
          content: simplificationContent,
        },
        {
          role: "system",
          content:
            `Below is the simplified version from the previous conversation history: ` +
            `\n${simplificationContent}\n` +
            `End of simplification. Continue user requested action. ` +
            `Call history: \n ${this.agentFunctionHistory.join("\n")}`,
        },
      ];

      this.expectContinue = false
      this.generatedPrompts = [...this.initialPrompts, ...simplificationPromptsFollowUp];
    } else if (parsed.function === "complete") {
      return this.return({
        type: "done",
        response: parsed.arguments[0],
        functionCallHistory: this.agentFunctionHistory,
      });
    } else {
      const methodFromInstance = Reflect.get(this.agent, parsed.function, this.proto);
      const methodFromStatic = Reflect.get(this.agent, parsed.function, this.clazz);

      const method = methodFromInstance ?? methodFromStatic;
      const thisArgument = methodFromInstance ? this.agent : this.proto;

      if (typeof method !== "function") {
        throw new Error(`Function ${parsed.function} not found on agent.`)
      }

      const result = await Reflect.apply(method, thisArgument, parsed.arguments);
      const conversationResult: Conversation = {
        role: "system",
        content: `function ${parsed.function} called with arguments ${JSON.stringify(parsed.arguments)} to ${parsed.intention}, result: ${result ? JSON.stringify(result) : "void"}`,
      };

      this.generatedPrompts.push(conversationResult);
      this.agentFunctionHistory.push(parsed);
    }

    const tikTokens = this.enc.encode(JSON.stringify(this.generatedPrompts)).length;
    if (tikTokens < this.simplifyThreshold) {
      return {
        done: false,
        value: {
          prompt: this.generatedPrompts,
          type: ACTION_TYPE,
          responseFormat: this.responseFormat,
          previousFunctionCall: this.agentFunctionHistory.at(-1)!,
        }
      }
    }
    const simplificationPrompts: Conversation[] = [
      {
        role: "system",
        content: this.simplificationPrompt,
      },
      ...this.generatedPrompts.slice(1),
    ];

    this.expectContinue = true
    return {
      done: false,
      value: {
        prompt: simplificationPrompts,
        type: SIMPLIFICATION_TYPE,
        responseFormat: this.simplificationResponseFormat,
        previousFunctionCall: this.agentFunctionHistory.at(-1)!,
      }
    }
  }

  async return(value: { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; } | PromiseLike<{ type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; }>): Promise<IteratorResult<{ prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: FunctionInvocationRequest; }, { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; }>> {
    return {
      done: true,
      value: await Promise.resolve(value),
    }

  }

  throw(e: Error): Promise<IteratorResult<{ prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: FunctionInvocationRequest; }, { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; }>> {
    throw e
  }

  [Symbol.asyncIterator](): AsyncGenerator<{ prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: FunctionInvocationRequest; }, { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[]; }, string> {
    return this;
  }

  [Symbol.asyncDispose](): PromiseLike<void> {
    return Promise.resolve(void 0)
  }
}