// https://github.com/andreashuber69/lightning-node-operator/blob/develop/README.md
// eslint-disable-next-line import/unambiguous, import/no-commonjs
module.exports = {
    env: {
        node: true,
    },
    extends: ["@andreashuber69"],
    ignorePatterns: ["/code-doc/", "/coverage/", "/dist/"],
};
