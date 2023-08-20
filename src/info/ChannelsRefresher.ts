// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type {
    AuthenticatedLightningArgs, SubscribeToChannelsChannelClosedEvent, SubscribeToChannelsChannelOpenedEvent,
} from "lightning";
import { subscribeToChannels } from "lightning";

import type { Channel } from "../lightning/getChannels.js";
import { getChannels } from "../lightning/getChannels.js";
import { log } from "../Logger.js";
import { FullRefresher } from "./FullRefresher.js";

export class ChannelsRefresher extends FullRefresher<"channels", Channel> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
    }) {
        super({ ...args, name: "channels" });
    }

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return await getChannels({ ...lndArgs, is_public: true });
    }

    protected override onServerChanged(listener: () => void) {
        const handler = (e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent) => {
            log(`channel ${e.id}`);
            listener();
        };

        this.emitter.on("channel_opened", handler);
        this.emitter.on("channel_closed", handler);
    }

    protected override createEmitter(lndArgs: AuthenticatedLightningArgs) {
        return subscribeToChannels(lndArgs);
    }
}
