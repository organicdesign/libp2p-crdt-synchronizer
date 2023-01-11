import type { Uint8ArrayList } from 'uint8arraylist';
import type { Codec } from 'protons-runtime';
export interface CRDTSyncMessage {
    name: string;
    data: Uint8Array;
    id: number;
    request?: boolean;
}
export declare namespace CRDTSyncMessage {
    const codec: () => Codec<CRDTSyncMessage>;
    const encode: (obj: CRDTSyncMessage) => Uint8Array;
    const decode: (buf: Uint8Array | Uint8ArrayList) => CRDTSyncMessage;
}
