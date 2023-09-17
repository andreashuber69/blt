export const getTargetBalanceDistance = (balance: number, target: number, capacity: number) =>
    (balance <= target ? (balance / target) - 1 : (balance - target) / (capacity - target));


