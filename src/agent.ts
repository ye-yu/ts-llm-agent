import { get_encoding } from "tiktoken";
import { getMetadata, Metadata, MetadataAppend } from "./metadata-compat/metadata.ts";

export const TOOL_FUNCTION = "tool:function";
export const TOOL_DESCRIPTION = "tool:description";
export const TOOL_REQUIRE_APPROVAL = "tool:requireApproval";
export const TOOL_PARAMNAME = "tool:paramname";
export const TOOL_PARAMNAME_ARRAYOF = "tool:paramname:arrayOf";
export const DESIGN_PARAMTYPES = "design:paramtypes";
export const AGENT_DESCRIPTION = "agent:description";
export const AGENT_CRITICAL_INSTRUCTION = "agent:criticalInstruction";
export const AGENT_RESPONSE_INSTRUCTION = "agent:responseInstruction";
export const AGENT_SIMPLIFICATION_INSTRUCTION = "agent:simplificationInstruction";
export const AGENT_TYPES = "agent:types";
export const AGENT_TIKTOKEN_ENCODING = "agent:tiktokenEncoding";

type ToolFunction = {
  name: string;
  fn: Function;
}

export const TiktokenEncoding: (
  encoding: "cl100k_base" | "gpt2" | "o200k_base" | "p50k_base" | "p50k_edit" | "r50k_base",
) => ClassDecorator = (encoding) => (target) => {
  Metadata(AGENT_TIKTOKEN_ENCODING, encoding)(target);
};

export const JsonSchemaType: (name: string, jsonSchema: Record<string, any>) => ClassDecorator =
  (name, schema) => (target) => {
    MetadataAppend(AGENT_TYPES, { name, schema })(target);
  };

export const Tool: () => MethodDecorator = () => (target, prop, descriptor) => {
  if (typeof descriptor.value === "function") {
    MetadataAppend(TOOL_FUNCTION, {
      name: String(prop),
      fn: descriptor.value,
    } satisfies ToolFunction)(target);
  }
};

export const ParamName: (name: string, arrayOf?: Function) => ParameterDecorator =
  (name, arrayOf) => (target, propertyKey, parameterIndex) => {
    Metadata(TOOL_PARAMNAME, name)(target, propertyKey!, parameterIndex);
    if (arrayOf) {
      Metadata(TOOL_PARAMNAME_ARRAYOF, arrayOf)(target, propertyKey!, parameterIndex);
    }
  };

export const Agent: (text?: string) => ClassDecorator = (text) => (target) => {
  Metadata(AGENT_DESCRIPTION, text)(target);
};

export const CriticalInstruction: (text: string) => ClassDecorator = (text) => (target) => {
  Metadata(AGENT_CRITICAL_INSTRUCTION, text)(target);
};

export const ResponseInstruction: (text: string) => ClassDecorator = (text) => (target) => {
  Metadata(AGENT_RESPONSE_INSTRUCTION, text)(target);
};

export const SimplificationPrompt: (text: string) => ClassDecorator = (text) => (target) => {
  Metadata(AGENT_SIMPLIFICATION_INSTRUCTION, text)(target);
};

export const Description: (text: string) => MethodDecorator = (text) => (_, __, descriptor) => {
  Metadata(TOOL_DESCRIPTION, text)(descriptor.value);
};

const REQUIRE_APPROVAL = Metadata(TOOL_REQUIRE_APPROVAL, true);
export const RequireApproval: () => MethodDecorator = () => REQUIRE_APPROVAL;

export type Conversation = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type FunctionInvocationRequest<Auto extends object = Record<string, (...args: any) => any>> = {
  [K in keyof Auto]: Auto[K] extends (...args: any) => any
  ? {
    function: K;
    intention: string;
    arguments: Parameters<Auto[K]>;
  }
  : never;
}[keyof Auto];

export const ACTION_TYPE = "action";
export const SIMPLIFICATION_TYPE = "simplification";

