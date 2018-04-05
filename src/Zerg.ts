import {profile} from './profiler/decorator';
import {Colony} from './Colony';
import {Overlord} from './overlords/Overlord';
import {Task} from './tasks/Task';


interface ParkingOptions {
	range: number;
	exactRange: boolean;
	offroad: boolean;
}

@profile
export class Zerg {
	creep: Creep; 						// The creep that this wrapper class will control
	body: BodyPartDefinition[];    	 	// These properties are all wrapped from this.creep.* to this.*
	carry: StoreDefinition;				// |
	carryCapacity: number;				// |
	fatigue: number;					// |
	hits: number;						// |
	hitsMax: number;					// |
	id: string;							// |
	memory: CreepMemory;				// | See the ICreepMemory interface for structure
	name: string;						// |
	pos: RoomPosition;					// |
	ref: string;						// |
	roleName: string;					// |
	room: Room;							// |
	spawning: boolean;					// |
	ticksToLive: number | undefined;	// |
	actionLog: { [actionName: string]: boolean }; // Tracks the actions that a creep has completed this tick
	// settings: any;					// Adjustable settings object, can vary across roles
	private _task: Task | null; 		// Cached Task object that is instantiated once per tick and on change

	constructor(creep: Creep) {
		this.creep = creep;
		this.body = creep.body;
		this.carry = creep.carry;
		this.carryCapacity = creep.carryCapacity;
		this.fatigue = creep.fatigue;
		this.hits = creep.hits;
		this.hitsMax = creep.hitsMax;
		this.id = creep.id;
		this.memory = creep.memory;
		this.name = creep.name;
		this.pos = creep.pos;
		this.ref = creep.ref;
		this.roleName = creep.memory.role;
		this.room = creep.room;
		this.spawning = creep.spawning;
		this.ticksToLive = creep.ticksToLive;
		this.actionLog = {};
		// this.settings = {};
	}

	// Wrapped creep methods ===========================================================================================

	attack(target: Creep | Structure) {
		let result = this.creep.attack(target);
		this.actionLog.attack = (result == OK);
		return result;
	}

	attackController(controller: StructureController) {
		let result = this.creep.attackController(controller);
		this.actionLog.attackController = (result == OK);
		return result;
	}

	build(target: ConstructionSite) {
		let result = this.creep.build(target);
		this.actionLog.build = (result == OK);
		return result;
	}

	claimController(controller: StructureController) {
		let result = this.creep.claimController(controller);
		this.actionLog.claimController = (result == OK);
		return result;
	}

	dismantle(target: Structure): CreepActionReturnCode {
		let result = this.creep.dismantle(target);
		this.actionLog.dismantle = (result == OK);
		return result;
	}

	drop(resourceType: ResourceConstant, amount?: number) {
		let result = this.creep.drop(resourceType, amount);
		this.actionLog.drop = (result == OK);
		return result;
	}

	harvest(source: Source | Mineral) {
		let result = this.creep.harvest(source);
		this.actionLog.harvest = (result == OK);
		return result;
	}

	move(direction: DirectionConstant) {
		let result = this.creep.move(direction);
		this.actionLog.move = (result == OK);
		return result;
	}

	pickup(resource: Resource) {
		let result = this.creep.pickup(resource);
		this.actionLog.pickup = (result == OK);
		return result;
	}

	rangedAttack(target: Creep | Structure) {
		let result = this.creep.rangedAttack(target);
		this.actionLog.rangedAttack = (result == OK);
		return result;
	}

	rangedMassAttack() {
		let result = this.creep.rangedMassAttack();
		this.actionLog.rangedMassAttack = (result == OK);
		return result;
	}

	repair(target: Structure) {
		let result = this.creep.repair(target);
		this.actionLog.repair = (result == OK);
		return result;
	}

	reserveController(controller: StructureController) {
		let result = this.creep.reserveController(controller);
		this.actionLog.reserveController = (result == OK);
		return result;
	}

	say(message: string, pub?: boolean) {
		return this.creep.say(message, pub);
	}

	signController(target: StructureController, text: string) {
		let result = this.creep.signController(target, text);
		this.actionLog.signController = (result == OK);
		return result;
	}

	suicide() {
		return this.creep.suicide();
	}

	upgradeController(controller: StructureController) {
		let result = this.creep.upgradeController(controller);
		this.actionLog.upgradeController = (result == OK);
		return result;
	}

	heal(target: Creep | Zerg, rangedHealInstead = true) {
		let result: CreepActionReturnCode;
		if (rangedHealInstead && !this.pos.isNearTo(target)) {
			return this.rangedHeal(target);
		}
		if (target instanceof Zerg) {
			result = this.creep.heal(target.creep);
		} else {
			result = this.creep.heal(target);
		}
		this.actionLog.heal = (result == OK);
		return result;
	}

	rangedHeal(target: Creep | Zerg) {
		let result: CreepActionReturnCode;
		if (target instanceof Zerg) {
			result = this.creep.rangedHeal(target.creep);
		} else {
			result = this.creep.rangedHeal(target);
		}
		this.actionLog.rangedHeal = (result == OK);
		return result;
	}

