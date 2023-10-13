// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs } from "lightning";
import { subscribeToChannels } from "lightning";

import type { ClosedChannel } from "../lightning/getClosedChannels.js";
import { getClosedChannels } from "../lightning/getClosedChannels.js";
import { FullRefresher } from "./FullRefresher.js";
import type { Emitters, IRefresher } from "./Refresher.js";

type ClosedChannelsEmitters = Emitters<"channels">;

export interface IClosedChannelsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;
}

export type ClosedChannelsElement = ClosedChannel;

/** Implements {@linkcode IRefresher} for closed channels. */
export class ClosedChannelsRefresher extends
    FullRefresher<"closedChannels", ClosedChannelsElement, ClosedChannelsEmitters> {
    /**
     * Creates a new object implementing {@linkcode IRefresher} for closed channels.
     * @param args See {@linkcode IClosedChannelsRefresherArgs}.
     */
    public static async create(args: IClosedChannelsRefresherArgs) {
        return await this.init(new ClosedChannelsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        return await getClosedChannels({ ...lndArgs });
    }

    protected override onServerChanged({ channels }: ClosedChannelsEmitters, listener: () => void) {
        channels.on("channel_closed", listener);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { channels: subscribeToChannels(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IClosedChannelsRefresherArgs) {
        super({ ...args, name: "closedChannels" });
    }
}
