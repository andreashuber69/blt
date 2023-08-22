// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { EventEmitter } from "node:events";
import type {
    AuthenticatedLightningArgs, SubscribeToChannelsChannelClosedEvent, SubscribeToChannelsChannelOpenedEvent,
} from "lightning";
import { subscribeToChannels } from "lightning";

import type { Channel } from "../lightning/getChannels.js";
import { getChannels } from "../lightning/getChannels.js";
import { log } from "../Logger.js";
import { FullRefresher } from "./FullRefresher.js";
import { Refresher } from "./Refresher.js";

interface ChannelsRefresherArgs {
    readonly lndArgs: AuthenticatedLightningArgs;
    readonly delayMilliseconds?: number;
}

export class ChannelsRefresher extends FullRefresher<"channels", Channel> {
    public static async create(args: ChannelsRefresherArgs) {
        return await Refresher.init(new ChannelsRefresher(args));
    }

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return await getChannels({ ...lndArgs, is_public: true });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override onServerChanged(serverEmitter: EventEmitter, listener: () => void) {
        const handler = (e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent) => {
            log(`channel ${e.id}`);
            listener();
        };

        serverEmitter.on("channel_opened", handler);
        serverEmitter.on("channel_closed", handler);
    }

    protected override createServerEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToChannels(lndArgs);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: ChannelsRefresherArgs) {
        super({ ...args, name: "channels" });
    }
}
