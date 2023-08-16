// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type {
    AuthenticatedLightningArgs, SubscribeToChannelsChannelClosedEvent, SubscribeToChannelsChannelOpenedEvent,
} from "lightning";
import { subscribeToChannels } from "lightning";

import type { Channel } from "../lightning/getChannels.js";
import { getChannels } from "../lightning/getChannels.js";
import { log } from "../Logger.js";
import { FullRefresherArgs } from "./FullRefresherArgs.js";

export class ChannelsRefresherArgs extends FullRefresherArgs<"channels", Channel> {
    public constructor(args: {
        readonly lndArgs: AuthenticatedLightningArgs;
        readonly delayMilliseconds?: number;
    }) {
        super({ ...args, name: "channels", emitter: subscribeToChannels(args.lndArgs) });
    }

    public override onChanged(listener: () => void) {
        const handler = (e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent) => {
            log(`channel ${e.id}`);
            listener();
        };

        this.emitter.on("channel_opened", handler);
        this.emitter.on("channel_closed", handler);
    }

    protected override async getAllData() {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return await getChannels({ ...this.lndArgs, is_public: true });
    }
}
