// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { AuthenticatedLightningArgs, SubscribeToForwardsForwardEvent } from "lightning";
import { subscribeToChannels, subscribeToForwards, subscribeToPayments } from "lightning";

import type { ChainTransaction } from "../lightning/getChainTransactions.js";
import { getChainTransactions } from "../lightning/getChainTransactions.js";
import type { Channel } from "../lightning/getChannels.js";
import { getChannels } from "../lightning/getChannels.js";
import type { FeeRate } from "../lightning/getFeeRates.js";
import { getFeeRates } from "../lightning/getFeeRates.js";
import { FullRefresher } from "./FullRefresher.js";
import type { Emitters, IRefresher } from "./Refresher.js";

type ChannelsEmitters = Emitters<"channels" | "forwards" | "payments">;

export interface IChannelsRefresherArgs {
    /** The {@linkcode AuthenticatedLightningArgs} of the node the data should be retrieved from. */
    readonly lndArgs: AuthenticatedLightningArgs;

    /** The length of time each refresh and notify operation will be delayed after a change has been detected. */
    readonly delayMilliseconds?: number;
}

export type ChannelsElement = Channel & FeeRate & Pick<ChainTransaction, "created_at">;

/** Implements {@linkcode IRefresher} for open public channels. */
export class ChannelsRefresher extends FullRefresher<"channels", ChannelsElement, ChannelsEmitters> {
    /**
     * Creates a new object implementing {@linkcode IRefresher} for open public channels.
     * @param args See {@linkcode IChannelsRefresherArgs}.
     */
    public static async create(args: IChannelsRefresherArgs) {
        return await this.init(new ChannelsRefresher(args));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected override async getAllData(lndArgs: AuthenticatedLightningArgs) {
        const result = new Array<ChannelsElement>();
        const feeRates = new Map((await getFeeRates(lndArgs)).map(({ id, ...rest }) => [id, rest]));

        const chainTxs = new Map(
            (await getChainTransactions(lndArgs)).filter((t) => t.is_confirmed).map(({ id, ...rest }) => [id, rest]),
        );

        // eslint-disable-next-line @typescript-eslint/naming-convention
        for (const channel of await getChannels({ ...lndArgs, is_public: true })) {
            const feeRate = feeRates.get(channel.id);

            if (!feeRate) {
                throw new Error(`Fee rate missing for channel ${channel.id}.`);
            }

            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { created_at } = chainTxs.get(channel.transaction_id) ?? {};

            if (created_at) {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                result.push({ ...channel, ...feeRate, created_at });
            }
        }

        return result;
    }

    protected override onServerChanged({ channels, forwards, payments }: ChannelsEmitters, listener: () => void) {
        channels.on("channel_opened", listener);
        channels.on("channel_closed", listener);

        // The Channel type also exposes the local and remote balance, which is why we need to refresh when a forward or
        // a payment has been made.
        forwards.on("forward", (e: SubscribeToForwardsForwardEvent) => {
            if (e.is_confirmed) {
                listener();
            }
        });

        payments.on("confirmed", listener);
    }

    protected override createServerEmitters(lndArgs: AuthenticatedLightningArgs) {
        return {
            channels: subscribeToChannels(lndArgs),
            forwards: subscribeToForwards(lndArgs),
            payments: subscribeToPayments(lndArgs),
        } as const;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private constructor(args: IChannelsRefresherArgs) {
        super({ ...args, name: "channels" });
    }
}
