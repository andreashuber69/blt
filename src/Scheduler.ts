export class Scheduler {
    public constructor(public readonly delayMilliseconds = 10_000) {}

    /**
     * If idle, schedules a call to the passed function.
     * @description Right after construction, an object of this class is in the idle state. When called in this state,
     * the state changes to busy, a call to the passed function is scheduled to occur after
     * {@linkcode Scheduler.delayMilliseconds} and {@linkcode Scheduler.call} then returns immediately. The state only
     * changes back to idle after the `func` has been called and the result awaited. When called in the busy state,
     * {@linkcode Scheduler.call} returns right away without doing anything.
     * @param func The function to call.
     */
    public call(func: () => unknown) {
        if (this.idle) {
            void this.delay(func);
        }
    }

    private idle = true;

    private async delay(func: () => unknown) {
        this.idle = false;

        try {
            await new Promise((resolve) => setTimeout(resolve, this.delayMilliseconds));
            await func();
        } finally {
            this.idle = true;
        }
    }
}
