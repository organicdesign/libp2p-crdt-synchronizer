export interface CRDT {
	sync (data?: unknown): unknown | null
	//toValue(): unknown
}

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
