export interface CRDT {
	sync (data?: unknown): unknown | null
	protocol: string
	value: unknown
}

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
