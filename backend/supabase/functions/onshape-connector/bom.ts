/** Structural import only. No geometry limits, stock matching or manufacturing approval. */
type RecordValue = Record<string, any>;
export type BomRow = {
  key: string; name: string; documentId: string; elementId: string;
  microversion: string; configuration: string; partId: string;
  quantity: number; paths: string[][];
};
export type BomIssue = {code: string; path: string[]};
export type StructuralBom = {
  schemaVersion: 1; coverage: 'resolved' | 'incomplete' | 'unsupported';
  rows: BomRow[]; issues: BomIssue[]; inspectedInstances: number;
  excludedInstances: number; releaseEligible: false;
};
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const config = (value: RecordValue): string => text(value.fullConfiguration ?? value.configuration);
const assemblyKey = (value: RecordValue): string => JSON.stringify([
  text(value.documentId), text(value.documentMicroversion), text(value.elementId), config(value),
]);

export function structuralBom(evidence: unknown, elementType: string): StructuralBom {
  const result: StructuralBom = {schemaVersion: 1, coverage: 'incomplete', rows: [], issues: [],
    inspectedInstances: 0, excludedInstances: 0, releaseEligible: false};
  const issue = (code: string, path: string[] = []) => { result.issues.push({code, path}); };
  if (elementType !== 'ASSEMBLY') {
    result.coverage = 'unsupported'; issue('ASSEMBLY_REQUIRED'); return result;
  }
  const assembly = (evidence as RecordValue)?.assembly;
  if (!assembly?.rootAssembly || !Array.isArray(assembly.rootAssembly.instances)) {
    issue('ASSEMBLY_UNAVAILABLE'); return result;
  }
  const definitions = new Map<string, RecordValue>();
  for (const sub of assembly.subAssemblies ?? []) {
    const key = assemblyKey(sub);
    if (definitions.has(key)) issue('DUPLICATE_ASSEMBLY_DEFINITION');
    else definitions.set(key, sub);
  }
  // Suppression can be recorded on occurrences as well as instance definitions.
  const suppressed = new Set<string>();
  for (const occurrence of assembly.rootAssembly.occurrences ?? []) {
    if (occurrence.suppressed === true && Array.isArray(occurrence.path)) {
      suppressed.add(JSON.stringify(occurrence.path));
    }
  }
  const rows = new Map<string, BomRow>();
  let stopped = false;
  function walk(definition: RecordValue, parent: string[], ancestors: Set<string>) {
    if (stopped) return;
    if (parent.length > 64) { issue('DEPTH_LIMIT', parent); return; }
    if (!Array.isArray(definition.instances)) { issue('MISSING_INSTANCES', parent); return; }
    const seen = new Set<string>();
    for (const instance of definition.instances) {
      if (stopped) return;
      if (++result.inspectedInstances > 100000) {
        stopped = true; issue('STRUCTURE_LIMIT', parent); return;
      }
      const id = text(instance?.id);
      if (!id || seen.has(id)) { issue('INVALID_INSTANCE_ID', parent); continue; }
      seen.add(id);
      const path = [...parent, id];
      if (instance.suppressed === true || suppressed.has(JSON.stringify(path))) {
        result.excludedInstances++; continue;
      }
      if (instance.type === 'Assembly') {
        const key = assemblyKey(instance);
        const child = definitions.get(key);
        if (!child) { issue('UNRESOLVED_ASSEMBLY', path); continue; }
        if (ancestors.has(key)) { issue('ASSEMBLY_CYCLE', path); continue; }
        walk(child, path, new Set([...ancestors, key]));
      } else if (instance.type === 'Part') {
        const documentId = text(instance.documentId), elementId = text(instance.elementId);
        const microversion = text(instance.documentMicroversion), partId = text(instance.partId);
        if (!documentId || !elementId || !microversion || !partId) {
          issue('MISSING_PART_IDENTITY', path); continue;
        }
        const configuration = config(instance);
        const key = JSON.stringify([documentId, microversion, elementId, configuration, partId]);
        const row = rows.get(key) ?? {key, name: text(instance.name) || partId,
          documentId, elementId, microversion, partId, configuration, quantity: 0, paths: []};
        row.quantity++; row.paths.push(path); rows.set(key, row);
      } else {
        // Unknown instance types may be relevant: never silently declare full coverage.
        issue('UNSUPPORTED_INSTANCE', path);
      }
    }
  }
  walk(assembly.rootAssembly, [], new Set([assemblyKey(assembly.rootAssembly)]));
  result.rows = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
  result.coverage = result.issues.length ? 'incomplete' : 'resolved';
  return result;
}
