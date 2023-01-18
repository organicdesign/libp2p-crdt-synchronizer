import type { PeerId } from "@libp2p/interface-peer-id";
import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import { mockRegistrar, mockConnectionManager, mockNetwork } from "@libp2p/interface-mocks";
import { stubInterface } from "ts-sinon";
import { start } from "@libp2p/interfaces/startable";
import { createRSAPeerId } from "@libp2p/peer-id-factory";
import { CRDTSynchronizerComponents, CRDTSynchronizer, createCRDTSynchronizer } from "../src/CRDTSynchronizer";

const createComponents = async (): Promise<CRDTSynchronizerComponents & { peerId: PeerId }> => {
	const components: CRDTSynchronizerComponents & { peerId: PeerId } = {
		peerId: await createRSAPeerId({ bits: 512 }),
		registrar: mockRegistrar(),
		connectionManager: stubInterface<ConnectionManager>()
	};

	components.connectionManager = mockConnectionManager(components);

	await start(...Object.entries(components));

	mockNetwork.addNode(components);

	return components;
};

const mockCRDT = (() => {
	let i = 0;

	return (): CRDT => {
		i++;

		let state = new Uint8Array([i, i, i]);

		return {
			id: new Uint8Array([i]),

			sync (data): Uint8Array | undefined {
				if (data == null) {
					return state;
				}

				if (data[0] > state[0]) {
					state = data;
				}
			},

			toValue () {
				return state;
			}
		} as CRDT;
	};
})();

let synchronizer: CRDTSynchronizer, components: CRDTSynchronizerComponents & { peerId: PeerId };

beforeEach(async () => {
	components = await createComponents();
	synchronizer = createCRDTSynchronizer({ autoSync: false })(components);
});

describe("startable interface", () => {
	it("is not started after creation", async () => {
		expect(synchronizer.isStarted()).toBe(false);
	});

	it("starts", async () => {
		await synchronizer.start();

		expect(synchronizer.isStarted()).toBe(true);
	});

	it("stops", async () => {
		await synchronizer.start();
		await synchronizer.stop();

		expect(synchronizer.isStarted()).toBe(false);
	});
});

describe("crdts", () => {
	beforeEach(async () => {
		await synchronizer.start();
	});

	afterEach(async () => {
		await synchronizer.stop();
	});

	it("sets and gets crdts", () => {
		const keys = ["test-1", "test-2", "test-3"];

		for (const key of keys) {
			const crdt = mockCRDT();

			synchronizer.setCRDT(key, crdt);

			expect(synchronizer.getCRDT(key)).toStrictEqual(crdt);
		}
	});

	it("lists crdt names", () => {
		const keys = ["test-1", "test-2", "test-3"];

		for (const key of keys) {
			synchronizer.setCRDT(key, mockCRDT());
		}

		expect(synchronizer.CRDTNames).toStrictEqual(keys);
	});
});

describe("synchronization", () => {
	beforeEach(async () => {
		await synchronizer.start();
	});

	afterEach(async () => {
		await synchronizer.stop();
	});

	it("synchronizes crdts", async () => {
		const remote = await createComponents();
		const remoteSynchronizer = createCRDTSynchronizer({ autoSync: false })(remote);
		const crdt1 = mockCRDT();
		const crdt2 = mockCRDT();

		synchronizer.setCRDT("crdt", crdt1);
		remoteSynchronizer.setCRDT("crdt", crdt2);

		await remote.connectionManager.openConnection(components.peerId);

		await remoteSynchronizer.start();

		await remoteSynchronizer.sync();
		await synchronizer.sync();

		expect(crdt1.toValue()).toStrictEqual(crdt2.toValue());
	});
});
