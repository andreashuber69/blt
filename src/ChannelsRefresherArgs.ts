// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { SubscribeToChannelsChannelClosedEvent, SubscribeToChannelsChannelOpenedEvent } from "lightning";
import { subscribeToChannels } from "lightning";
import type { Channel } from "./Channel.js";
import { FullRefresherArgs } from "./FullRefresherArgs.js";
import { getChannels } from "./getChannels.js";

export class ChannelsRefresherArgs extends FullRefresherArgs<"channels", Channel> {
    public override readonly name = "channels";

    public override onChanged(listener: (scheduleRefresh: boolean) => void) {
        const handler = (e: SubscribeToChannelsChannelClosedEvent | SubscribeToChannelsChannelOpenedEvent) => {
            console.log(`${new Date(Date.now()).toTimeString()} channel ${e.id}`);
            listener(true);
        };

        this.emitter.on("channel_opened", handler);
        this.emitter.on("channel_closed", handler);
    }

    public override onError(listener: (error: unknown) => void): void {
        this.emitter.on("error", listener);
    }

    public override removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    protected override async getAllData() {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return await getChannels({ ...this.args, is_public: true });
    }

    private readonly emitter = subscribeToChannels(this.args);
}
