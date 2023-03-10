import type { PeerId } from "@libp2p/interface-peer-id";
import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Libp2p } from "@libp2p/interface-libp2p";
import { mockRegistrar, mockConnectionManager, mockNetwork } from "@libp2p/interface-mocks";
import { stubInterface } from "ts-sinon";
import { start } from "@libp2p/interfaces/startable";
import { createRSAPeerId } from "@libp2p/peer-id-factory";
import { mockCRDT } from "@organicdesign/crdt-tests";
import { CRDTSynchronizerComponents, CRDTSynchronizer, createCRDTSynchronizer } from "../src/CRDTSynchronizer";

interface TestCRDTSynchronizerComponents extends CRDTSynchronizerComponents {
	peerId: PeerId
	dial: Libp2p["dial"]
}

const createComponents = async (): Promise<TestCRDTSynchronizerComponents> => {
	const oldComponents = {
		peerId: await createRSAPeerId({ bits: 512 }),
		registrar: mockRegistrar(),
		connectionManager: stubInterface<ConnectionManager>() as ConnectionManager
	};

	oldComponents.connectionManager = mockConnectionManager(oldComponents);

	const components: TestCRDTSynchronizerComponents = {
		peerId: oldComponents.peerId,
		dial: (peerId) => oldComponents.connectionManager.openConnection(peerId),
		handle: (protocol: string, handler) => oldComponents.registrar.handle(protocol, handler),
		unhandle: (protocol: string) => oldComponents.registrar.unhandle(protocol),
		getConnections: () => oldComponents.connectionManager.getConnections()
	};

	await start(...Object.entries(components));

	mockNetwork.addNode(oldComponents);

	return components;
};

let localSynchronizer: CRDTSynchronizer;
let remoteSynchronizer: CRDTSynchronizer;
let localComponents: TestCRDTSynchronizerComponents;
let remoteComponents: TestCRDTSynchronizerComponents;

beforeEach(async () => {
	localComponents = await createComponents();
	localSynchronizer = createCRDTSynchronizer({ autoSync: false })(localComponents);
	remoteComponents = await createComponents();
	remoteSynchronizer = createCRDTSynchronizer({ autoSync: false })(remoteComponents);
});

describe("startable interface", () => {
	it("is not started after creation", async () => {
		expect(localSynchronizer.isStarted()).toBe(false);
	});

	it("starts", async () => {
		await localSynchronizer.start();

		expect(localSynchronizer.isStarted()).toBe(true);
	});

	it("stops", async () => {
		await localSynchronizer.start();
		await localSynchronizer.stop();

		expect(localSynchronizer.isStarted()).toBe(false);
	});
});

describe("crdts", () => {
	beforeEach(async () => {
		await localSynchronizer.start();
	});

	afterEach(async () => {
		await localSynchronizer.stop();
	});

	it("sets and gets crdts", () => {
		const keys = ["test-1", "test-2", "test-3"];

		for (const key of keys) {
			const crdt = mockCRDT();

			localSynchronizer.set(key, crdt);

			expect(localSynchronizer.get(key)).toStrictEqual(crdt);
		}
	});

	it("lists crdt names", () => {
		const keys = ["test-1", "test-2", "test-3"];

		for (const key of keys) {
			localSynchronizer.set(key, mockCRDT());
		}

		expect([...localSynchronizer.keys()]).toStrictEqual(keys);
	});
});

describe("synchronization", () => {
	beforeEach(async () => {
		await localSynchronizer.start();
		await remoteSynchronizer.start();

		await remoteComponents.dial(localComponents.peerId);
	});

	afterEach(async () => {
		await localSynchronizer.stop();
		await remoteSynchronizer.stop();
	});

	it("synchronizes crdts", async () => {
		const crdt1 = mockCRDT();
		const crdt2 = mockCRDT();

		localSynchronizer.set("crdt", crdt1);
		remoteSynchronizer.set("crdt", crdt2);

		await remoteSynchronizer.sync();
		await localSynchronizer.sync();

		expect(crdt1.toValue()).toStrictEqual(crdt2.toValue());
	});
});
