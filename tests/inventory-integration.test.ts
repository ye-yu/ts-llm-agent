import "reflect-metadata";
import { afterEach, beforeEach, describe, it } from "node:test";
import { type Database } from "./storage/sqlite.ts";
import { inventorySchema } from "./inventory-integration.schema.ts";
import { InventoryAgent } from "./inventory-integration.agent.ts";
import { InventoryService } from "./inventory-integration.service.ts";
import assert from "node:assert/strict";
import { MockLLMResponse } from "./inventory-integration.mockllm.ts";
import { initMockInventoryDatabase } from "./inventory-integration.mockdb.ts";
import { ACTION_TYPE, SIMPLIFICATION_TYPE } from "../src/types.ts";

describe("InventoryAgent", () => {
  let database: Database<typeof inventorySchema>;
  let agent: InventoryAgent;

  beforeEach(async () => {
    database = await initMockInventoryDatabase();
    agent = new InventoryAgent(new InventoryService(database));
  });

  afterEach(() => {
    database.db[Symbol.dispose]();
  });

  it("should end if complete is called", async () => {
    const llm = new MockLLMResponse<InventoryAgent>();
    llm.push({ function: "complete", intention: "finish", arguments: ["I am done"] });
    const generator = agent.startNewSession();
    const firstPrompt = await generator.next("Test prompt");
    assert.ok(firstPrompt.value);
    assert.deepEqual(firstPrompt.value.type, ACTION_TYPE);
    assert.ok(firstPrompt.value.prompt.length);

    const mockLLMResponse = llm.nextText();
    const nextPrompt = await generator.next(mockLLMResponse);
    assert.ok(firstPrompt.value);
    assert.deepEqual(firstPrompt.value.type, ACTION_TYPE);
    assert.ok(firstPrompt.value.prompt.length);

    assert.ok(nextPrompt.value);
    assert.deepEqual(nextPrompt.value.type, "done");
    assert.deepEqual(nextPrompt.value.response, "I am done");
  });

  it("should call the tool function and then end if complete is called", async () => {
    const [randomItem] = (await database.inventoryUnits.findAll(1)) ?? [];
    assert.ok(randomItem);

    const currentAmount = randomItem.amount;

    const llm = new MockLLMResponse<InventoryAgent>();
    llm.push({
      function: "inventoryStockIn",
      intention: "stock in",
      arguments: ["Stocking in 10 units of item A", [{ ...randomItem, id: String(randomItem.id), amount: 10 }]],
    });
    llm.push({ function: "complete", intention: "finish", arguments: ["I am done"] });

    await using generator = agent.startNewSession();
    const firstPrompt = await generator.next("Test prompt");
    assert.ok(firstPrompt.value);
    assert.deepEqual(firstPrompt.value.type, ACTION_TYPE);
    assert.ok(firstPrompt.value.prompt.length);

    const mockLLMResponse1 = llm.nextText();
    const secondPrompt = await generator.next(mockLLMResponse1);
    assert.ok(secondPrompt.value);
    assert.deepEqual(secondPrompt.value.type, ACTION_TYPE);
    assert.match(secondPrompt.value.prompt.map((e) => e.content).join("\n"), /Stocking in 10 units of item A/);
    assert.match(secondPrompt.value.prompt.map((e) => e.content).join("\n"), /inventoryStockIn/);
    assert.ok(secondPrompt.value.prompt.length);

    const mockLLMResponse2 = llm.nextText();
    const thirdPrompt = await generator.next(mockLLMResponse2);
    assert.ok(thirdPrompt.value);
    assert.deepEqual(thirdPrompt.value.type, "done");
    assert.deepEqual(thirdPrompt.value.response, "I am done");

    const currentUnit = await database.inventoryUnits.findById(String(randomItem.id));
    assert.ok(currentUnit);
    assert.deepEqual(currentUnit, { ...randomItem, amount: currentAmount + 10 });
  });

  it("should call simplification if token is too many", async () => {
    const llm = new MockLLMResponse<InventoryAgent & { continue: (text: string) => void }>();
    llm.push({
      function: "inventoryTabulate",
      intention: "stock in".repeat(100),
      arguments: [0, 100],
    });
    llm.push({ function: "continue", intention: "continue simplification", arguments: ["Simplification here"] });
    llm.push({ function: "complete", intention: "finish", arguments: ["I am done"] });

    const generator = agent.startNewSession();
    const firstPrompt = await generator.next("Test prompt");
    assert.ok(firstPrompt.value);
    assert.deepEqual(firstPrompt.value.type, ACTION_TYPE);
    assert.ok(firstPrompt.value.prompt.length);

    const mockLLMResponse1 = llm.nextText();
    const secondPrompt = await generator.next(mockLLMResponse1);
    assert.ok(secondPrompt.value);
    assert.deepEqual(secondPrompt.value.type, SIMPLIFICATION_TYPE);
    assert.ok(secondPrompt.value.prompt.length);

    const mockLLMResponse2 = llm.nextText();
    const thirdPrompt = await generator.next(mockLLMResponse2);
    assert.ok(thirdPrompt.value);
    assert.deepEqual(thirdPrompt.value.type, ACTION_TYPE);
    assert.ok(thirdPrompt.value.prompt.length);

    const mockLLMResponse3 = llm.nextText();
    const fourthPrompt = await generator.next(mockLLMResponse3);
    assert.ok(fourthPrompt.value);
    assert.deepEqual(fourthPrompt.value.type, "done");
    assert.deepEqual(fourthPrompt.value.response, "I am done");
  });
});
