import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { Metadata, MetadataAppend, getMetadata, dumpMetadata } from "./metadata.ts";
import { reinstallLoggers } from "../debug/debug.ts";

describe("Metadata", () => {
  beforeEach(() => {
    reinstallLoggers("llm-agent:metadata:*")
  })

  afterEach(() => {
    reinstallLoggers()
  })

  it("should set metadata on a class/target", () => {
    class TestClass { }
    const decorator = Metadata("version", "1.0");
    decorator(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.version, "1.0");
  });

  it("should set metadata on a class property", () => {
    class TestClass {
      prop: string = "";
    }
    const decorator = Metadata("type", "string");
    decorator(TestClass, "prop");

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.["prop:type"], "string");
  });

  it("should set metadata on a method descriptor", () => {
    class TestClass {
      method() { }
    }
    const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, "method");
    const decorator = Metadata("http", "GET");
    decorator(TestClass, "method", descriptor!);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.["method:http"], "GET");
  });

  it("should set metadata on a parameter", () => {
    class TestClass {
      method(param: string) { }
    }
    const decorator = Metadata("paramType", "string");
    decorator(TestClass, "method", 0);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.["method:0:paramType"], "string");
  });

  it("should support various value types", () => {
    class TestClass { }

    Metadata("string", "text")(TestClass);
    Metadata("number", 42)(TestClass);
    Metadata("boolean", true)(TestClass);
    Metadata("object", { key: "value" })(TestClass);
    Metadata("array", [1, 2, 3])(TestClass);
    Metadata("null", null)(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.string, "text");
    assert.equal(metadata?.number, 42);
    assert.equal(metadata?.boolean, true);
    assert.deepEqual(metadata?.object, { key: "value" });
    assert.deepEqual(metadata?.array, [1, 2, 3]);
    assert.equal(metadata?.null, null);
  });

  it("should overwrite existing metadata", () => {
    class TestClass { }

    Metadata("version", "1.0")(TestClass);
    assert.equal(dumpMetadata(TestClass)?.version, "1.0");

    Metadata("version", "2.0")(TestClass);
    assert.equal(dumpMetadata(TestClass)?.version, "2.0");
  });

  it("should support multiple metadata keys on same target", () => {
    class TestClass { }

    Metadata("version", "1.0")(TestClass);
    Metadata("author", "John")(TestClass);
    Metadata("name", "Test")(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.version, "1.0");
    assert.equal(metadata?.author, "John");
    assert.equal(metadata?.name, "Test");
  });

  it("should support multiple properties with metadata", () => {
    class TestClass {
      prop1: string = "";
      prop2: number = 0;
    }

    Metadata("type", "string")(TestClass, "prop1");
    Metadata("type", "number")(TestClass, "prop2");

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.["prop1:type"], "string");
    assert.equal(metadata?.["prop2:type"], "number");
  });

  it("should support multiple parameters on same method", () => {
    class TestClass {
      method(p1: string, p2: number) { }
    }

    Metadata("type", "string")(TestClass, "method", 0);
    Metadata("type", "number")(TestClass, "method", 1);

    const metadata = dumpMetadata(TestClass);
    assert.equal(metadata?.["method:0:type"], "string");
    assert.equal(metadata?.["method:1:type"], "number");
  });

  it("should work with different target types", () => {
    const target1 = {};
    const target2 = { existing: true };
    const target3 = function () { };

    Metadata("key", "value1")(target1);
    Metadata("key", "value2")(target2);
    Metadata("key", "value3")(target3);

    assert.equal(dumpMetadata(target1)?.key, "value1");
    assert.equal(dumpMetadata(target2)?.key, "value2");
    assert.equal(dumpMetadata(target3)?.key, "value3");
  });
});

describe("MetadataAppend", () => {
  it("should create array and append initial value", () => {
    class TestClass { }

    const decorator = MetadataAppend("items", "item1");
    decorator(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.items, ["item1"]);
  });

  it("should append to existing array metadata", () => {
    class TestClass { }

    Metadata("items", [])(TestClass);
    MetadataAppend("items", "item1")(TestClass);
    MetadataAppend("items", "item2")(TestClass);
    MetadataAppend("items", "item3")(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.items, ["item1", "item2", "item3"]);
  });

  it("should append to property array metadata", () => {
    class TestClass {
      prop: string[] = [];
    }

    Metadata("validators", [])(TestClass, "prop");
    MetadataAppend("validators", "required")(TestClass, "prop");
    MetadataAppend("validators", "minLength")(TestClass, "prop");

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.["prop:validators"], ["required", "minLength"]);
  });

  it("should append to parameter array metadata", () => {
    class TestClass {
      method(param: string) { }
    }

    Metadata("decorators", [])(TestClass, "method", 0);
    MetadataAppend("decorators", "required")(TestClass, "method", 0);
    MetadataAppend("decorators", "optional")(TestClass, "method", 0);

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.["method:0:decorators"], ["required", "optional"]);
  });

  it("should throw when appending to non-array metadata", () => {
    class TestClass { }

    Metadata("config", { value: "scalar" })(TestClass);
    const decorator = MetadataAppend("config", "item");

    assert.throws(
      () => decorator(TestClass),
      /Cannot append metadata for key "config" because existing metadata is not an array/,
    );
  });

  it("should throw when appending to string metadata", () => {
    class TestClass { }

    Metadata("text", "hello")(TestClass);
    const decorator = MetadataAppend("text", "world");

    assert.throws(
      () => decorator(TestClass),
      /Cannot append metadata for key "text" because existing metadata is not an array/,
    );
  });

  it("should support appending various types", () => {
    class TestClass { }

    Metadata("values", [])(TestClass);
    MetadataAppend("values", "string")(TestClass);
    MetadataAppend("values", 42)(TestClass);
    MetadataAppend("values", { obj: true })(TestClass);
    MetadataAppend("values", [1, 2, 3])(TestClass);

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.values, ["string", 42, { obj: true }, [1, 2, 3]]);
  });

  it("should preserve array order when appending multiple times", () => {
    class TestClass { }

    Metadata("queue", [])(TestClass);
    for (let i = 1; i <= 5; i++) {
      MetadataAppend("queue", `item${i}`)(TestClass);
    }

    const metadata = dumpMetadata(TestClass);
    assert.deepEqual(metadata?.queue, ["item1", "item2", "item3", "item4", "item5"]);
  });

  it("should work independently on different targets", () => {
    class Target1 { }
    class Target2 { }

    Metadata("items", [])(Target1);
    Metadata("items", [])(Target2);

    MetadataAppend("items", "a")(Target1);
    MetadataAppend("items", "b")(Target1);

    MetadataAppend("items", "x")(Target2);
    MetadataAppend("items", "y")(Target2);
    MetadataAppend("items", "z")(Target2);

    assert.deepEqual(dumpMetadata(Target1)?.items, ["a", "b"]);
    assert.deepEqual(dumpMetadata(Target2)?.items, ["x", "y", "z"]);
  });
});

