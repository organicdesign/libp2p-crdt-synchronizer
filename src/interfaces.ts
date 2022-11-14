export interface CRDT {
	serialize(): unknown
	merge(data: unknown): void,
	toValue(): unknown
}

export interface NamedCRDT {
	name: string,
	crdt: CRDT
}

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
