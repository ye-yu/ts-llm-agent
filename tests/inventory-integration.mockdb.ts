import { createSchemaAsDatabase } from "./storage/sqlite.ts";
import { inventorySchema, InventoryUnit, InventoryRecipe } from "./inventory-integration.schema.ts";

export const INVENTORY_UNITS_MOCK: InventoryUnit[] = [
  { id: "flour-kg", name: "Flour (kg)", amount: 320 },
  { id: "sugar-kg", name: "Sugar (kg)", amount: 185 },
  { id: "salt-kg", name: "Salt (kg)", amount: 42 },
  { id: "yeast-kg", name: "Yeast (kg)", amount: 28 },
  { id: "butter-kg", name: "Butter (kg)", amount: 96 },
  { id: "milk-l", name: "Milk (L)", amount: 410 },
  { id: "cream-l", name: "Cream (L)", amount: 95 },
  { id: "eggs-pcs", name: "Eggs (pcs)", amount: 2400 },
  { id: "chocolate-kg", name: "Chocolate (kg)", amount: 130 },
  { id: "cocoa-powder-kg", name: "Cocoa Powder (kg)", amount: 58 },
  { id: "vanilla-extract-l", name: "Vanilla Extract (L)", amount: 18 },
  { id: "baking-powder-kg", name: "Baking Powder (kg)", amount: 35 },
  { id: "olive-oil-l", name: "Olive Oil (L)", amount: 77 },
  { id: "tomato-sauce-l", name: "Tomato Sauce (L)", amount: 120 },
  { id: "mozzarella-kg", name: "Mozzarella (kg)", amount: 110 },
  { id: "cheddar-kg", name: "Cheddar (kg)", amount: 84 },
  { id: "chicken-breast-kg", name: "Chicken Breast (kg)", amount: 160 },
  { id: "beef-kg", name: "Beef (kg)", amount: 145 },
  { id: "rice-kg", name: "Rice (kg)", amount: 260 },
  { id: "pasta-kg", name: "Pasta (kg)", amount: 205 },
  { id: "onion-kg", name: "Onion (kg)", amount: 132 },
  { id: "garlic-kg", name: "Garlic (kg)", amount: 27 },
  { id: "bell-pepper-kg", name: "Bell Pepper (kg)", amount: 68 },
  { id: "mushroom-kg", name: "Mushroom (kg)", amount: 72 },
  { id: "strawberry-kg", name: "Strawberry (kg)", amount: 54 },
  { id: "blueberry-kg", name: "Blueberry (kg)", amount: 39 },
  { id: "bread-loaf-pcs", name: "Bread Loaf (pcs)", amount: 0 },
  { id: "croissant-pcs", name: "Croissant (pcs)", amount: 0 },
  { id: "pizza-margherita-pcs", name: "Pizza Margherita (pcs)", amount: 0 },
  { id: "chicken-pasta-box-pcs", name: "Chicken Pasta Box (pcs)", amount: 0 },
  { id: "choco-cake-slice-pcs", name: "Chocolate Cake Slice (pcs)", amount: 0 },
  { id: "berry-smoothie-cup-pcs", name: "Berry Smoothie Cup (pcs)", amount: 0 },
  { id: "pancake-pcs", name: "Pancake (pcs)", amount: 0 },
  { id: "choco-drink-cup-pcs", name: "Chocolate Drink Cup (pcs)", amount: 0 },
  { id: "garlic-bread-pcs", name: "Garlic Bread (pcs)", amount: 0 },
  { id: "beef-rice-bowl-pcs", name: "Beef Rice Bowl (pcs)", amount: 0 },
];

