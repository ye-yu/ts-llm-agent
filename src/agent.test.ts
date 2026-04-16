import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  AGENT_CRITICAL_INSTRUCTION,
  AGENT_DESCRIPTION,
  AGENT_RESPONSE_INSTRUCTION,
  AGENT_SIMPLIFICATION_INSTRUCTION,
  AGENT_SIMPLIFICATION_THRESHOLD,
  AGENT_TIKTOKEN_ENCODING,
  AGENT_TYPES,
  Agent,
  BaseAgent,
  CriticalInstruction,
  Description,
  JsonSchemaType,
  ParamName,
  RequireApproval,
  ResponseInstruction,
  SimplificationPrompt,
  SimplificationThreshold,
  TOOL_DESCRIPTION,
  TOOL_FUNCTION,
  TOOL_PARAMNAME,
  TOOL_PARAMNAME_ARRAYOF,
  TOOL_REQUIRE_APPROVAL,
  TiktokenEncoding,
  Tool,
} from "./agent.ts";
import { getMetadata } from "./metadata-compat/metadata.ts";
import { ACTION_TYPE, SIMPLIFICATION_TYPE } from "./types.ts";
import { reinstallLoggers } from "./debug/debug.ts";

class Ingredient {
  id: string = "";
}

@Agent("Inventory helper")
@CriticalInstruction("Never skip audits")
@ResponseInstruction("Return structured JSON")
@SimplificationThreshold(1400)
@SimplificationPrompt("Custom simplification")
@JsonSchemaType("Ingredient", {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
  additionalProperties: false,
})
@TiktokenEncoding("o200k_base")
class DemoAgent extends BaseAgent {
  @Tool()
  @Description("Adds two numbers")
  add(
    @ParamName("left")
    left: number,
    @ParamName("right")
    right: number,
  ) {
    return left + right;
  }

  @Tool()
  @Description("Echoes an ingredient list")
  echoIngredients(
    @ParamName("items", Ingredient)
    items: Ingredient[],
  ) {
    return items;
  }

  @Tool()
  static staticTool(
    @ParamName("value")
    value: string,
  ) {
    return `static:${value}`;
  }
}

@TiktokenEncoding("gpt2")
class PromptAgent extends BaseAgent {
  @Tool()
  @Description("returns an echoed value")
  echo(
    @ParamName("value")
    value: string,
  ) {
    return `echo:${value}`;
  }

  @Tool()
  @Description("returns a long payload")
  huge(
    @ParamName("value")
    value: string,
  ) {
    return value.repeat(8000);
  }
}