	transfer(target: Creep | Zerg | Structure, resourceType: ResourceConstant, amount?: number) {
		let result;
		if (target instanceof Zerg) {
			result = this.creep.transfer(target.creep, resourceType, amount);
		} else {
			result = this.creep.transfer(target, resourceType, amount);
		}
		this.actionLog.transfer = (result == OK);
		return result;
	}

	withdraw(target: Structure, resourceType: ResourceConstant, amount?: number) {
		let result = this.creep.withdraw(target, resourceType, amount);
		this.actionLog.withdraw = (result == OK);
		return result;
	}

	// Simultaneous creep actions ==------------------------------------------------------------------------------------

	/* Determine whether the given action will conflict with an action the creep has already taken.
	 * See http://docs.screeps.com/simultaneous-actions.html for more details. */
	canExecute(actionName: string): boolean {
		// Only one action can be executed from within a single pipeline
		// Last pipeline is more complex because it depends on the energy a creep has; sidelining this for now
		let pipelines: string[][] = [
			['harvest', 'attack', 'build', 'repair', 'dismantle', 'attackController', 'rangedHeal', 'heal'],
			['rangedAttack', 'rangedMassAttack', 'build', 'repair', 'rangedHeal'],
			// ['upgradeController', 'build', 'repair', 'withdraw', 'transfer', 'drop'],
		];
		let conflictingActions: string[] = [];
		for (let pipeline of pipelines) {
			if (pipeline.includes(actionName)) conflictingActions = conflictingActions.concat(pipeline);
		}
		for (let action of conflictingActions) {
			if (this.actionLog[action]) {
				return false;
			}
		}
		return true;
	}

	// Body configuration and related data -----------------------------------------------------------------------------

	getActiveBodyparts(type: BodyPartConstant) {
		return this.creep.getActiveBodyparts(type);
	}

	/* The same as creep.getActiveBodyparts, but just counts bodyparts regardless of condition. */
	getBodyparts(partType: BodyPartConstant): number {
		return _.filter(this.body, (part: BodyPartDefinition) => part.type == partType).length;
	}

	// Custom creep methods ============================================================================================


	// Boosting logic --------------------------------------------------------------------------------------------------

	get boosts(): _ResourceConstantSansEnergy[] {
		return this.creep.boosts;
	}

	get boostCounts(): { [boostType: string]: number } {
		return this.creep.boostCounts;
	}

	get needsBoosts(): boolean {
		/*if (this.overlord) {
			let neededBoosts = this.overlord.boosts[this.roleName];
			if (neededBoosts) {
				return _.difference(neededBoosts, this.boosts).length > 0;
			}
		}*/
		return false;
	}

	// Overlord logic --------------------------------------------------------------------------------------------------

	get overlord(): Overlord | null {
		if (this.memory.overlord && Overmind.overlords[this.memory.overlord]) {
			return Overmind.overlords[this.memory.overlord];
		} else {
			return null;
		}
	}

	set overlord(newOverlord: Overlord | null) {
		// Remove cache references to old assignments
		let ref = this.memory.overlord;
		let oldOverlord: Overlord | null = ref ? Overmind.overlords[ref] : null;
		if (ref && Overmind.cache.overlords[ref] && Overmind.cache.overlords[ref][this.roleName]) {
			_.remove(Overmind.cache.overlords[ref][this.roleName], name => name == this.name);
		}
		if (newOverlord) {
			// Change to the new overlord's colony
			this.colony = newOverlord.colony;
			// Change assignments in memory
			this.memory.overlord = newOverlord.ref;
			// Update the cache references
			if (!Overmind.cache.overlords[newOverlord.ref]) {
				Overmind.cache.overlords[newOverlord.ref] = {};
			}
			if (!Overmind.cache.overlords[newOverlord.ref][this.roleName]) {
				Overmind.cache.overlords[newOverlord.ref][this.roleName] = [];
			}
			Overmind.cache.overlords[newOverlord.ref][this.roleName].push(this.name);
		} else {
			this.memory.overlord = null;
		}
		if (oldOverlord) oldOverlord.recalculateCreeps();
		if (newOverlord) newOverlord.recalculateCreeps();
	}

	// Task logic ------------------------------------------------------------------------------------------------------

	/* Wrapper for _task */
	get task(): ITask | null {
		// if (!this._task) {
		// 	let protoTask = this.memory.task;
		// 	this._task = protoTask ? initializeTask(protoTask) : null;
		// }
		// return this._task;
		return this.creep.task;
	}

	/* Assign the creep a task with the setter, replacing creep.assign(Task) */
	set task(task: ITask | null) {
		// // Unregister target from old task if applicable
		// let oldProtoTask = this.memory.task as protoTask;
		// if (oldProtoTask) {
		// 	let oldRef = oldProtoTask._target.ref;
		// 	if (Overmind.cache.targets[oldRef]) {
		// 		Overmind.cache.targets[oldRef] = _.remove(Overmind.cache.targets[oldRef], name => name == this.name);
		// 	}
		// }
		// // Set the new task
		// this.memory.task = task ? task.proto : null;
		// if (task) {
		// 	if (task.target) {
		// 		// Register task target in cache if it is actively targeting something (excludes goTo and similar)
		// 		if (!Overmind.cache.targets[task.target.ref]) {
		// 			Overmind.cache.targets[task.target.ref] = [];
		// 		}
		// 		Overmind.cache.targets[task.target.ref].push(this.name);
		// 	}
		// 	// Register references to creep
		// 	task.creep = this;
		// 	this._task = task;
		// }
		this.creep.task = task;
	}

