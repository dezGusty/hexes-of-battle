import { Coords } from "../shared";
import { Creature } from "./creature";

export enum BattleActionType {
    NONE = 0,
    MOVE = 1,
    ATTACK_MELEE = 2,
    ATTACK_RANGED = 3,
    COUNTER_ATTACK_MELEE = 4,
    SELECT_NEXT = 5,
    TARGET_ABILITY = 6
}

export class BattleAction {
    constructor(
        public type: BattleActionType,
        public path: Coords[],
        public step: number = 0,
        public stepDuration: number = 0,
        public remainingTime: number = 0,
        public sourceUnit?: Creature,
        public targetUnit?: Creature
    ) {
    }

    static create(
        type: BattleActionType,
        path: Coords[],
        data: {
            step: number,
            stepDuration: number,
            remainingTime: number,
            sourceUnit: Creature | undefined,
            targetUnit: Creature | undefined
        } = { step: 0, stepDuration: 0, remainingTime: 0, sourceUnit: undefined, targetUnit: undefined }
    ): BattleAction {
        return new BattleAction(type, path, data.step, data.stepDuration, data.remainingTime, data.sourceUnit, data.targetUnit);
    }

    static CreateAttackMelee(source: Creature, target: Creature): BattleAction {
        return new BattleAction(BattleActionType.ATTACK_MELEE, [target.pos], 0, 500, 50, source, target);
    }

    static CounterAttack(source: Creature, target: Creature): BattleAction {
        return new BattleAction(BattleActionType.COUNTER_ATTACK_MELEE, [], 0, 500, 50, source, target);
    }
}