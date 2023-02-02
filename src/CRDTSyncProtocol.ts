/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface SyncMessage {
  id: number
  data: Uint8Array
  request?: boolean
}

export namespace SyncMessage {
  let _codec: Codec<SyncMessage>

  export const codec = (): Codec<SyncMessage> => {
    if (_codec == null) {
      _codec = message<SyncMessage>((obj, w, opts = {}) => {
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

  export const encode = (obj: SyncMessage): Uint8Array => {
    return encodeMessage(obj, SyncMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): SyncMessage => {
    return decodeMessage(buf, SyncMessage.codec())
  }
}
