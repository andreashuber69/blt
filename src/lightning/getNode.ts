// https://github.com/andreashuber69/lightning-node-operator/develop/README.md
import type { GetNodeArgs } from "lightning";
import { getNode as lndGetNode } from "lightning";
import { pick } from "./pick.js";

const properties = ["alias", "color", "features", "sockets", "updated_at"] as const;

export const getNode = async (args: GetNodeArgs) => pick(await lndGetNode(args), properties);

export type Node = Awaited<ReturnType<typeof getNode>>;
