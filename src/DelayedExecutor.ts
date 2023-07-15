export class DelayedExecutor {
    public constructor(public readonly delayMilliseconds = 10_000) {}

    public execute(task: () => unknown) {
        if (this.done) {
            void this.delay(task);
        }
    }

    private done = true;

    private async delay(task: () => unknown) {
        this.done = false;

        try {
            await new Promise((resolve) => setTimeout(resolve, this.delayMilliseconds));
            await task();
        } finally {
            this.done = true;
        }
    }
}