export type PromptType = typeof ACTION_TYPE | typeof SIMPLIFICATION_TYPE;

export class BaseAgent {
  @Tool()
  @Description(
    "completes the task with the given response. You should call this function when you have gathered enough information to answer the user's question or complete the user's instruction.",
  )
  complete(
    @ParamName("response")
    response: string,
  ) {
    return { type: "done" as const, response };
  }

  assembleTools() {
    const proto = Object.getPrototypeOf(this);
    const clazz = proto.constructor;
    const tools: ToolFunction[] = getMetadata(TOOL_FUNCTION, proto) ?? [];
    const staticTools: ToolFunction[] = getMetadata(TOOL_FUNCTION, clazz) ?? [];
    const assembledTools = tools.map(({ name, fn }) => ({ name, fn, proto })).concat(staticTools.map(({ name, fn }) => ({ name, fn, proto: clazz })));
    return assembledTools;
  }

  assembleToolDescriptions() {
    const tools = this.assembleTools();
    const toolDescriptions = tools
      .map(({ name, fn, proto }) => {
        const description = getMetadata(TOOL_DESCRIPTION, fn) ?? "No description";
        const paramTypes = getMetadata(DESIGN_PARAMTYPES, proto, fn.name) ?? [];
        const params = paramTypes
          .map((t: any, i: number) => {
            const paramName = getMetadata(TOOL_PARAMNAME, proto, fn.name, i) ?? `param${i + 1}`;
            const arrayOf = getMetadata(TOOL_PARAMNAME_ARRAYOF, proto, fn.name, i);
            return arrayOf ? `${paramName}: ${arrayOf.name}[]` : `${paramName}: ${t.name}`;
          })
          .join(", ");
        return `- ${name}(${params}): ${description}`;
      })
      .join("\n\n");

    return toolDescriptions;
  }

  assembleSystemPrompts() {
    const proto = Object.getPrototypeOf(this);
    const clazz = proto.constructor;
    const systemPromptHeader = getMetadata(AGENT_DESCRIPTION, clazz) ?? DEFAULT_SYSTEM_INSTRUCTION;
    const criticalInstruction = getMetadata(AGENT_CRITICAL_INSTRUCTION, clazz) ?? DEFAULT_CRITICAL_INSTRUCTION;
    const responseInstruction = getMetadata(AGENT_RESPONSE_INSTRUCTION, clazz) ?? DEFAULT_RESPONSE_INSTRUCTION;
    const toolDescriptions = this.assembleToolDescriptions();

    return [systemPromptHeader, toolDescriptions, criticalInstruction, responseInstruction].join("\n\n");
  }

  assembleResponseFormat() {
    const proto = Object.getPrototypeOf(this);
    const clazz = proto.constructor;

    const responseFormatDefs: Array<{ name: string; schema: any }> = getMetadata(AGENT_TYPES, clazz) ?? [];
    const defs = responseFormatDefs.reduce((acc, { name, schema }) => ({ ...acc, [name]: schema }), {});

    return {
      type: "json_schema",
      json_schema: {
        name: "FunctionInvocationRequest",
        strict: true,
        schema: {
          type: "object",
          properties: {
            function: {
              type: "string",
            },
            intention: {
              type: "string",
            },
            arguments: {
              type: "array",
              items: {
                anyOf: [
                  { type: "string" },
                  { type: "number" },
                  { type: "boolean" },
                  { type: "null" },
                  ...responseFormatDefs.flatMap(({ name }) => [
                    { $ref: `#/$defs/${name}` },
                    { type: "array", items: { $ref: `#/$defs/${name}` } },
                  ]),
                ],
              },
            },
          },
          required: ["function", "arguments", "intention"],
          additionalProperties: false,
          $defs: defs,
        },
      },
    };
  }

