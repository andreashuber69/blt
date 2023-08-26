// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type {
    AuthenticatedLightningArgs, SubscribeToChannelsChannelClosedEvent, SubscribeToChannelsChannelOpenedEvent,
} from "lightning";
import { subscribeToChannels } from "lightning";

import type { Channel } from "../lightning/getChannels.js";
import { getChannels } from "../lightning/getChannels.js";
import { log } from "../Logger.js";
import { FullRefresher } from "./FullRefresher.js";
import type { Emitters, IRefresher } from "./Refresher.js";

type ChannelsEmitters = Emitters<"channels">;

export interface IChannelsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;
}

export class ChannelsRefresher extends FullRefresher<"channels", Channel, ChannelsEmitters> {
    /**
     * Creates a new object implementing {@linkcode IRefresher} for public channels.
     * @param args See {@linkcode IChannelsRefresherArgs}.
     */
    public static async create(args: IChannelsRefresherArgs) {
        return await this.init(new ChannelsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return await getChannels({ ...lndArgs, is_public: true });
    }

    protected override onServerChanged({ channels }: ChannelsEmitters, listener: () => void) {
        const handler = (e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent) => {
            log(`channel ${e.id}`);
            listener();
        };

        channels.on("channel_opened", handler);
        channels.on("channel_closed", handler);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { channels: subscribeToChannels(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IChannelsRefresherArgs) {
        super({ ...args, name: "channels" });
    }
}
