export interface CRDT<T=unknown> {
	sync (data?: CRDTSync<T>): CRDTSync<T>
	toValue(): unknown
}

export interface CRDTSync<T=unknown> {
	done: boolean
	data?: T
}

/*
	end-appplications create their own interface for the crdts

	new Libp2pStateReplication(Libp2p, CRDT[])
*/
