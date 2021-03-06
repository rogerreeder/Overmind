import {Task} from './Task';
import {profile} from '../profiler/decorator';


export type dismantleTargetType = Structure;
export const dismantleTaskName = 'dismantle';

@profile
export class TaskDismantle extends Task {
	target: dismantleTargetType;

	constructor(target: dismantleTargetType, options = {} as TaskOptions) {
		super(dismantleTaskName, target, options);
	}

	isValidTask() {
		return (this.creep.getActiveBodyparts(WORK) > 0);
	}

	isValidTarget() {
		let target = this.target;
		return target && target.hits > 0;
	}

	work() {
		return this.creep.dismantle(this.target);
	}
}
