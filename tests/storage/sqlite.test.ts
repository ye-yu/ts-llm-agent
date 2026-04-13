import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSchemaAsDatabase, Stringifiable, newId } from "./sqlite.ts";

class UserProfile {
	tags: string[] = [];
	timezone: string = "";
}

describe("createSchemaAsDatabase", () => {
	it("should insert rows and read them with findAll", async () => {
		const db = createSchemaAsDatabase({
			users: {
				id: String,
				name: String,
				age: Number,
				isActive: Boolean,
				createdAt: Date,
				profile: Stringifiable(UserProfile),
			},
		});

		await db.users.insert({
			id: "u-1",
			name: "Alice",
			age: 31,
			isActive: true,
			createdAt: new Date("2026-01-02T03:04:05.000Z"),
			profile: { tags: ["admin", "beta"], timezone: "UTC" },
		});

		const rows = await db.users.findAll();
		assert.equal(rows.length, 1);
		assert.equal(rows[0]?.id, "u-1");
		assert.equal(rows[0]?.name, "Alice");
		assert.equal(rows[0]?.age, 31);

		// Stored booleans and dates are normalized for SQLite persistence.
		assert.equal((rows[0] as any).isActive, 1);
		assert.equal((rows[0] as any).createdAt, "2026-01-02T03:04:05.000Z");
		assert.equal((rows[0] as any).profile, JSON.stringify({ tags: ["admin", "beta"], timezone: "UTC" }));
	});

	it("should support findAll pagination with limit and offset", async () => {
		const db = createSchemaAsDatabase({
			users: {
				id: String,
				name: String,
				age: Number,
			},
		});

		await db.users.insert({ id: "u-1", name: "A", age: 20 });
		await db.users.insert({ id: "u-2", name: "B", age: 21 });
		await db.users.insert({ id: "u-3", name: "C", age: 22 });

		const page = await db.users.findAll(2, 1);
		assert.equal(page.length, 2);
		assert.deepEqual(
			page.map((row) => row.id),
			["u-2", "u-3"],
		);
	});

	it("should update existing rows by id", async () => {
		const db = createSchemaAsDatabase({
			users: {
				id: String,
				name: String,
				age: Number,
				isActive: Boolean,
				createdAt: Date,
				profile: Stringifiable(UserProfile),
			},
		});

		await db.users.insert({
			id: "u-1",
			name: "Alice",
			age: 31,
			isActive: true,
			createdAt: new Date("2026-01-02T03:04:05.000Z"),
			profile: { tags: ["admin"], timezone: "UTC" },
		});

		await db.users.update("u-1", {
			id: "u-1",
			name: "Alice Updated",
			age: 32,
			isActive: false,
			createdAt: new Date("2026-01-03T10:20:30.000Z"),
			profile: { tags: ["ops"], timezone: "Europe/Berlin" },
		});

		const rows = await db.users.findAll();
		assert.equal(rows.length, 1);
		assert.equal(rows[0]?.name, "Alice Updated");
		assert.equal(rows[0]?.age, 32);
		assert.equal((rows[0] as any).isActive, 0);
		assert.equal((rows[0] as any).createdAt, "2026-01-03T10:20:30.000Z");
		assert.equal((rows[0] as any).profile, JSON.stringify({ tags: ["ops"], timezone: "Europe/Berlin" }));
	});

	it("should delete rows by id", async () => {
		const db = createSchemaAsDatabase({
			users: {
				id: String,
				name: String,
			},
		});

		await db.users.insert({ id: "u-1", name: "A" });
		await db.users.insert({ id: "u-2", name: "B" });
		assert.equal((await db.users.findAll()).length, 2);

		await db.users.delete("u-1");
		const rows = await db.users.findAll();

		assert.equal(rows.length, 1);
		assert.equal(rows[0]?.id, "u-2");
		assert.equal(rows[0]?.name, "B");
	});
});

describe("newId", () => {
	it("should compose id from padded timestamp and UUID segment", (t) => {
		t.mock.method(Date, "now", () => 255);
		t.mock.method(crypto, "randomUUID", () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

		const id = newId();
		assert.equal(id, "000000ff-bbbb");
	});

	it("should produce ids with expected wire format", () => {
		const id = newId();
		assert.match(id, /^[0-9a-f]{8,}-[0-9a-f]{4}$/);
	});

	it("should produce distinct ids when UUID segment changes at same timestamp", (t) => {
		t.mock.method(Date, "now", () => 1234);
		let counter = 0;
		t.mock.method(crypto, "randomUUID", () => {
			counter += 1;
			return `aaaaaaaa-${counter.toString(16).padStart(4, "0")}-cccc-dddd-eeeeeeeeeeee`;
		});

		const first = newId();
		const second = newId();
		const third = newId();

		assert.equal(first, "000004d2-0001");
		assert.equal(second, "000004d2-0002");
		assert.equal(third, "000004d2-0003");
		assert.notEqual(first, second);
		assert.notEqual(second, third);
	});

	it("should return identical ids when both timestamp and UUID segment repeat", (t) => {
		t.mock.method(Date, "now", () => 1234);
		t.mock.method(crypto, "randomUUID", () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

		const first = newId();
		const second = newId();

		assert.equal(first, "000004d2-bbbb");
		assert.equal(second, "000004d2-bbbb");
		assert.equal(first, second);
	});

	it("should reflect increasing timestamps in the id prefix", (t) => {
		let ts = 1000;
		t.mock.method(Date, "now", () => {
			ts += 1;
			return ts;
		});
		t.mock.method(crypto, "randomUUID", () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

		const first = newId();
		const second = newId();

		assert.equal(first, "000003e9-bbbb");
		assert.equal(second, "000003ea-bbbb");
	});
});

