import type { PeerId } from "@libp2p/interface-peer-id";
import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import { mockRegistrar, mockConnectionManager, mockNetwork } from "@libp2p/interface-mocks";
import { stubInterface } from "ts-sinon";
import { start } from "@libp2p/interfaces/startable";
import { createRSAPeerId } from "@libp2p/peer-id-factory";
import { CRDTSynchronizerComponents, CRDTSynchronizer, createCRDTSynchronizer } from "../src/CRDTSynchronizer";

export const createComponents = async (): Promise<CRDTSynchronizerComponents & { peerId: PeerId }> => {
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
