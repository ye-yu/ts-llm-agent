import type { Tiktoken } from "tiktoken";
import type { BaseAgent } from "./agent.ts";
import { ACTION_TYPE, SIMPLIFICATION_TYPE, type Conversation, type FunctionInvocationRequest, type Prettify, type PromptType } from "./types.ts";
import { getLogger } from "./debug/debug.ts";
const console = getLogger("llm-agent:generator")

type AgentPromptYield<T extends object = any> = { prompt: Conversation[]; type: PromptType; responseFormat: any; previousFunctionCall: ExtendedFunctionInvocationRequest<T>; }
type AgentPromptDone<T extends object = any> = {
  type: "done";
  response: string;
  functionCallHistory: ExtendedFunctionInvocationRequest<T>[]
};

type AgentPromptGeneratorBase<T extends object = any> = AsyncGenerator<AgentPromptYield<T>, AgentPromptDone<T>, string>
type BaseAgentTools = {
  complete(response: string): void
  continue(response: string): void
  initialPrompt(): void
}

type ExtendedFunctionInvocationRequest<T extends object> = Prettify<FunctionInvocationRequest<T> | FunctionInvocationRequest<BaseAgentTools>>

/**
 * @stateful
 */
export class AgentPromptGenerator<T extends object = any> implements AgentPromptGeneratorBase {
  initialPrompts: Conversation[]
  generatedPrompts: Conversation[]
  systemPrompt: string
  responseFormat: any
  agentFunctionHistory: ExtendedFunctionInvocationRequest<T>[];
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

  validateFunctionInvocationRequest(obj: any): obj is ExtendedFunctionInvocationRequest<T> {
    if (typeof obj !== "object") {
      return false
    }

    if (typeof obj.function !== "string") {
      return false
    }

    if (typeof obj.intention !== "string") {
      return false
    }

    if (!Array.isArray(obj.arguments)) {
      return false
    }

    return true
  }

  parseLLMResponse(LLMResponse: string): ExtendedFunctionInvocationRequest<T> {
    try {
      const parsed = JSON.parse(LLMResponse)
      if (this.validateFunctionInvocationRequest(parsed)) {
        return parsed
      }
      throw new Error("Invalid FunctionInvocationRequest object", { cause: parsed })
    } catch (error) {
      throw new Error("Invalid FunctionInvocationRequest object", { cause: error })
    }
  }

  nextPrompt(initialOrLLMResponse: string): Conversation[] {
    if (!initialOrLLMResponse) {
      throw new Error("Response is required. Call .nextPrompt(response) with the response from the model.");
    }
    if (!this.initialPrompts.length) {
      console.debug("Sending initial prompts")
      this.initialPrompts = [
        {
          role: "system",
          content: this.systemPrompt,
        },
        {
          role: "user",
          content: initialOrLLMResponse,
        },
      ]
      this.generatedPrompts.push(...this.initialPrompts)
      return this.generatedPrompts
    }

    this.generatedPrompts.push({
      role: "system",
      content: initialOrLLMResponse,
    })

    const tikTokens = this.enc.encode(JSON.stringify(this.generatedPrompts)).length;
    if (tikTokens < this.simplifyThreshold) {
      return this.generatedPrompts
    }

    // token exceeded, only expect function type continue
    this.expectContinue = true

    return this.generatedPrompts
  }

  nextType() {
    return this.expectContinue ? SIMPLIFICATION_TYPE : ACTION_TYPE
  }

  nextResponseFormat() {
    return this.expectContinue ? this.simplificationResponseFormat : this.responseFormat
  }

  getFunctionCallHistory() {
    return this.agentFunctionHistory
  }

  stringifyResult(parsed: ExtendedFunctionInvocationRequest<T>, result: any) {
    if (result instanceof Promise) {
      throw new Error("Arg 2: Cannot stringify a Promise. Must resolve promise first.")
    }
    return (
      `function ${String(parsed.function)} ` +
      `called with arguments ${JSON.stringify(parsed.arguments)} to ${parsed.intention}, ` +
      `result: ${result ? JSON.stringify(result) : "void"}`
    )
  }

