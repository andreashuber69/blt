// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type {
    AuthenticatedLightningArgs,
    SubscribeToChannelsChannelActiveChangedEvent,
    SubscribeToChannelsChannelClosedEvent,
    SubscribeToChannelsChannelOpenedEvent,
} from "lightning";
import { getNode, subscribeToChannels } from "lightning";

import { getChannels } from "../lightning/getChannels.js";
import type { Node } from "../lightning/Node.js";
import { log } from "../Logger.js";
import { FullRefresher } from "./FullRefresher.js";
import type { Emitters, IRefresher } from "./Refresher.js";

type NodesEmitters = Emitters<"channels">;

export interface INodesRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;
}

export class NodesRefresher extends FullRefresher<"nodes", Node, NodesEmitters> {
    /**
     * Creates a new object implementing {@linkcode IRefresher} for partner nodes of public channels.
     * @param args See {@linkcode INodesRefresherArgs}.
     */
    public static async create(args: INodesRefresherArgs) {
        return await this.init(new NodesRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        /* eslint-disable @typescript-eslint/naming-convention */
        return await Promise.all((await getChannels({ ...lndArgs, is_public: true })).map(async (c) => ({
            id: c.id,
            ...await getNode({ ...lndArgs, is_omitting_channels: true, public_key: c.partner_public_key }),
        })));
        /* eslint-enable @typescript-eslint/naming-convention */
    }

    protected override onServerChanged({ channels }: NodesEmitters, listener: () => void) {
        const openClosedHandler = (
            e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent,
        ) => {
            log(`channel ${e.id}`);
            listener();
        };

        channels.on("channel_opened", openClosedHandler);
        channels.on("channel_closed", openClosedHandler);

        const isActiveHandler = (e: SubscribeToChannelsChannelActiveChangedEvent) => {
            log(`channel ${e.transaction_id}x${e.transaction_vout}: ${e.is_active}`);
            listener();
        };

        channels.on("channel_active_changed", isActiveHandler);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return { channels: subscribeToChannels(lndArgs) } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: INodesRefresherArgs) {
        super({ ...args, name: "nodes" });
    }
}