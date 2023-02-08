/* eslint-disable import/export */
/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { encodeMessage, decodeMessage, message } from 'protons-runtime';
export var SyncMessage;
(function (SyncMessage) {
    let _codec;
    SyncMessage.codec = () => {
        if (_codec == null) {
            _codec = message((obj, w, opts = {}) => {
                if (opts.lengthDelimited !== false) {
                    w.fork();
                }
                if (opts.writeDefaults === true || obj.id !== 0) {
                    w.uint32(8);
                    w.uint32(obj.id);
                }
                if (opts.writeDefaults === true || (obj.data != null && obj.data.byteLength > 0)) {
                    w.uint32(18);
                    w.bytes(obj.data);
                }
                if (obj.request != null) {
                    w.uint32(24);
                    w.bool(obj.request);
                }
                if (opts.lengthDelimited !== false) {
                    w.ldelim();
                }
            }, (reader, length) => {
                const obj = {
                    id: 0,
                    data: new Uint8Array(0)
                };
                const end = length == null ? reader.len : reader.pos + length;
                while (reader.pos < end) {
                    const tag = reader.uint32();
                    switch (tag >>> 3) {
                        case 1:
                            obj.id = reader.uint32();
                            break;
                        case 2:
                            obj.data = reader.bytes();
                            break;
                        case 3:
                            obj.request = reader.bool();
                            break;
                        default:
                            reader.skipType(tag & 7);
                            break;
                    }
                }
                return obj;
            });
        }
        return _codec;
    };
    SyncMessage.encode = (obj) => {
        return encodeMessage(obj, SyncMessage.codec());
    };
    SyncMessage.decode = (buf) => {
        return decodeMessage(buf, SyncMessage.codec());
    };
})(SyncMessage || (SyncMessage = {}));