describe("getMetadata", () => {
  it("should retrieve metadata from target", () => {
    class TestClass { }
    Metadata("version", "1.0")(TestClass);

    const result = getMetadata("version", TestClass);
    assert.equal(result, "1.0");
  });

  it("should retrieve metadata from target property", () => {
    class TestClass {
      prop: string = "";
    }
    Metadata("type", "string")(TestClass, "prop");

    const result = getMetadata("type", TestClass, "prop");
    assert.equal(result, "string");
  });

  it("should retrieve metadata from method parameter", () => {
    class TestClass {
      method(param: string) { }
    }
    Metadata("required", true)(TestClass, "method", 0);

    const result = getMetadata("required", TestClass, "method", 0);
    assert.equal(result, true);
  });

  it("should return undefined for non-existent metadata", () => {
    class TestClass { }

    const result = getMetadata("missing", TestClass);
    assert.equal(result, undefined);
  });

  it("should return undefined for non-existent property metadata", () => {
    class TestClass {
      prop: string = "";
    }

    const result = getMetadata("missing", TestClass, "prop");
    assert.equal(result, undefined);
  });

  it("should return undefined for non-existent parameter metadata", () => {
    class TestClass {
      method(param: string) { }
    }

    const result = getMetadata("missing", TestClass, "method", 0);
    assert.equal(result, undefined);
  });

  it("should retrieve complex value types", () => {
    class TestClass { }

    const obj = { key: "value", nested: { deep: true } };
    const arr = [1, 2, { three: 3 }];

    Metadata("object", obj)(TestClass);
    Metadata("array", arr)(TestClass);
    Metadata("null", null)(TestClass);

    assert.deepEqual(getMetadata("object", TestClass), obj);
    assert.deepEqual(getMetadata("array", TestClass), arr);
    assert.equal(getMetadata("null", TestClass), null);
  });

  it("should retrieve correct metadata when multiple keys exist", () => {
    class TestClass { }

    Metadata("key1", "value1")(TestClass);
    Metadata("key2", "value2")(TestClass);
    Metadata("key3", "value3")(TestClass);

    assert.equal(getMetadata("key1", TestClass), "value1");
    assert.equal(getMetadata("key2", TestClass), "value2");
    assert.equal(getMetadata("key3", TestClass), "value3");
  });

  it("should distinguish between target and property metadata", () => {
    class TestClass {
      prop: string = "";
    }

    Metadata("name", "target")(TestClass);
    Metadata("name", "property")(TestClass, "prop");

    assert.equal(getMetadata("name", TestClass), "target");
    assert.equal(getMetadata("name", TestClass, "prop"), "property");
  });

  it("should distinguish between different parameter indices", () => {
    class TestClass {
      method(p1: string, p2: number, p3: boolean) { }
    }

    Metadata("type", "string")(TestClass, "method", 0);
    Metadata("type", "number")(TestClass, "method", 1);
    Metadata("type", "boolean")(TestClass, "method", 2);

    assert.equal(getMetadata("type", TestClass, "method", 0), "string");
    assert.equal(getMetadata("type", TestClass, "method", 1), "number");
    assert.equal(getMetadata("type", TestClass, "method", 2), "boolean");
  });

  it("should retrieve metadata from different targets independently", () => {
    class Target1 { }
    class Target2 { }

    Metadata("value", "target1")(Target1);
    Metadata("value", "target2")(Target2);

    assert.equal(getMetadata("value", Target1), "target1");
    assert.equal(getMetadata("value", Target2), "target2");
  });

  it("should handle symbol property keys", () => {
    class TestClass { }
    const sym = Symbol("test");

    Metadata("type", "symbol")(TestClass, sym);

    const result = getMetadata("type", TestClass, sym);
    assert.equal(result, "symbol");
  });

  it("should return undefined for wrong property name", () => {
    class TestClass {
      prop: string = "";
    }

    Metadata("type", "string")(TestClass, "prop");

    const result = getMetadata("type", TestClass, "wrongProp");
    assert.equal(result, undefined);
  });

  it("should return array from appended metadata", () => {
    class TestClass { }

    Metadata("items", [])(TestClass);
    MetadataAppend("items", "a")(TestClass);
    MetadataAppend("items", "b")(TestClass);

    const result = getMetadata("items", TestClass);
    assert.deepEqual(result, ["a", "b"]);
  });
});
