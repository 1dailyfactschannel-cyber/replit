// Define globals for Node.js environment
if (typeof global === 'undefined') {
  (globalThis as any).global = globalThis;
}
if (typeof process !== 'undefined') {
  (globalThis as any).process = process;
}
import { Buffer } from 'buffer';
(globalThis as any).Buffer = Buffer;
