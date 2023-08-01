// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { subscribeToChannels } from "lightning";
import type { Channel } from "./Channel.js";
import { FullRefresherArgs } from "./FullRefresherArgs.js";
import { getChannels } from "./getChannels.js";

export class ChannelsRefresherArgs extends FullRefresherArgs<"channels", Channel> {
    public override readonly name = "channels";

    public override readonly subscribe = (listener: (scheduleRefresh: boolean) => void) => {
        this.emitter.on("channel_opened", () => listener(true));
        this.emitter.on("channel_closed", () => listener(true));
    };

    public override readonly unsubscribe = () => this.emitter.removeAllListeners();

    protected override readonly getAllData = async () => await getChannels(this.args);

    private readonly emitter = subscribeToChannels(this.args);
}
