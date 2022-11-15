export interface CRDT {
	sync (data?: unknown): unknown | null
	protocol: string
	value: unknown
}

export interface CRDTConfig {
	resolver: (protocol: string) => CRDT
	id: string
}

export type CRDTConstuctor = (config?: CRDTConfig) => CRDT;

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
