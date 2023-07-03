import assert from "node:assert";
import { describe, it } from "node:test";
import type { Forward } from "./NodeStatistics";
import { NodeStatistics } from "./NodeStatistics";

const originalForwards = [
    /* eslint-disable @typescript-eslint/naming-convention */
    {
        created_at: "2023-06-28T00:01:40.000Z",
        fee: 33,
        fee_mtokens: "33244",
        incoming_channel: "0x3609x1",
        mtokens: "237462035",
        outgoing_channel: "0x1657x1",
        tokens: 237_462,
    } as const,
    {
        created_at: "2023-06-28T00:01:35.000Z",
        fee: 18,
        fee_mtokens: "18479",
        incoming_channel: "0x3609x1",
        mtokens: "131998664",
        outgoing_channel: "0x1657x1",
        tokens: 131_998,
    } as const,
    {
        created_at: "2023-06-27T17:36:41.000Z",
        fee: 0,
        fee_mtokens: "0",
        incoming_channel: "0x2916x2",
        mtokens: "100010100",
        outgoing_channel: "0x3609x1",
        tokens: 100_010,
    } as const,
    {
        created_at: "2023-06-27T17:36:35.000Z",
        fee: 0,
        fee_mtokens: "0",
        incoming_channel: "0x2916x2",
        mtokens: "100010100",
        outgoing_channel: "0x3609x1",
        tokens: 100_010,
    } as const,
    {
        created_at: "2023-06-27T08:02:35.000Z",
        fee: 24,
        fee_mtokens: "24348",
        incoming_channel: "0x3609x1",
        mtokens: "173917855",
        outgoing_channel: "0x1657x1",
        tokens: 173_917,
    } as const,
    /* eslint-enable @typescript-eslint/naming-convention */
] as const;

const statistics = new NodeStatistics();
statistics.addForwards(...originalForwards);

type SortedForwardsMap = typeof NodeStatistics.prototype.incomingForwards;

const occurrenceCount = (sortedForwardsMap: SortedForwardsMap, forward: Forward) =>
    [...sortedForwardsMap.values()].reduce(
        (outer, sortedForwards) => outer + sortedForwards.reduce(
            (inner, sortedForward) => (inner + (sortedForward === forward ? 1 : 0)),
            0,
        ),
        0,
    );

const assertKeyMatch = (sortedForwardsMap: SortedForwardsMap, channelKey: "incoming_channel" | "outgoing_channel") => {
    for (const [key, sortedForwards] of sortedForwardsMap) {
        describe(`${key}`, () => {
            it("forwards should be sorted", () => {
                assert(sortedForwards.every(
                    (v, i, a) => i === 0 || new Date(v.created_at) >= new Date(a[i - 1]?.created_at ?? ""),
                ));
            });

            for (const forward of sortedForwards) {
                it(`${channelKey} is equal to key`, () => {
                    assert(forward[channelKey] === key);
                });
            }
        });
    }
};


describe(NodeStatistics.name, () => {
    it("every original forward should appear in incoming and outgoing collections exactly once", () => {
        for (const originalForward of originalForwards) {
            assert(occurrenceCount(statistics.incomingForwards, originalForward) === 1);
            assert(occurrenceCount(statistics.outgoingForwards, originalForward) === 1);
        }
    });

    describe("incomingForwards", () => {
        assertKeyMatch(statistics.incomingForwards, "incoming_channel");
    });

    describe("outgoingForwards", () => {
        assertKeyMatch(statistics.outgoingForwards, "outgoing_channel");
    });
});