describe("Agent tests", () => {
  beforeEach(() => {
    reinstallLoggers("llm-agent:agent:*")
    reinstallLoggers("llm-agent:generator:*")
  })

  afterEach(() => {
    reinstallLoggers()
  })

  describe("TiktokenEncoding", () => {
    it("stores encoding metadata on the class", () => {
      @TiktokenEncoding("cl100k_base")
      class CustomEncodingAgent extends BaseAgent { }

      assert.equal(getMetadata(AGENT_TIKTOKEN_ENCODING, CustomEncodingAgent), "cl100k_base");
    });
  });

  describe("JsonSchemaType", () => {
    it("appends schema type definitions on the class", () => {
      @JsonSchemaType("One", { type: "object", properties: { id: { type: "string" } } })
      @JsonSchemaType("Two", { type: "object", properties: { value: { type: "number" } } })
      class TypesAgent extends BaseAgent { }

      assert.deepEqual(getMetadata(AGENT_TYPES, TypesAgent), [
        { name: "Two", schema: { type: "object", properties: { value: { type: "number" } } } },
        { name: "One", schema: { type: "object", properties: { id: { type: "string" } } } },
      ]);
    });
  });

  describe("Tool", () => {
    it("registers methods as callable tools", () => {
      const toolFns = getMetadata(TOOL_FUNCTION, DemoAgent.prototype) as Array<{ name: string; fn: Function }>;
      assert.ok(toolFns.length >= 2);
      assert.ok(toolFns.some((x) => x.name === "add"));
    });
  });

  describe("ParamName", () => {
    it("stores parameter names and array element type metadata", () => {
      assert.equal(getMetadata(TOOL_PARAMNAME, DemoAgent.prototype, "echoIngredients", 0), "items");
      assert.equal(getMetadata(TOOL_PARAMNAME_ARRAYOF, DemoAgent.prototype, "echoIngredients", 0), Ingredient);
    });
  });

  describe("Agent", () => {
    it("stores the class description", () => {
      assert.equal(getMetadata(AGENT_DESCRIPTION, DemoAgent), "Inventory helper");
    });
  });

  describe("CriticalInstruction", () => {
    it("stores the critical instruction text", () => {
      assert.equal(getMetadata(AGENT_CRITICAL_INSTRUCTION, DemoAgent), "Never skip audits");
    });
  });

  describe("ResponseInstruction", () => {
    it("stores the response instruction text", () => {
      assert.equal(getMetadata(AGENT_RESPONSE_INSTRUCTION, DemoAgent), "Return structured JSON");
    });
  });

  describe("SimplificationPrompt", () => {
    it("stores the simplification prompt text", () => {
      assert.equal(getMetadata(AGENT_SIMPLIFICATION_INSTRUCTION, DemoAgent), "Custom simplification");
    });
  });

  describe("SimplificationThreshold", () => {
    it("stores the simplification threshold token count", () => {
      assert.equal(getMetadata(AGENT_SIMPLIFICATION_THRESHOLD, DemoAgent), 1400);
    })
  })

  describe("Description", () => {
    it("stores method descriptions", () => {
      assert.equal(getMetadata(TOOL_DESCRIPTION, DemoAgent.prototype.add), "Adds two numbers");
    });
  });

  describe("RequireApproval", () => {
    it("marks a method as requiring approval", () => {
      class ApprovalAgent extends BaseAgent {
        @RequireApproval()
        run() {
          return "ok";
        }
      }

      assert.equal(getMetadata(TOOL_REQUIRE_APPROVAL, ApprovalAgent.prototype, "run"), true);
    });
  });

  describe("BaseAgent", () => {
    it("complete returns done payload", () => {
      const agent = new BaseAgent();
      assert.deepEqual(agent.complete("all done"), { type: "done", response: "all done" });
    });

    it("assembles tools from decorated methods on the class", () => {
      const agent = new DemoAgent();
      const tools = agent.assembleTools();
      const names = tools.map((t) => t.name);

      assert.ok(names.includes("add"));
      assert.ok(names.includes("echoIngredients"));
      assert.ok(names.includes("staticTool"));
      assert.ok(names.includes("complete"));
    });

    it("assembles human-readable tool descriptions", () => {
      const agent = new DemoAgent();
      const text = agent.assembleToolDescriptions();

      assert.ok(text.includes("- add(left: Number, right: Number): Adds two numbers"));
      assert.ok(text.includes("- echoIngredients(items: Ingredient[]): Echoes an ingredient list"));
    });

    it("assembles system prompt from class instructions", () => {
      const agent = new DemoAgent();
      const prompt = agent.assembleSystemPrompts();

      assert.ok(prompt.startsWith("Inventory helper"));
      assert.ok(prompt.includes("Never skip audits"));
      assert.ok(prompt.includes("Return structured JSON"));
      assert.ok(prompt.includes("- add("));
    });

    it("assembles response format with custom defs", () => {
      const agent = new DemoAgent();
      const responseFormat = agent.assembleResponseFormat();
      const defs: any = responseFormat.json_schema.schema.$defs;

      assert.equal(responseFormat.type, "json_schema");
      assert.ok(responseFormat.json_schema.strict);
      assert.deepEqual(defs.Ingredient, {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      });
    });

    it("assembles simplification prompt from decorator", () => {
      const agent = new DemoAgent();
      assert.equal(agent.assembleSimplificationPrompt(), "Custom simplification");
    });

    it("assembles simplification response format schema", () => {
      const agent = new DemoAgent();
      const responseFormat = agent.assembleSimplificationResponseFormat();

      assert.equal(responseFormat.type, "json_schema");
      assert.equal(responseFormat.json_schema.name, "FunctionInvocationRequest");
      assert.equal(responseFormat.json_schema.schema.required.includes("function"), true);
    });

    it("prompt yields action and completes with function history", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      const first = await iterator.next("echo a value");
      assert.equal(first.done, false);
      assert.equal(first.value.type, ACTION_TYPE);
      assert.equal(first.value.previousFunctionCall.function, "initialPrompt");

      const second = await iterator.next(
        JSON.stringify({
          function: "echo",
          intention: "Echo input",
          arguments: ["hello"],
        }),
      );
      assert.equal(second.done, false);
      assert.equal(second.value.type, ACTION_TYPE);
      assert.equal(second.value.previousFunctionCall.function, "echo");

      const final = await iterator.next(
        JSON.stringify({
          function: "complete",
          intention: "Finish",
          arguments: ["done"],
        }),
      );

      assert.equal(final.done, true);
      assert.deepEqual(final.value, {
        type: "done",
        response: "done",
        functionCallHistory: [
          {
            function: "echo",
            intention: "Echo input",
            arguments: ["hello"],
          },
          {
            function: "complete",
            intention: "Finish",
            arguments: ["done"],
          }
        ],
      });
    });

    it("prompt throws when called without a response payload", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      await iterator.next("echo a value");

      await assert.rejects(async () => {
        await iterator.next(undefined as any);
      }, /Response is required/);
    });

    it("prompt throws when requested function does not exist", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      await iterator.next("do unknown call");

      await assert.rejects(async () => {
        await iterator.next(
          JSON.stringify({
            function: "doesNotExist",
            intention: "No-op",
            arguments: [],
          }),
        );
      }, /Function doesNotExist not found on agent/);
    });

    it("prompt enters simplification mode when token budget is exceeded", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      await iterator.next("generate large payload");

      const simplificationStep = await iterator.next(
        JSON.stringify({
          function: "huge",
          intention: "Generate oversized content",
          arguments: ["x"],
        }),
      );

      assert.equal(simplificationStep.done, false);
      assert.equal(simplificationStep.value.type, SIMPLIFICATION_TYPE);
      assert.equal(simplificationStep.value.previousFunctionCall.function, "huge");

      const backToAction = await iterator.next(
        JSON.stringify({
          function: "continue",
          intention: "short description of the function history",
          arguments: ['[{"role":"system","content":"summary"}]'],
        }),
      );

      assert.equal(backToAction.done, false);
      assert.equal(backToAction.value.type, ACTION_TYPE);
      assert.equal(backToAction.value.prompt.length >= 3, true);
    });

    it("prompt throws if simplification response function is not continue", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      await iterator.next("generate large payload");
      await iterator.next(
        JSON.stringify({
          function: "huge",
          intention: "Generate oversized content",
          arguments: ["x"],
        }),
      );

      await assert.rejects(async () => {
        await iterator.next(
          JSON.stringify({
            function: "complete",
            intention: "incorrect simplification call",
            arguments: ["ignored"],
          }),
        );
      }, /Expected "continue" for simplification response/);
    });

    it("prompt throws for invalid simplified history payload", async () => {
      const agent = new PromptAgent();
      await using iterator = agent.startNewSession();

      await iterator.next("generate large payload");
      await iterator.next(
        JSON.stringify({
          function: "huge",
          intention: "Generate oversized content",
          arguments: ["x"],
        }),
      );

      await assert.rejects(async () => {
        await iterator.next(
          JSON.stringify({
            function: "continue",
            intention: "short description of the function history",
            arguments: [""],
          }),
        );
      }, /Invalid simplified history format/);
    });
  });

})