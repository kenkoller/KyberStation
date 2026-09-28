// ─── In-memory FileSystemDirectoryHandle for SD-card write tests ───
//
// Implements the slice of the File System Access API that CardWriter's
// direct-write path uses: getFileHandle / getDirectoryHandle (with
// `create`), getFile().arrayBuffer()/text(), and createWritable() with
// swap-file semantics (content lands on close()). Files are stored as raw
// bytes so byte-exactness (binary firmware headers, the presets.ini ↔
// presets.tmp identity) can be asserted directly.

export interface MemoryDirectory {
  handle: FileSystemDirectoryHandle;
  files: Map<string, Uint8Array>;
  dirs: Map<string, MemoryDirectory>;
  /** Order in which files were committed (createWritable().close()). */
  writeLog: string[];
}

function notFound(name: string): Error {
  const err = new Error(`NotFoundError: ${name}`);
  err.name = 'NotFoundError';
  return err;
}

function toBytes(data: unknown): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data.slice(0));
  throw new Error(`memoryDirectoryHandle: unsupported write payload ${String(data)}`);
}

export function createMemoryDirectory(
  initialFiles: Record<string, string | Uint8Array> = {},
): MemoryDirectory {
  const dir: MemoryDirectory = {
    handle: undefined as unknown as FileSystemDirectoryHandle,
    files: new Map(),
    dirs: new Map(),
    writeLog: [],
  };
  for (const [name, content] of Object.entries(initialFiles)) {
    dir.files.set(name, toBytes(content));
  }

  const fileHandle = (name: string): FileSystemFileHandle =>
    ({
      kind: 'file',
      name,
      async getFile() {
        const bytes = dir.files.get(name);
        if (!bytes) throw notFound(name);
        const copy = new Uint8Array(bytes);
        return {
          name,
          size: copy.length,
          async arrayBuffer() {
            return copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength);
          },
          async text() {
            return new TextDecoder().decode(copy);
          },
        } as unknown as File;
      },
      async createWritable() {
        const chunks: Uint8Array[] = [];
        return {
          async write(data: unknown) {
            chunks.push(toBytes(data));
          },
          async close() {
            const total = chunks.reduce((n, c) => n + c.length, 0);
            const out = new Uint8Array(total);
            let offset = 0;
            for (const c of chunks) {
              out.set(c, offset);
              offset += c.length;
            }
            dir.files.set(name, out);
            dir.writeLog.push(name);
          },
        } as unknown as FileSystemWritableFileStream;
      },
    }) as unknown as FileSystemFileHandle;

  dir.handle = {
    kind: 'directory',
    name: 'SD',
    async getFileHandle(name: string, opts?: { create?: boolean }) {
      if (!dir.files.has(name)) {
        if (!opts?.create) throw notFound(name);
        dir.files.set(name, new Uint8Array(0));
      }
      return fileHandle(name);
    },
    async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
      let child = dir.dirs.get(name);
      if (!child) {
        if (!opts?.create) throw notFound(name);
        child = createMemoryDirectory();
        dir.dirs.set(name, child);
      }
      return child.handle;
    },
  } as unknown as FileSystemDirectoryHandle;

  return dir;
}

/**
 * Build a preset file the way ProffieOS 7.12's `BufferedFileWriter` does
 * (`common/file_reader.h`): two identical 16-byte `SafeFileHeader` records
 * `{ magic 0xFF1E5AFE, checksum, iteration, length }` (little-endian), the
 * install_time string at byte 32, zero padding to byte 512, the text
 * payload, then zero padding to 256 KiB. The checksum is `CheckSummer`
 * (`sum = sum * 997 + byte`) over the payload. Layout confirmed byte-for-byte
 * against the 89sabers factory SD card's presets.ini / presets.tmp.
 */
export function firmwareWrittenPresetFile(
  payloadText: string,
  installTime: string,
  iteration: number,
): Uint8Array {
  const payload = new TextEncoder().encode(payloadText);
  const out = new Uint8Array(256 * 1024);
  const view = new DataView(out.buffer);
  let checksum = 0;
  for (const byte of payload) checksum = (Math.imul(checksum, 997) + byte) >>> 0;
  for (const base of [0, 16]) {
    view.setUint32(base + 0, 0xff1e5afe, true);
    view.setUint32(base + 4, checksum, true);
    view.setUint32(base + 8, iteration, true);
    view.setUint32(base + 12, payload.length, true);
  }
  out.set(new TextEncoder().encode(installTime), 32);
  out.set(payload, 512);
  return out;
}
