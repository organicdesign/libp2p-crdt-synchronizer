/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */

import { encodeMessage, decodeMessage, message } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Codec } from 'protons-runtime'

export interface CRDTSyncMessage {
  name: string
  data: Uint8Array
  id: number
  request?: boolean
}

export namespace CRDTSyncMessage {
  let _codec: Codec<CRDTSyncMessage>

  export const codec = (): Codec<CRDTSyncMessage> => {
    if (_codec == null) {
      _codec = message<CRDTSyncMessage>((obj, w, opts = {}) => {
        if (opts.lengthDelimited !== false) {
          w.fork()
        }

        if (opts.writeDefaults === true || obj.name !== '') {
          w.uint32(10)
          w.string(obj.name)
        }

        if (opts.writeDefaults === true || (obj.data != null && obj.data.byteLength > 0)) {
          w.uint32(18)
          w.bytes(obj.data)
        }

        if (opts.writeDefaults === true || obj.id !== 0) {
          w.uint32(24)
          w.uint32(obj.id)
        }

        if (obj.request != null) {
          w.uint32(32)
          w.bool(obj.request)
        }

        if (opts.lengthDelimited !== false) {
          w.ldelim()
        }
      }, (reader, length) => {
        const obj: any = {
          name: '',
          data: new Uint8Array(0),
          id: 0
        }

        const end = length == null ? reader.len : reader.pos + length

        while (reader.pos < end) {
          const tag = reader.uint32()

          switch (tag >>> 3) {
            case 1:
              obj.name = reader.string()
              break
            case 2:
              obj.data = reader.bytes()
              break
            case 3:
              obj.id = reader.uint32()
              break
            case 4:
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

  export const encode = (obj: CRDTSyncMessage): Uint8Array => {
    return encodeMessage(obj, CRDTSyncMessage.codec())
  }

  export const decode = (buf: Uint8Array | Uint8ArrayList): CRDTSyncMessage => {
    return decodeMessage(buf, CRDTSyncMessage.codec())
  }
}
