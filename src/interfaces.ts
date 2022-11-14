export interface CRDT {
	serialize(): unknown
	merge(data: unknown): void,
	toValue(): unknown
}

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
