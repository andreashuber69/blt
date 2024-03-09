// https://github.com/andreashuber69/lightning-node-operator/blob/develop/README.md
// eslint-disable-next-line import/no-commonjs, import/unambiguous
module.exports = {
    env: {
        node: true,
    },
    extends: ["@andreashuber69"],
    ignorePatterns: ["/code-doc/", "/coverage/", "/dist/"],
};
