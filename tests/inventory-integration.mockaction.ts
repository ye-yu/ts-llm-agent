import type { InventoryRecipe, InventoryUnit } from "./inventory-integration.schema.ts";
import { InventoryService } from "./inventory-integration.service.ts";

export async function applyMockAction(service: InventoryService): Promise<void> {
  const units = await service.database.inventoryUnits.findAll();
  const unitById: Record<string, InventoryUnit> = {};
  for (const unit of units) {
    unitById[String(unit.id)] = {
      ...unit,
      id: String(unit.id),
    };
  }

  const recipes = await service.database.inventoryRecipes.findAll();
  const recipeById: Record<string, InventoryRecipe> = {};
  for (const recipe of recipes) {
    recipeById[String(recipe.id)] = {
      ...recipe,
      id: String(recipe.id),
    };
  }

  await service.inventoryStockIn("opening stock - dry goods", [
    unitById["flour-kg"],
    unitById["sugar-kg"],
    unitById["salt-kg"],
    unitById["yeast-kg"],
    unitById["rice-kg"],
    unitById["pasta-kg"],
  ]);

  await service.inventoryStockIn("opening stock - dairy", [
    unitById["milk-l"],
    unitById["cream-l"],
    unitById["butter-kg"],
    unitById["cheddar-kg"],
    unitById["mozzarella-kg"],
  ]);

  await service.inventoryStockIn("opening stock - proteins", [
    unitById["eggs-pcs"],
    unitById["chicken-breast-kg"],
    unitById["beef-kg"],
  ]);

  await service.inventoryStockIn("opening stock - produce", [
    unitById["onion-kg"],
    unitById["garlic-kg"],
    unitById["bell-pepper-kg"],
    unitById["mushroom-kg"],
    unitById["strawberry-kg"],
    unitById["blueberry-kg"],
  ]);

  await service.inventoryStockIn("opening stock - flavoring", [
    unitById["olive-oil-l"],
    unitById["tomato-sauce-l"],
    unitById["vanilla-extract-l"],
    unitById["chocolate-kg"],
    unitById["cocoa-powder-kg"],
    unitById["baking-powder-kg"],
  ]);

  await service.inventoryProduction(recipeById["recipe-bread-loaf-20pcs"]);
  await service.inventoryProduction(recipeById["recipe-croissant-60pcs"]);
  await service.inventoryProduction(recipeById["recipe-pizza-margherita-24pcs"]);
  await service.inventoryProduction(recipeById["recipe-chicken-pasta-box-30pcs"]);
  await service.inventoryProduction(recipeById["recipe-choco-cake-slice-40pcs"]);
  await service.inventoryProduction(recipeById["recipe-berry-smoothie-cup-50pcs"]);
  await service.inventoryProduction(recipeById["recipe-garlic-bread-36pcs"]);
  await service.inventoryProduction(recipeById["recipe-beef-rice-bowl-28pcs"]);

  await service.inventorySale([{ id: "bread-loaf-pcs", name: "Bread Loaf (pcs)", amount: 12 }]);
  await service.inventorySale([{ id: "croissant-pcs", name: "Croissant (pcs)", amount: 40 }]);
  await service.inventorySale([{ id: "pizza-margherita-pcs", name: "Pizza Margherita (pcs)", amount: 18 }]);
  await service.inventorySale([{ id: "chicken-pasta-box-pcs", name: "Chicken Pasta Box (pcs)", amount: 20 }]);
  await service.inventorySale([{ id: "choco-cake-slice-pcs", name: "Chocolate Cake Slice (pcs)", amount: 30 }]);
  await service.inventorySale([{ id: "berry-smoothie-cup-pcs", name: "Berry Smoothie Cup (pcs)", amount: 36 }]);
  await service.inventorySale([{ id: "garlic-bread-pcs", name: "Garlic Bread (pcs)", amount: 26 }]);
  await service.inventorySale([{ id: "beef-rice-bowl-pcs", name: "Beef Rice Bowl (pcs)", amount: 19 }]);

  await service.inventoryStockIn("mid-month replenish - milk and eggs", [
    { id: "milk-l", name: "Milk (L)", amount: 120 },
    { id: "eggs-pcs", name: "Eggs (pcs)", amount: 900 },
  ]);
  await service.inventoryStockIn("mid-month replenish - flour and butter", [
    { id: "flour-kg", name: "Flour (kg)", amount: 80 },
    { id: "butter-kg", name: "Butter (kg)", amount: 32 },
  ]);
  await service.inventoryStockIn("mid-month replenish - meats", [
    { id: "chicken-breast-kg", name: "Chicken Breast (kg)", amount: 45 },
    { id: "beef-kg", name: "Beef (kg)", amount: 38 },
  ]);

  await service.inventoryProduction(recipeById["recipe-pancake-batter-120pcs"]);
  await service.inventoryProduction(recipeById["recipe-double-choco-drink-80cups"]);

  await service.inventorySale([{ id: "pancake-pcs", name: "Pancake (pcs)", amount: 70 }]);
  await service.inventorySale([{ id: "choco-drink-cup-pcs", name: "Chocolate Drink Cup (pcs)", amount: 52 }]);
}
