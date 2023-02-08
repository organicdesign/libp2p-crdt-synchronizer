import type { Uint8ArrayList } from 'uint8arraylist';
import type { Codec } from 'protons-runtime';
export interface SyncMessage {
    id: number;
    data: Uint8Array;
    request?: boolean;
}
export declare namespace SyncMessage {
    const codec: () => Codec<SyncMessage>;
    const encode: (obj: SyncMessage) => Uint8Array;
    const decode: (buf: Uint8Array | Uint8ArrayList) => SyncMessage;
}