  assembleSimplificationPrompt() {
    const proto = Object.getPrototypeOf(this);
    const clazz = proto.constructor;
    const simplificationContent = getMetadata(AGENT_SIMPLIFICATION_INSTRUCTION, clazz) ?? SIMPLIFICATION_PROMPT;
    return simplificationContent;
  }

  assembleSimplificationResponseFormat() {
    return {
      type: "json_schema",
      json_schema: {
        name: "FunctionInvocationRequest",
        strict: true,
        schema: {
          type: "object",
          properties: {
            function: {
              type: "string",
            },
            intention: {
              type: "string",
            },
            arguments: {
              type: "array",
              items: {
                anyOf: [
                  { type: "string" },
                ],
              },
            },
          },
          required: ["function", "arguments", "intention"],
          additionalProperties: false,
        },
      }
    }
  }

  async *prompt(
    instruction: string,
  ): AsyncGenerator<
    { prompt: Conversation[]; type: PromptType; responseFormat: any, previousFunctionCall: FunctionInvocationRequest },
    { type: "done"; response: string; functionCallHistory: FunctionInvocationRequest[] },
    string
  > {
    const proto = Object.getPrototypeOf(this);
    const tokenEncoding = getMetadata(AGENT_TIKTOKEN_ENCODING, proto) ?? "o200k_base";
    const enc = get_encoding(tokenEncoding);
    const promptResponseFormat = this.assembleResponseFormat()
    const simplificationResponseFormat = this.assembleSimplificationResponseFormat()
    const prompt = this.assembleSystemPrompts();
    const initialPrompts: Conversation[] = [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: instruction,
      },
    ];

    let systemPrompts: Conversation[] = [...initialPrompts];
    const agentFunctionHistory: FunctionInvocationRequest[] = [];

    while (true) {
      const nexted = yield {
        prompt: systemPrompts,
        type: ACTION_TYPE,
        responseFormat: promptResponseFormat,
        previousFunctionCall: agentFunctionHistory.at(-1) ?? {
          function: "initialPrompt",
          intention: "Processing prompt: " + instruction,
          arguments: [],
        }
      };

      if (!nexted) {
        throw new Error("Response is required. Call .next(response) with the response from the model.");
      }

      const parsed: FunctionInvocationRequest = JSON.parse(nexted);
      if (parsed.function === "complete") {
        return {
          ...this.complete(parsed.arguments[0]),
          functionCallHistory: agentFunctionHistory,
        };
      }

      const methodFromInstance = Reflect.get(this, parsed.function, proto)
      const methodFromStatic = Reflect.get(this, parsed.function, proto.construtor);

      const method = methodFromInstance ?? methodFromStatic;
      const thisArgument = methodFromInstance ? proto : proto.constructor

      if (typeof method !== "function") {
        throw new Error(`Function ${parsed.function} not found on agent.`);
      }

      const result = await Reflect.apply(method, thisArgument, parsed.arguments);
      const conversationResult: Conversation = {
        role: "system",
        content: `function ${parsed.function} called with arguments ${JSON.stringify(parsed.arguments)} to ${parsed.intention}, result: ${result ? JSON.stringify(result) : "void"}`,
      };

      systemPrompts.push(conversationResult);
      agentFunctionHistory.push(parsed);

      const tikTokens = enc.encode(JSON.stringify(systemPrompts)).length;
      if (tikTokens < 1500) {
        continue;
      }

      const simplificationPrompts: Conversation[] = [
        {
          role: "system",
          content: SIMPLIFICATION_PROMPT,
        },
        ...systemPrompts.slice(1),
      ];

      const nextedSimplified = yield {
        prompt: simplificationPrompts,
        type: SIMPLIFICATION_TYPE,
        responseFormat: simplificationResponseFormat,
        previousFunctionCall: parsed,
      };
      if (!nextedSimplified) {
        throw new Error("Response is required. Call .next(response) with the response from the model.");
      }

      const parsedSimplified: FunctionInvocationRequest = JSON.parse(nextedSimplified);
      if (parsedSimplified.function !== "continue") {
        throw new Error(
          `Function ${parsedSimplified.function} not found on agent. Expected "continue" for simplification response.`,
        );
      }

      const [simplificationContent] = Array.isArray(parsedSimplified.arguments) ? parsedSimplified.arguments[0] : [];
      if (typeof simplificationContent !== "string" || !simplificationContent) {
        throw new Error("Invalid simplified history format.", { cause: { simplifiedHistory: simplificationContent } });
      }

      agentFunctionHistory.push(parsedSimplified)

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
            `End simplification. Continue user requested action. ` +
            `Call history: \n ${agentFunctionHistory.join("\n")}`,
        },
      ];

      systemPrompts = [...initialPrompts, ...simplificationPromptsFollowUp];
    }
  }
}

