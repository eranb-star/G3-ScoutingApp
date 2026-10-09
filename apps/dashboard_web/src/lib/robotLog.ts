/** WPILOG v1: https://github.com/wpilibsuite/allwpilib/blob/v2026.2.2/wpiutil/doc/datalog.adoc
 * Parse locally; never infer repository identity, units or wall-clock time from filenames.
 */
export type LogValue = number | boolean | string | (number | boolean | string)[];
export type LogSample = { time: number; value: LogValue };
export type LogChannel = { id: number; generation: number; name: string; type: string; metadata: string; samples: LogSample[]; records: number; unsupported: number };
export type RobotLog = { channels: LogChannel[]; records: number; start: number; end: number; warnings: string[]; extraHeader: string; complete: boolean };
const decoder = new TextDecoder('utf-8', { fatal: true });
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_RECORDS = 500000;
const MAX_CHANNELS = 4096;
const MAX_VALUES = 2000000;

export function parseRobotLog(buffer: ArrayBuffer): RobotLog {
  if (buffer.byteLength > MAX_BYTES) throw Error('LOG_TOO_LARGE');
  const bytes = new Uint8Array(buffer), view = new DataView(buffer);
  if (bytes.length < 12 || decoder.decode(bytes.subarray(0, 6)) !== 'WPILOG') throw Error('INVALID_LOG_HEADER');
  if (view.getUint16(6, true) !== 0x0100) throw Error('UNSUPPORTED_LOG_VERSION');
  const extraSize = view.getUint32(8, true);
  if (extraSize > bytes.length - 12) throw Error('INCOMPLETE_LOG_HEADER');
  const result: RobotLog = { channels: [], records: 0, start: Infinity, end: -Infinity, warnings: [], extraHeader: decoder.decode(bytes.subarray(12, 12 + extraSize)), complete: true };
  const active = new Map<number, LogChannel>();
  let offset = 12 + extraSize, values = 0;
  const warn = (message: string) => { result.complete = false; if (!result.warnings.includes(message)) result.warnings.push(message); };
  const uint = (position: number, size: number) => {
    let value = 0n;
    for (let i = size - 1; i >= 0; i--) value = (value << 8n) | BigInt(bytes[position + i]);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('UNSAFE_LOG_TIMESTAMP');
    return Number(value);
  };
  while (offset < bytes.length) {
    if (result.records >= MAX_RECORDS) { warn('RECORD_LIMIT'); break; }
    const flags = bytes[offset], entrySize = (flags & 3) + 1, sizeSize = ((flags >> 2) & 3) + 1, timeSize = ((flags >> 4) & 7) + 1;
    const headerSize = 1 + entrySize + sizeSize + timeSize;
    if (flags & 128) { warn('INVALID_RECORD_HEADER'); break; }
    if (offset + headerSize > bytes.length) { warn('TRUNCATED_TAIL'); break; }
    const id = uint(offset + 1, entrySize), size = uint(offset + 1 + entrySize, sizeSize);
    const time = uint(offset + 1 + entrySize + sizeSize, timeSize) / 1e6;
    offset += headerSize;
    if (size > bytes.length - offset) { warn('TRUNCATED_TAIL'); break; }
    const payload = new DataView(buffer, offset, size), data = bytes.subarray(offset, offset + size);
    offset += size; result.records++;
    result.start = Math.min(result.start, time); result.end = Math.max(result.end, time);
    try {
      let cursor = 0;
      const str = () => {
        if (cursor + 4 > size) throw Error('MALFORMED_RECORD');
        const length = payload.getUint32(cursor, true); cursor += 4;
        if (length > size - cursor) throw Error('MALFORMED_RECORD');
        const value = decoder.decode(data.subarray(cursor, cursor + length)); cursor += length; return value;
      };
      if (id === 0) {
        if (size < 5) throw Error('MALFORMED_CONTROL');
        const action = data[0], entry = payload.getUint32(1, true); cursor = 5;
        if (!entry) throw Error('MALFORMED_CONTROL');
        if (action === 0) {
          const name = str(), type = str(), metadata = str();
          if (cursor !== size || active.has(entry)) throw Error('INVALID_ENTRY_LIFECYCLE');
          if (result.channels.length >= MAX_CHANNELS) { warn('CHANNEL_LIMIT'); break; }
          const channel: LogChannel = { id: entry, generation: result.channels.length, name, type, metadata, samples: [], records: 0, unsupported: 0 };
          active.set(entry, channel); result.channels.push(channel);
        } else if (action === 1) {
          if (size !== 5 || !active.delete(entry)) throw Error('INVALID_ENTRY_LIFECYCLE');
        } else if (action === 2) {
          const channel = active.get(entry), metadata = str();
          if (!channel || cursor !== size) throw Error('INVALID_ENTRY_LIFECYCLE');
          channel.metadata = metadata;
        } else throw Error('UNKNOWN_CONTROL');
        continue;
      }
      const channel = active.get(id);
      if (!channel) throw Error('UNKNOWN_ENTRY');
      channel.records++;
      const scalar = (type: string, at: number): number | boolean | string => {
        switch (type) {
          case 'boolean': if (data[at] > 1) throw Error('INVALID_BOOLEAN'); return data[at] === 1;
          case 'float': return payload.getFloat32(at, true);
          case 'double': return payload.getFloat64(at, true);
          case 'int64': {
            const n = payload.getBigInt64(at, true);
            return n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(Number.MIN_SAFE_INTEGER) ? n.toString() : Number(n);
          }
          default: throw Error('UNSUPPORTED_TYPE');
        }
      };
      const widths: Record<string, number> = { boolean: 1, float: 4, double: 8, int64: 8 };
      let value: LogValue;
      if (channel.type === 'string') value = decoder.decode(data);
      else if (channel.type === 'string[]') {
        if (size < 4) throw Error('MALFORMED_RECORD');
        const count = payload.getUint32(0, true); cursor = 4;
        if (count > (size - 4) / 4 || count > 10000) throw Error('ARRAY_LIMIT');
        value = Array.from({ length: count }, str);
        if (cursor !== size) throw Error('MALFORMED_RECORD');
      } else {
        const array = channel.type.endsWith('[]'), type = array ? channel.type.slice(0, -2) : channel.type, width = widths[type];
        if (!width) { channel.unsupported++; continue; }
        if ((!array && size !== width) || size % width) throw Error('MALFORMED_RECORD');
        if (size / width > 10000) throw Error('ARRAY_LIMIT');
        value = array ? Array.from({ length: size / width }, (_, i) => scalar(type, i * width)) : scalar(type, 0);
      }
      values += Array.isArray(value) ? value.length : 1;
      if (values > MAX_VALUES) { warn('VALUE_LIMIT'); break; }
      channel.samples.push({ time, value });
    } catch (error) { warn(error instanceof Error ? error.message : 'MALFORMED_RECORD'); }
  }
  for (const channel of result.channels) channel.samples.sort((a, b) => a.time - b.time);
  if (!Number.isFinite(result.start)) result.start = result.end = 0;
  return result;
}

export function numericLogSummary(channel: LogChannel) {
  let min = Infinity, max = -Infinity, sum = 0, count = 0;
  for (const sample of channel.samples) if (typeof sample.value === 'number' && Number.isFinite(sample.value)) {
    min = Math.min(min, sample.value); max = Math.max(max, sample.value); sum += sample.value; count++;
  }
  return count ? { min, max, mean: sum / count, count } : null;
}
