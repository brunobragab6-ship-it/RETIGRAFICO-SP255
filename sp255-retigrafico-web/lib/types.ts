export type LocationType = "FRENTE" | "DISPOSITIVO" | "REMODELACAO" | "OAE";
export type Direction = "PN" | "PS" | null;
export interface Location { type:LocationType; code:string; name:string; km_start?:number; km_end?:number; km_anchor?:number; lot?:string; section?:string; direction?:Direction; }
export interface ActivityCatalogItem { id:string; group:string; subgroup:string; code:string; name:string; retigraph_name:string; unit:string; companies:string[]; segments:string[]; active:boolean; }
export interface ActivityAlias { alias:string; activity_id:string; source:string; confidence:number; }
export interface Execution {
  id:string; date:string; measurement:string; activity_raw:string; activity_id?:string|null; activity_name?:string|null;
  km_start_raw?:string|number|null; km_end_raw?:string|number|null; km_start_m?:number|null; km_end_m?:number|null; km_min_m?:number|null; km_max_m?:number|null;
  original_orientation?:"ASC"|"DESC"|"POINT"; ramo_local?:string|null; front?:string|null; direction?:Direction|string|null; quantity?:number|string|null; unit?:string|null;
  notes?:string|null; serial_kartado?:string|null; rdo?:string|null; source?:string|null; status?:string|null; nature?:string|null; class?:string|null; company?:string|null; team?:string|null;
  location_type?:LocationType|null; location_code?:string|null; classification_status?:"OK"|"CONFLICT"|"NO_FRONT"|"REVIEW"; mapping_status?:"MAPPED"|"PENDING"; mapping_reason?:string|null;
  memory?:Record<string,number|string|null>;
}
export interface ImportPreview { executions:Execution[]; pendingMappings:Execution[]; conflicts:Execution[]; duplicates:Execution[]; sourceName:string; }
