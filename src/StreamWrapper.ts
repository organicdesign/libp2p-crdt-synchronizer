import * as lp from "it-length-prefixed";
import { pushable } from "it-pushable";
import { pipe } from "it-pipe";
import type { Stream } from "@libp2p/interface-connection";
import { pair } from "it-pair";

export class StreamWrapper {
	private writer = pushable<Uint8Array>({ objectMode: true });
	private pair = pair();

	public reader = this.pair.source;

	constructor(stream: Stream) {
		pipe(
			this.writer,
			lp.encode(),
			stream
		);

		pipe(
			stream,
			lp.decode(),
			this.pair.sink
		);
	}

	write (data: Uint8Array) {
		this.writer.push(data);
	}

	close () {
		this.writer.end();
	}
}
