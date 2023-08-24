// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetNodeResult } from "lightning";

export type Node =
    Readonly<Pick<GetNodeResult, "alias" | "color" | "features" | "sockets" | "updated_at"> & { id: string }>;
