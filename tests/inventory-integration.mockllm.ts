import type { FunctionInvocationRequest } from "../src/agent.ts";

export class MockLLMResponse<Auto extends object = any> {
  nexts: FunctionInvocationRequest<Auto>[];
  constructor() {
    this.nexts = [];
  }

  push(next: FunctionInvocationRequest<Auto>) {
    this.nexts.push(next);
  }

  nextText() {
    const next = this.nexts.shift();
    if (!next) {
      throw new Error("No more nexts");
    }
    return JSON.stringify(next);
  }
}
