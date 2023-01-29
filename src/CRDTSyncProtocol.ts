/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { enumeration, encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export enum MessageType {
  SELECT_CRDT = 'SELECT_CRDT',
  SELECT_PROTOCOL = 'SELECT_PROTOCOL',
  SELECT_RESPONSE = 'SELECT_RESPONSE',
  SYNC = 'SYNC',
  SYNC_RESPONSE = 'SYNC_RESPONSE'
}

enum __MessageTypeValues {
  SELECT_CRDT = 0,
  SELECT_PROTOCOL = 1,
  SELECT_RESPONSE = 2,
  SYNC = 3,
  SYNC_RESPONSE = 4
}

export namespace MessageType {
  export const codec = (): Codec<MessageType> => {
    return enumeration<MessageType>(__MessageTypeValues)
  }
}
export interface SyncMessage {
  type: MessageType
  id: number
  sync?: Uint8Array
  select?: string
  accept?: boolean
}

export namespace SyncMessage {
  let _codec: Codec<SyncMessage>

  export const codec = (): Codec<SyncMessage> => {
    if (_codec == null) {
      _codec = message<SyncMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || (obj.type != null && __MessageTypeValues[obj.type] !== 0)) {
          w.uint32(8)
          MessageType.codec().encode(obj.type, w)
        }

        if (opts.writeDefaults === true || obj.id !== 0) {
          w.uint32(16)
          w.uint32(obj.id)
        }

        if (obj.sync != null) {
          w.uint32(26)
          w.bytes(obj.sync)
        }

        if (obj.select != null) {
          w.uint32(34)
          w.string(obj.select)
        }

        if (obj.accept != null) {
          w.uint32(40)
          w.bool(obj.accept)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          type: MessageType.SELECT_CRDT,
          id: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = MessageType.codec().decode(reader)
              break
            case 2:
              obj.id = reader.uint32()
              break
            case 3:
              obj.sync = reader.bytes()
              break
            case 4:
              obj.select = reader.string()
              break
            case 5:
              obj.accept = reader.bool()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: SyncMessage): Uint8Array => {
    return encodeMessage(obj, SyncMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): SyncMessage => {
    return decodeMessage(buf, SyncMessage.codec())
  }
}

export enum StatelessMessageType {
  SELECT = 'SELECT',
  SELECT_RESPONSE = 'SELECT_RESPONSE',
  SYNC = 'SYNC',
  SYNC_RESPONSE = 'SYNC_RESPONSE'
}

enum __StatelessMessageTypeValues {
  SELECT = 0,
  SELECT_RESPONSE = 1,
  SYNC = 2,
  SYNC_RESPONSE = 3
}

export namespace StatelessMessageType {
  export const codec = (): Codec<StatelessMessageType> => {
    return enumeration<StatelessMessageType>(__StatelessMessageTypeValues)
  }
}
export interface StatelessSyncMessage {
  type: StatelessMessageType
  sync?: Uint8Array
  crdt?: string
  protocol?: string
  accept?: boolean
}

export namespace StatelessSyncMessage {
  let _codec: Codec<StatelessSyncMessage>

  export const codec = (): Codec<StatelessSyncMessage> => {
    if (_codec == null) {
      _codec = message<StatelessSyncMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || (obj.type != null && __StatelessMessageTypeValues[obj.type] !== 0)) {
          w.uint32(8)
          StatelessMessageType.codec().encode(obj.type, w)
        }

        if (obj.sync != null) {
          w.uint32(18)
          w.bytes(obj.sync)
        }

        if (obj.crdt != null) {
          w.uint32(26)
          w.string(obj.crdt)
        }

        if (obj.protocol != null) {
          w.uint32(34)
          w.string(obj.protocol)
        }

        if (obj.accept != null) {
          w.uint32(40)
          w.bool(obj.accept)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          type: StatelessMessageType.SELECT
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.type = StatelessMessageType.codec().decode(reader)
              break
            case 2:
              obj.sync = reader.bytes()
              break
            case 3:
              obj.crdt = reader.string()
              break
            case 4:
              obj.protocol = reader.string()
              break
            case 5:
              obj.accept = reader.bool()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: StatelessSyncMessage): Uint8Array => {
    return encodeMessage(obj, StatelessSyncMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): StatelessSyncMessage => {
    return decodeMessage(buf, StatelessSyncMessage.codec())
  }
}

export interface SyncMessageWrapper {
  id: number
  data: Uint8Array
  request?: boolean
}

export namespace SyncMessageWrapper {
  let _codec: Codec<SyncMessageWrapper>

  export const codec = (): Codec<SyncMessageWrapper> => {
    if (_codec == null) {
      _codec = message<SyncMessageWrapper>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || obj.id !== 0) {
          w.uint32(8)
          w.uint32(obj.id)
        }

        if (opts.writeDefaults === true || (obj.data != null && obj.data.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (obj.request != null) {
          w.uint32(24)
          w.bool(obj.request)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          id: 0,
          data: new Uint8Array(0)
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.id = reader.uint32()
              break
            case 2:
              obj.data = reader.bytes()
              break
            case 3:
              obj.request = reader.bool()
              break
            default:
              reader.skipType(tag & 7)
              break
          }
        }

        return obj
      })
    }

    return _codec
  }

  export const encode = (obj: SyncMessageWrapper): Uint8Array => {
    return encodeMessage(obj, SyncMessageWrapper.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): SyncMessageWrapper => {
    return decodeMessage(buf, SyncMessageWrapper.codec())
  }
}