	/* Does the creep have a valid task at the moment? */
	get hasValidTask(): boolean {
		return this.creep.hasValidTask;
	}

	/* Creeps are idle if they don't have a task. */
	get isIdle(): boolean {
		return this.creep.isIdle;
	}

	/* Execute the task you currently have. */
	run(): number | void {
		return this.creep.run();
	}

	// Colony association ----------------------------------------------------------------------------------------------

	/* Colony that the creep belongs to. */
	get colony(): Colony {
		return Overmind.Colonies[this.memory.colony];
	}

	set colony(newColony: Colony) {
		this.memory.colony = newColony.name;
	}

	/* Return the maximum (not remaining) lifetime of the creep */
	get lifetime(): number {
		if (this.getBodyparts(CLAIM) > 0) {
			return CREEP_CLAIM_LIFE_TIME;
		} else {
			return CREEP_LIFE_TIME;
		}
	}

	/* The average movespeed of the creep on blank terrain */
	get moveSpeed(): number {
		if (!this.memory.data.moveSpeed) {
			let massiveParts = [WORK, ATTACK, RANGED_ATTACK, HEAL, TOUGH];
			let mass = 0;
			for (let part of massiveParts) {
				mass += this.getActiveBodyparts(part);
			}
			let moveParts = this.getActiveBodyparts(MOVE);
			let fatiguePerTick = 2 * mass;
			if (fatiguePerTick == 0) {
				this.memory.data.moveSpeed = 1;
			} else {
				this.memory.data.moveSpeed = Math.min(2 * moveParts / fatiguePerTick, 1);
			}
		}
		return this.memory.data.moveSpeed;
	}

	// Movement and location -------------------------------------------------------------------------------------------

	travelTo(destination: RoomPosition | { pos: RoomPosition }, options?: any) {
		return this.creep.travelTo(destination, options);
	};

	inSameRoomAs(target: HasPos): boolean {
		return (this.pos.roomName == target.pos.roomName);
	}

	park(pos: RoomPosition = this.pos, maintainDistance = false): number {
		let road = this.pos.lookForStructure(STRUCTURE_ROAD);
		if (!road) return OK;

		let positions = _.sortBy(this.pos.availableNeighbors(), (p: RoomPosition) => p.getRangeTo(pos));
		if (maintainDistance) {
			let currentRange = this.pos.getRangeTo(pos);
			positions = _.filter(positions, (p: RoomPosition) => p.getRangeTo(pos) <= currentRange);
		}

		let swampPosition;
		for (let position of positions) {
			if (position.lookForStructure(STRUCTURE_ROAD)) continue;
			let terrain = position.lookFor(LOOK_TERRAIN)[0];
			if (terrain === 'swamp') {
				swampPosition = position;
			} else {
				return this.move(this.pos.getDirectionTo(position));
			}
		}

		if (swampPosition) {
			return this.move(this.pos.getDirectionTo(swampPosition));
		}

		return this.travelTo(pos);
	}

	moveOnExit(): ScreepsReturnCode | undefined {
		if (this.pos.rangeToEdge > 0 && this.fatigue == 0) {
			let directions = [1, 3, 5, 7, 2, 4, 6, 8] as DirectionConstant[];
			for (let direction of directions) {
				let position = this.pos.getPositionAtDirection(direction);
				let terrain = position.lookFor(LOOK_TERRAIN)[0];
				if (terrain != 'wall' && position.rangeToEdge == 0) {
					let outcome = this.move(direction);
					return outcome;
				}
			}
			console.log(`moveOnExit() assumes nearby exit tile, position: ${this.pos}`);
			return ERR_NO_PATH;
		}
	}

	moveOffExit(avoidSwamp = true): ScreepsReturnCode {
		let swampDirection;
		let directions = [1, 3, 5, 7, 2, 4, 6, 8] as DirectionConstant[];
		for (let direction of directions) {
			let position = this.pos.getPositionAtDirection(direction);
			if (position.rangeToEdge > 0 && position.isPassible()) {
				let terrain = position.lookFor(LOOK_TERRAIN)[0];
				if (avoidSwamp && terrain == 'swamp') {
					swampDirection = direction;
					continue;
				}
				return this.move(direction);
			}
		}
		if (swampDirection) {
			return this.move(swampDirection as DirectionConstant);
		}
		return ERR_NO_PATH;
	}

	moveOffExitToward(pos: RoomPosition, detour = true): number | undefined {
		for (let position of this.pos.availableNeighbors()) {
			if (position.getRangeTo(pos) == 1) {
				return this.travelTo(position);
			}
		}
		if (detour) {
			this.travelTo(pos, {ignoreCreeps: false});
		}
	}

}