export const INVENTORY_RECIPES_MOCK: InventoryRecipe[] = [
  {
    id: "recipe-bread-loaf-20pcs",
    name: "Bread Loaf Batch (20 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 12 },
      { id: "yeast-kg", name: "Yeast (kg)", amount: 0.4 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.3 },
      { id: "butter-kg", name: "Butter (kg)", amount: 1.2 },
      { id: "milk-l", name: "Milk (L)", amount: 7 },
      { id: "eggs-pcs", name: "Eggs (pcs)", amount: 24 },
    ],
    unitsProduced: [{ id: "bread-loaf-pcs", name: "Bread Loaf (pcs)", amount: 20 }],
  },
  {
    id: "recipe-croissant-60pcs",
    name: "Croissant Batch (60 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 9 },
      { id: "butter-kg", name: "Butter (kg)", amount: 4.5 },
      { id: "sugar-kg", name: "Sugar (kg)", amount: 1.2 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.25 },
      { id: "yeast-kg", name: "Yeast (kg)", amount: 0.3 },
      { id: "milk-l", name: "Milk (L)", amount: 4 },
      { id: "eggs-pcs", name: "Eggs (pcs)", amount: 18 },
    ],
    unitsProduced: [{ id: "croissant-pcs", name: "Croissant (pcs)", amount: 60 }],
  },
  {
    id: "recipe-pizza-margherita-24pcs",
    name: "Pizza Margherita Batch (24 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 11 },
      { id: "yeast-kg", name: "Yeast (kg)", amount: 0.5 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.35 },
      { id: "olive-oil-l", name: "Olive Oil (L)", amount: 2.2 },
      { id: "tomato-sauce-l", name: "Tomato Sauce (L)", amount: 8 },
      { id: "mozzarella-kg", name: "Mozzarella (kg)", amount: 6.8 },
    ],
    unitsProduced: [{ id: "pizza-margherita-pcs", name: "Pizza Margherita (pcs)", amount: 24 }],
  },
  {
    id: "recipe-chicken-pasta-box-30pcs",
    name: "Chicken Pasta Box Batch (30 pcs)",
    unitsConsumed: [
      { id: "pasta-kg", name: "Pasta (kg)", amount: 8.5 },
      { id: "chicken-breast-kg", name: "Chicken Breast (kg)", amount: 6 },
      { id: "cream-l", name: "Cream (L)", amount: 4 },
      { id: "cheddar-kg", name: "Cheddar (kg)", amount: 2.6 },
      { id: "onion-kg", name: "Onion (kg)", amount: 1.2 },
      { id: "garlic-kg", name: "Garlic (kg)", amount: 0.35 },
      { id: "mushroom-kg", name: "Mushroom (kg)", amount: 2.4 },
    ],
    unitsProduced: [{ id: "chicken-pasta-box-pcs", name: "Chicken Pasta Box (pcs)", amount: 30 }],
  },
  {
    id: "recipe-choco-cake-slice-40pcs",
    name: "Chocolate Cake Slice Batch (40 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 5.4 },
      { id: "sugar-kg", name: "Sugar (kg)", amount: 4.8 },
      { id: "butter-kg", name: "Butter (kg)", amount: 2.2 },
      { id: "eggs-pcs", name: "Eggs (pcs)", amount: 30 },
      { id: "chocolate-kg", name: "Chocolate (kg)", amount: 3.6 },
      { id: "cocoa-powder-kg", name: "Cocoa Powder (kg)", amount: 1.8 },
      { id: "baking-powder-kg", name: "Baking Powder (kg)", amount: 0.2 },
      { id: "vanilla-extract-l", name: "Vanilla Extract (L)", amount: 0.6 },
      { id: "milk-l", name: "Milk (L)", amount: 3.5 },
    ],
    unitsProduced: [{ id: "choco-cake-slice-pcs", name: "Chocolate Cake Slice (pcs)", amount: 40 }],
  },
  {
    id: "recipe-berry-smoothie-cup-50pcs",
    name: "Berry Smoothie Cup Batch (50 pcs)",
    unitsConsumed: [
      { id: "strawberry-kg", name: "Strawberry (kg)", amount: 8 },
      { id: "blueberry-kg", name: "Blueberry (kg)", amount: 5 },
      { id: "milk-l", name: "Milk (L)", amount: 12 },
      { id: "sugar-kg", name: "Sugar (kg)", amount: 2.4 },
      { id: "vanilla-extract-l", name: "Vanilla Extract (L)", amount: 0.8 },
    ],
    unitsProduced: [{ id: "berry-smoothie-cup-pcs", name: "Berry Smoothie Cup (pcs)", amount: 50 }],
  },
  {
    id: "recipe-garlic-bread-36pcs",
    name: "Garlic Bread Batch (36 pcs)",
    unitsConsumed: [
      { id: "bread-loaf-pcs", name: "Bread Loaf (pcs)", amount: 12 },
      { id: "butter-kg", name: "Butter (kg)", amount: 2.4 },
      { id: "garlic-kg", name: "Garlic (kg)", amount: 0.9 },
      { id: "olive-oil-l", name: "Olive Oil (L)", amount: 0.7 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.12 },
    ],
    unitsProduced: [{ id: "garlic-bread-pcs", name: "Garlic Bread (pcs)", amount: 36 }],
  },
  {
    id: "recipe-beef-rice-bowl-28pcs",
    name: "Beef Rice Bowl Batch (28 pcs)",
    unitsConsumed: [
      { id: "beef-kg", name: "Beef (kg)", amount: 9 },
      { id: "rice-kg", name: "Rice (kg)", amount: 6.5 },
      { id: "onion-kg", name: "Onion (kg)", amount: 1.8 },
      { id: "bell-pepper-kg", name: "Bell Pepper (kg)", amount: 1.5 },
      { id: "garlic-kg", name: "Garlic (kg)", amount: 0.4 },
      { id: "tomato-sauce-l", name: "Tomato Sauce (L)", amount: 2.2 },
      { id: "olive-oil-l", name: "Olive Oil (L)", amount: 1.1 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.2 },
    ],
    unitsProduced: [{ id: "beef-rice-bowl-pcs", name: "Beef Rice Bowl (pcs)", amount: 28 }],
  },
  {
    id: "recipe-pancake-batter-120pcs",
    name: "Pancake Batch (120 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 7.5 },
      { id: "milk-l", name: "Milk (L)", amount: 15 },
      { id: "eggs-pcs", name: "Eggs (pcs)", amount: 72 },
      { id: "sugar-kg", name: "Sugar (kg)", amount: 1.8 },
      { id: "butter-kg", name: "Butter (kg)", amount: 1.2 },
      { id: "vanilla-extract-l", name: "Vanilla Extract (L)", amount: 0.5 },
      { id: "baking-powder-kg", name: "Baking Powder (kg)", amount: 0.35 },
    ],
    unitsProduced: [{ id: "pancake-pcs", name: "Pancake (pcs)", amount: 120 }],
  },
  {
    id: "recipe-double-choco-drink-80cups",
    name: "Double Chocolate Drink Batch (80 cups)",
    unitsConsumed: [
      { id: "milk-l", name: "Milk (L)", amount: 24 },
      { id: "chocolate-kg", name: "Chocolate (kg)", amount: 4.2 },
      { id: "cocoa-powder-kg", name: "Cocoa Powder (kg)", amount: 2.1 },
      { id: "sugar-kg", name: "Sugar (kg)", amount: 3.2 },
      { id: "cream-l", name: "Cream (L)", amount: 6 },
      { id: "vanilla-extract-l", name: "Vanilla Extract (L)", amount: 0.9 },
    ],
    unitsProduced: [{ id: "choco-drink-cup-pcs", name: "Chocolate Drink Cup (pcs)", amount: 80 }],
  },
  {
    id: "recipe-mushroom-pizza-20pcs",
    name: "Mushroom Pizza Batch (20 pcs)",
    unitsConsumed: [
      { id: "flour-kg", name: "Flour (kg)", amount: 9.2 },
      { id: "yeast-kg", name: "Yeast (kg)", amount: 0.42 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.28 },
      { id: "olive-oil-l", name: "Olive Oil (L)", amount: 1.6 },
      { id: "tomato-sauce-l", name: "Tomato Sauce (L)", amount: 6.2 },
      { id: "mozzarella-kg", name: "Mozzarella (kg)", amount: 5.6 },
      { id: "mushroom-kg", name: "Mushroom (kg)", amount: 3.9 },
    ],
    unitsProduced: [{ id: "pizza-margherita-pcs", name: "Pizza Margherita (pcs)", amount: 20 }],
  },
  {
    id: "recipe-cheesy-garlic-pasta-26boxes",
    name: "Cheesy Garlic Pasta Batch (26 boxes)",
    unitsConsumed: [
      { id: "pasta-kg", name: "Pasta (kg)", amount: 7.2 },
      { id: "cheddar-kg", name: "Cheddar (kg)", amount: 3.8 },
      { id: "cream-l", name: "Cream (L)", amount: 3.6 },
      { id: "garlic-kg", name: "Garlic (kg)", amount: 0.55 },
      { id: "butter-kg", name: "Butter (kg)", amount: 1.4 },
      { id: "salt-kg", name: "Salt (kg)", amount: 0.15 },
      { id: "onion-kg", name: "Onion (kg)", amount: 1.1 },
    ],
    unitsProduced: [{ id: "chicken-pasta-box-pcs", name: "Chicken Pasta Box (pcs)", amount: 26 }],
  },
];

export async function initMockInventoryDatabase() {
  const database = createSchemaAsDatabase(inventorySchema);
  for (const unit of INVENTORY_UNITS_MOCK) {
    await database.inventoryUnits.insert(unit);
  }
  for (const recipe of INVENTORY_RECIPES_MOCK) {
    await database.inventoryRecipes.insert(recipe);
  }

  return database;
}
