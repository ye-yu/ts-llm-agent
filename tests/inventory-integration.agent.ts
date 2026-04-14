import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { Agent, BaseAgent, Description, JsonSchemaType, ParamName, Tool } from "../src/agent.ts";
import { InventoryRecipe, InventoryUnit } from "./inventory-integration.schema.ts";
import { InventoryService } from "./inventory-integration.service.ts";
const schemas = validationMetadatasToSchemas();

@Agent()
@JsonSchemaType("InventoryUnit", schemas.InventoryUnit)
@JsonSchemaType("InventoryRecipe", schemas.InventoryRecipe)
@JsonSchemaType("InventoryChange", schemas.InventoryChange)
export class InventoryAgent extends BaseAgent {
  service: InventoryService;

  constructor(service: InventoryService) {
    super();
    this.service = service;
  }

  @Tool()
  @Description("increments the stock with the given units, and records the event with the remark.")
  async inventoryStockIn(
    @ParamName("remark") remark: string,
    @ParamName("units", InventoryUnit) units: InventoryUnit[],
  ): Promise<void> {
    await this.service.inventoryStockIn(remark, units);
  }

  @Tool()
  @Description("decrements the stock with the given units, and records the event with the remark.")
  async inventoryStockOut(
    @ParamName("remark") remark: string,
    @ParamName("units", InventoryUnit) units: InventoryUnit[],
  ): Promise<void> {
    await this.service.inventoryStockOut(remark, units);
  }

  @Tool()
  @Description("performs a production according to the given recipe, which includes both stock-in and stock-out.")
  async inventoryProduction(@ParamName("recipe") recipe: InventoryRecipe): Promise<void> {
    await this.service.inventoryProduction(recipe);
  }

  @Tool()
  @Description('performs a sale by calling inventoryStockOut with the remark "sale".')
  async inventorySale(@ParamName("units", InventoryUnit) units: InventoryUnit[]): Promise<void> {
    await this.service.inventorySale(units);
  }

  @Tool()
  @Description('returns a tabulation of the recipes in the format "Recipe Name: Units Consumed -> Units Produced".')
  async inventoryTabulateRecipes(@ParamName("start") start: number, @ParamName("end") end: number): Promise<string[]> {
    return this.service.inventoryTabulateRecipes(start, end);
  }

  @Tool()
  @Description('returns a tabulation of the current inventory units in the format "Unit Name: Amount".')
  async inventoryTabulateUnits(@ParamName("start") start: number, @ParamName("end") end: number): Promise<string[]> {
    return this.service.inventoryTabulateUnits(start, end);
  }

  @Tool()
  @Description(
    'returns a tabulation of the inventory change history, with each entry in the format "Timestamp - Event: Remark - Units Changed".',
  )
  async inventoryTabulateHistory(@ParamName("start") start: number, @ParamName("end") end: number): Promise<string[]> {
    return this.service.inventoryTabulateHistory(start, end);
  }

  @Tool()
  @Description("returns a combined tabulation of the current inventory units and the inventory change history.")
  async inventoryTabulate(@ParamName("start") start: number, @ParamName("end") end: number): Promise<string[]> {
    return this.service.inventoryTabulate(start, end);
  }
}
