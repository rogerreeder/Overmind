import {Task} from './Task';
import {profile} from '../profiler/decorator';


export type fortifyTargetType = StructureWall | StructureRampart;
export const fortifyTaskName = 'fortify';

@profile
export class TaskFortify extends Task {
	target: fortifyTargetType;

	constructor(target: fortifyTargetType, options = {} as TaskOptions) {
		super(fortifyTaskName, target, options);
		// Settings
		this.settings.workOffRoad = true;
	}

	isValidTask() {
		return (this.creep.carry.energy > 0);
	}

	isValidTarget() {
		let target = this.target;
		return (target != null && target.hits < target.hitsMax); // over-fortify to minimize extra trips
	}

	work() {
		return this.creep.repair(this.target);
	}
}
