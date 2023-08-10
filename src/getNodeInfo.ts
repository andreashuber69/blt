// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import EventEmitter from "node:events";
import type { AuthenticatedLightningArgs } from "lightning";
import { getIdentity } from "lightning";

import type { Channel } from "./Channel.js";
import { ChannelsRefresherArgs } from "./ChannelsRefresherArgs.js";
import { createRefresher } from "./createRefresher.js";
import type { Refresher } from "./createRefresher.js";
import type { Forward } from "./Forward.js";
import { ForwardsRefresherArgs } from "./ForwardsRefresherArgs.js";
import type { Identity } from "./Identity.js";
import type { TimeBoundArgs } from "./PartialRefresherArgs.js";
import type { Payment } from "./Payment.js";
import { PaymentsRefresherArgs } from "./PaymentsRefresherArgs.js";

const connectionLost = "connectionLost";

class NodeInfoImpl implements NodeInfo {
    public constructor(
        private readonly args: AuthenticatedLightningArgs<TimeBoundArgs>,
        public readonly identity: Identity,
        public readonly channels: Refresher<"channels", Channel[]>,
        public readonly forwards: Refresher<"forwards", Forward[]>,
        public readonly payments: Refresher<"payments", Payment[]>,
    ) {}

    public on(eventName: typeof connectionLost, listener: () => void) {
        this.emitter.on(eventName, listener);

        if (this.emitter.listenerCount(connectionLost) === 1) {
            void this.aliveLoop();
        }

        return this;
    }

    public removeAllListeners(eventName?: typeof connectionLost | undefined) {
        this.emitter.removeAllListeners(eventName);
        return this;
    }

    // eslint-disable-next-line unicorn/prefer-event-target
    private readonly emitter = new EventEmitter();

    private async aliveLoop() {
        while (this.emitter.listenerCount(connectionLost) > 0) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await getIdentity(this.args);
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 10_000));
            } catch {
                try {
                    this.emitter.emit(connectionLost);
                } finally {
                    this.channels.removeAllListeners();
                    this.forwards.removeAllListeners();
                    this.payments.removeAllListeners();
                    this.removeAllListeners();
                }
            }
        }
    }
}

type RefresherProperty<Name extends string, Data> = {
    readonly [name in Name]: Refresher<Name, Data>;
};

/**
 * Provides various information about a node.
 * @description All time-bound data (like {@link NodeInfo.forwards}) will be sorted earliest to latest. Apart from
 * being sorted, the data is provided as it came from LND. Further sanitation will be necessary, for example, a forward
 * may refer to a channel that is no longer open and will thus not appear in {@link NodeInfo.channels}.
 */
export interface NodeInfo extends
    RefresherProperty<"channels", Channel[]>,
    RefresherProperty<"forwards", Forward[]>,
    RefresherProperty<"payments", Payment[]> {
    readonly identity: Identity;

    /**
     * Adds the `listener` function to the end of the listeners array for the event named `eventName`.
     * @description Behaves exactly like {@linkcode EventEmitter.on}. The registered listener is called whenever
     * the connection to the node has been lost permanently. All listeners added to {@linkcode NodeInfo.channels},
     * {@linkcode NodeInfo.forwards}, {@linkcode NodeInfo.payments} and {@linkcode NodeInfo.on} will be removed
     * automatically. Client code dependent on being notified about changes should discard this object and create a new
     * one via {@linkcode getNodeInfo}.
     */
    readonly on: (eventName: typeof connectionLost, listener: () => void) => this;

    /**
     * Removes all listeners, or those of the specified `eventName`.
     * @description Behaves exactly like {@link EventEmitter.removeAllListeners}.
     */
    readonly removeAllListeners: (eventName?: typeof connectionLost) => this;
}

/**
 * Gets information about the node.
 * @param args The authenticated LND API object, optionally combined with a number how far back historical data should
 * be retrieved. The default is 14 days.
 */
export const getNodeInfo = async (args: AuthenticatedLightningArgs<Partial<TimeBoundArgs>>): Promise<NodeInfo> => {
    const sanitized = { days: 14, ...args };

    if (typeof sanitized.days !== "number" || sanitized.days <= 0) {
        throw new Error(`args.days is invalid: ${args.days}.`);
    }

    return new NodeInfoImpl(
        sanitized,
        await getIdentity(sanitized),
        await createRefresher(new ChannelsRefresherArgs(sanitized)),
        await createRefresher(new ForwardsRefresherArgs(sanitized)),
        await createRefresher(new PaymentsRefresherArgs(sanitized)),
    );
};
