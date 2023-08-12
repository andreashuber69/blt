// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import { subscribeToChannels } from "lightning";
import type { Channel } from "./Channel.js";
import { FullRefresherArgs } from "./FullRefresherArgs.js";
import { getChannels } from "./getChannels.js";

export class ChannelsRefresherArgs extends FullRefresherArgs<"channels", Channel> {
    public override readonly name = "channels";

    public override onChanged(listener: (scheduleRefresh: boolean) => void) {
        this.emitter.on("channel_opened", () => listener(true));
        this.emitter.on("channel_closed", () => listener(true));
    }

    public override removeAllListeners() {
        this.emitter.removeAllListeners();
    }

    protected override async getAllData() {
        return await getChannels(this.args);
    }

    private readonly emitter = subscribeToChannels(this.args);
}
