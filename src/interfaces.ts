export interface CRDT {
	sync (data?: unknown): unknown | null
	value: unknown
}

export interface CRDTConfig {
	resolver: (protocol: string) => CRDT
	id: string,
	protocol: string
}

export type CRDTResolver = (protocol: string) => CRDT;

export interface CRDTWrapper {
	crdt: CRDT
	protocol: string
}
