import { Id, type Database } from "./storage/sqlite.ts";
import { InventoryRecipe, inventorySchema, InventoryUnit } from "./inventory-integration.schema.ts";

function addDecimal(a: number, b: number): number {
  const result = a + b;
  const tolerance = 1000;
  return Math.round(result * tolerance) / tolerance;
}

function subtractDecimal(a: number, b: number): number {
  const result = a - b;
  const tolerance = 1000;
  return Math.round(result * tolerance) / tolerance;
}

export class InventoryService {
  database: Database<typeof inventorySchema>;
  constructor(database: Database<typeof inventorySchema>) {
    this.database = database;
  }

  async inventoryStockIn(remark: string, units: InventoryUnit[]): Promise<void> {
    for (const unit of units) {
      const existing = await this.database.inventoryUnits.findById(unit.id);
      if (existing) {
        await this.database.inventoryUnits.update(unit.id, {
          ...existing,
          amount: addDecimal(existing.amount, unit.amount),
        });
      } else {
        await this.database.inventoryUnits.insert(unit);
      }
    }

    await this.database.inventoryChanges.insert({
      id: new Id().toString(),
      event: "stock-in",
      remark,
      units,
      timestamp: new Date(),
    });
  }

  async inventoryStockOut(remark: string, units: InventoryUnit[]): Promise<void> {
    for (const unit of units) {
      const existing = await this.database.inventoryUnits.findById(unit.id);
      if (existing) {
        await this.database.inventoryUnits.update(unit.id, {
          ...existing,
          amount: subtractDecimal(existing.amount, unit.amount),
        });
      } else {
        await this.database.inventoryUnits.insert(unit);
      }
    }

    await this.database.inventoryChanges.insert({
      id: new Id(),
      event: "stock-out",
      remark,
      units,
      timestamp: new Date(),
    });
  }

  async inventoryProduction(recipe: InventoryRecipe): Promise<void> {
    await this.inventoryStockOut(`production: ${recipe.name}`, recipe.unitsConsumed);
    await this.inventoryStockIn(`production: ${recipe.name}`, recipe.unitsProduced);
  }

  async inventorySale(units: InventoryUnit[]): Promise<void> {
    await this.inventoryStockOut(`sale`, units);
  }

  async inventoryTabulateRecipes(start: number = 0, end?: number): Promise<string[]> {
    const recipes = await this.database.inventoryRecipes.findAll();
    if (recipes.slice(start, end).length === 0) {
      return [];
    }
    return [
      "Available Recipes:",
      `Size: ${recipes.length}`,
      `Showing ${start + 1} to ${Math.min(end ?? recipes.length, recipes.length)}`,
      ...recipes.slice(start, end).map((recipe) => {
        const consumedStr = recipe.unitsConsumed
          .map((unit) => `${unit.name} (id: ${unit.id}): ${unit.amount}`)
          .join(", ");
        const producedStr = recipe.unitsProduced
          .map((unit) => `${unit.name} (id: ${unit.id}): ${unit.amount}`)
          .join(", ");
        return `${recipe.name} (id: ${recipe.id}) - Consumes: ${consumedStr} - Produces: ${producedStr}`;
      }),
    ];
  }

  async inventoryTabulateUnits(start: number = 0, end?: number): Promise<string[]> {
    const state = await this.database.inventoryUnits.findAll();
    if (state.slice(start, end).length === 0) {
      return [];
    }
    return [
      "Current Inventory Units:",
      `Size: ${state.length}`,
      `Showing ${start + 1} to ${Math.min(end ?? state.length, state.length)}`,
      ...state.slice(start, end).map((unit) => `${unit.name} (id: ${unit.id}): ${unit.amount}`),
    ];
  }

  async inventoryTabulateHistory(start: number = 0, end?: number): Promise<string[]> {
    const state = await this.database.inventoryChanges.findAll();
    if (state.slice(start, end).length === 0) {
      return [];
    }
    return [
      "Inventory Change History:",
      `Size: ${state.length}`,
      `Showing ${start + 1} to ${Math.min(end ?? state.length, state.length)}`,
      ...state.slice(start, end).map((change) => {
        const unitsStr = change.units.map((unit) => `${unit.name} (id: ${unit.id}): ${unit.amount}`).join(", ");
        return `${change.timestamp.toISOString()} - ${change.event} - ${change.remark} - ${unitsStr}`;
      }),
    ];
  }

  async inventoryTabulate(start: number = 0, end?: number): Promise<string[]> {
    return [...(await this.inventoryTabulateUnits(start, end)), ...(await this.inventoryTabulateHistory(start, end))];
  }
}
