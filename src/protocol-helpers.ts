import { SyncMessage, MessageType } from "./CRDTSyncProtocol.js";

export const isSync = (message: SyncMessage): boolean => [
	MessageType.SYNC,
	MessageType.SYNC_RESPONSE
].includes(message.type);

export const isSelect = (message: SyncMessage): boolean => [
	MessageType.SELECT_PROTOCOL,
	MessageType.SELECT_RESPONSE,
	MessageType.SELECT_CRDT
].includes(message.type);

export const isResponse = (message: SyncMessage): boolean => [
	MessageType.SELECT_RESPONSE,
	MessageType.SYNC_RESPONSE
].includes(message.type);

export const isRequest = (message: SyncMessage): boolean => !isResponse(message);
