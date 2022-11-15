export interface CRDT {
	sync (data?: unknown): unknown | null
	protocol: string
	value: unknown
}

export interface CRDTConfig {
	resolver: (protocol: string) => CRDT
	id: string,
	protocol: string
}

export type CRDTResolver = (protocol: string) => CRDT;

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