export const DEFAULT_SYSTEM_INSTRUCTION = `You are an agent that can perform tasks by calling functions. 
This is a single prompt context, you may be performing partial tasks,
and the system will perform the function call for you. If the function has been called previously,
it will be included in the conversation history as a whole version or simplified version.

You have access to the following functions:
`.trim();

export const DEFAULT_CRITICAL_INSTRUCTION = `
CRITICAL INSTRUCTIONS:
1. When using function with \`start\` and \`end\` parameters:
  - MUST use start and end parameters to paginate the results
  - MUST stop calling when the array is empty, meaning the end of the list
  - NEVER call overlapping ranges. Meaning if you have called start=30 and end=40, the next call should not call start=0 and end=50, because it overlaps with the previous call. You can call start=40 and end=50, because it does not overlap with the previous call.
2. ALWAYS call the function \`complete\` when you have gathered enough information to answer the user's question or complete the user's instruction.
3. If you do not have information like "id", ALWAYS use the tabulate functions (units or recipes) and browse through the array until you find the Inventory Unit/Recipe data.
`.trim();

export const DEFAULT_RESPONSE_INSTRUCTION = `
RESPONSE INSTRUCTIONS:
- ALWAYS only respond with JSON:
{
    "function": "function name here",
    "intention": "brief description of the action",
    "arguments": [arg1, arg2, ...]
}
- You may use non-void functions as many times as possible to get necessary information
- SHOULD use page size of 10 for any tabulation functions, but you may specify any page size you find suitable
- MUST NOT include any explanation or text other than the JSON response
- MUST call functions as needed to complete the task, and you can call multiple functions in a single response if necessary
- MUST ensure that the arguments in the JSON response are properly formatted according to the function definitions and types provided above
- MUST ALWAYS use non-void functions as a source of information to validate your actions and decisions.
- Functions that you have called will be included as a SYSTEM message. ALWAYS use that information to inform your next action, and you MUST NOT ignore it.
`.trim();

export const SIMPLIFICATION_PROMPT = `
There seemed to be too many tokens in the conversation history, please simplify the conversation history by summarizing the previous conversation into a shorter form while retaining the important information and context.
The simplified conversation history should be in the format of a list of messages, each message having a role (system, user, assistant) and content (the message content). The content should be concise and to the point, while still conveying the necessary information.

ALWAYS include the function call history.
ALWAYS omit the function call result. 
ALWAYS describe that does the function do and what has been done by the function.
ALWAYS describe the action on the point of view of a system.
ALWAYS plan for the next execution and ALWAYS INCLUDE the required information for the next execution (like id, etc.)

RESPONSE INSTRUCTIONS:
- ALWAYS only respond with JSON:
{
    "function": "continue", // constant, MUST ONLY respond with "continue"
    "intention": "short description of the function history", // constant, MUST ONLY respond with this string
    "arguments": ["string"] // your simplification here. MUST ONLY respond in a single string in the array, and the string should be the simplified conversation history in JSON format of the list of messages.
}

`.trim();
