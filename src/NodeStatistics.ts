import type { getForwards } from "./getForwards.js";

export type Forward = Readonly<Awaited<ReturnType<typeof getForwards>>[number]>;

export class NodeStatistics {
    /**
     * Adds to {@linkcode NodeStatistics#incomingForwards} and
     * {@linkcode NodeStatistics#outgoingForwards}.
     * @param forwards The forwards to add.
     */
    public addForwards(...forwards: Forward[]): void {
        this.incomingSorted = false;
        this.outgoingSorted = false;

        for (const forward of forwards) {
            NodeStatistics.addForward(this.incomingForwardsField, forward.incoming_channel, forward);
            NodeStatistics.addForward(this.outgoingForwardsField, forward.outgoing_channel, forward);
        }
    }

    /** Gets a collection of channel ids mapped to their incoming forwards, sorted from oldest to newest. */
    public get incomingForwards(): ReadonlyMap<string, readonly Forward[]> {
        if (!this.incomingSorted) {
            NodeStatistics.sort(this.incomingForwardsField);
            this.incomingSorted = true;
        }

        return this.incomingForwardsField;
    }

    /** Gets a collection of channel ids mapped to their outgoing forwards, sorted from oldest to newest. */
    public get outgoingForwards(): ReadonlyMap<string, readonly Forward[]> {
        if (!this.outgoingSorted) {
            NodeStatistics.sort(this.outgoingForwardsField);
            this.outgoingSorted = true;
        }

        return this.outgoingForwardsField;
    }

    private static addForward(map: Map<string, Forward[]>, key: string, forward: Forward) {
        if (!map.has(key)) {
            map.set(key, []);
        }

        map.get(key)?.push(forward);
    }

    private static sort(map: Map<string, Forward[]>) {
        for (const forwards of map.values()) {
            forwards.sort((a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf());
        }
    }

    private readonly incomingForwardsField = new Map<string, Forward[]>();
    private incomingSorted = true;
    private readonly outgoingForwardsField = new Map<string, Forward[]>();
    private outgoingSorted = true;
}
