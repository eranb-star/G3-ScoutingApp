/** One saved form must never clear another form's unfinished work. */
export class BuildDraftRegistry {
 private entries = new Map<string, () => void>();
 mark(id: string, discard: () => void = () => {}) { this.entries.set(id, discard); }
 saved(id: string) { this.entries.delete(id); }
 get dirty() { return this.entries.size > 0; }
 discard() {
  const callbacks = [...this.entries.values()];
  this.entries.clear();
  callbacks.forEach(discard => discard());
 }
}
