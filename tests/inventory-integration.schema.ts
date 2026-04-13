import { Id, Stringifiable } from "./storage/sqlite.ts";
import { IsArray, IsDate, IsNumber, IsString } from "class-validator";
import { Type } from "class-transformer";
import { JSONSchema } from "class-validator-jsonschema";

export class InventoryUnit {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  amount: number;

  constructor(value: { id: string; name: string; amount: number }) {
    this.id = value.id;
    this.name = value.name;
    this.amount = value.amount;
  }
}

export class InventoryRecipe {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @JSONSchema({ items: { $ref: "#/$defs/InventoryUnit" } })
  unitsConsumed: InventoryUnit[];

  @IsArray()
  @JSONSchema({ items: { $ref: "#/$defs/InventoryUnit" } })
  unitsProduced: InventoryUnit[];

  constructor(value: { id: string; name: string; unitsConsumed: InventoryUnit[]; unitsProduced: InventoryUnit[] }) {
    this.id = value.id;
    this.name = value.name;
    this.unitsConsumed = value.unitsConsumed;
    this.unitsProduced = value.unitsProduced;
  }
}

export type InventoryEvent = "stock-in" | "stock-out";

export class InventoryChange {
  @IsString()
  event: InventoryEvent;

  @IsString()
  remark: string;

  @IsArray()
  @JSONSchema({ items: { $ref: "#/$defs/InventoryUnit" } })
  units: InventoryUnit[];

  @IsDate()
  timestamp: Date;

  constructor(value: { event: InventoryEvent; remark: string; units: InventoryUnit[]; timestamp: Date }) {
    this.event = value.event;
    this.remark = value.remark;
    this.units = value.units;
    this.timestamp = value.timestamp;
  }
}

export type InventoryState = {
  units: InventoryUnit[];
  history: InventoryChange[];
};

export const inventorySchema = {
  inventoryUnits: {
    id: Id,
    name: String,
    amount: Number,
  },
  inventoryRecipes: {
    id: Id,
    name: String,
    unitsConsumed: Stringifiable(InventoryUnit, true),
    unitsProduced: Stringifiable(InventoryUnit, true),
  },
  inventoryChanges: {
    id: Id,
    event: String,
    remark: String,
    units: Stringifiable(InventoryUnit, true),
    timestamp: Date,
  },
};
