import equipmentJson from "../generated/equipment.json";
import type { EquipmentDataset } from "../types/equipment";

export const equipment = equipmentJson as unknown as EquipmentDataset;