  getFunctionInvocationResult<Request extends ExtendedFunctionInvocationRequest<T>>(parsed: Request): (
    Request["function"] extends keyof BaseAgentTools
    ? ReturnType<BaseAgentTools[Request["function"]]>
    : Request["function"] extends keyof T ? T[Request["function"]] extends (...any: any) => infer Return ? Return : never : never
  ) {
    if (this.expectContinue) {
      if (!this.matchesFunctionName(parsed, "continue")) {
        throw new Error(
          `Function ${String(parsed.function)} not allowed on agent. Expected "continue" for simplification response.`,
        );
      }

      const simplificationContent = Array.isArray(parsed.arguments) ? parsed.arguments[0] : undefined;
      if (typeof simplificationContent !== "string" || !simplificationContent) {
        throw new Error("Invalid simplified history format.", { cause: { simplifiedHistory: simplificationContent } });
      }

      const simplificationPromptsFollowUp: Conversation = {
        role: "system",
        content:
          `Below is the simplified version from the previous conversation history: ` +
          `\n${simplificationContent}\n` +
          `End of simplification. Continue user requested action. ` +
          `Call history: \n ${this.agentFunctionHistory.join("\n")}`,
      }

      this.expectContinue = false
      this.generatedPrompts = [...this.initialPrompts, simplificationPromptsFollowUp];

      return (void 0) as any
    }
    const methodFromInstance = Reflect.get(this.proto, parsed.function, this.proto);
    const methodFromStatic = Reflect.get(this.clazz, parsed.function, this.clazz);

    const method = methodFromInstance ?? methodFromStatic;
    const thisArgument = methodFromInstance ? this.agent : this.proto;

    if (typeof method !== "function") {
      throw new Error(`Function ${String(parsed.function)} not found on agent.`)
    }

    return Reflect.apply(method, thisArgument, parsed.arguments);
  }

  appendInvocationHistory(parsed: ExtendedFunctionInvocationRequest<T>) {
    this.agentFunctionHistory.push(parsed);
  }

  matchesFunctionName<Fn extends (keyof T | keyof BaseAgentTools)>(parsed: any, fnName: Fn): parsed is (
    Fn extends keyof BaseAgentTools ? {
      function: Fn,
      intention: string,
      arguments: Parameters<BaseAgentTools[Fn]>
    } : Fn extends keyof T ? T[Fn] extends (...any: infer P) => any ? {
      function: Fn,
      intention: string,
      arguments: P
    } : never : never
  ) {
    return parsed.function == fnName
  }

  async next(prompt: string): Promise<IteratorResult<AgentPromptYield<T>, AgentPromptDone<T>>> {
    if (!prompt) {
      throw new Error("Response is required. Call .next(response) with the response from the model.");
    }

    if (!this.initialPrompts.length) {
      const typeInitialPrompt: Extract<FunctionInvocationRequest<BaseAgentTools>, { function: "initialPrompt" }> = {
        function: "initialPrompt",
        intention: "Processing: " + prompt,
        arguments: [],
      }
      return {
        done: false,
        value: {
          prompt: this.nextPrompt(prompt),
          type: ACTION_TYPE,
          responseFormat: this.nextResponseFormat(),
          previousFunctionCall: typeInitialPrompt
        }
      }
    }

    const agentResponse = prompt
    const parsed = this.parseLLMResponse(agentResponse);
    const result = await this.getFunctionInvocationResult(parsed)
    this.appendInvocationHistory(parsed);

    if (this.matchesFunctionName(parsed, "complete")) {
      return this.return({
        type: "done",
        response: parsed.arguments[0],
        functionCallHistory: this.agentFunctionHistory,
      });
    }

    const agentResult = this.stringifyResult(parsed, result)
    return {
      done: false,
      value: {
        prompt: this.nextPrompt(agentResult),
        type: this.nextType(),
        responseFormat: this.nextResponseFormat(),
        previousFunctionCall: this.agentFunctionHistory.at(-1)!
      }
    }
  }

  async return(value: AgentPromptDone<T> | PromiseLike<AgentPromptDone<T>>): Promise<IteratorResult<never, AgentPromptDone<T>>> {
    const resolved = await Promise.resolve(value)
    return {
      done: true,
      value: resolved,
    }
  }

  throw(e: Error): Promise<IteratorResult<never, never>> {
    throw e
  }

  [Symbol.asyncIterator](): AgentPromptGeneratorBase<T> {
    return this;
  }

  [Symbol.asyncDispose](): PromiseLike<void> {
    return Promise.resolve(void 0)
  }
}