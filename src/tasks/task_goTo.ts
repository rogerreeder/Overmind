import {Task} from './Task';
import {profile} from '../profiler/decorator';

export type goToTargetType = { pos: RoomPosition } | RoomPosition;
export const goToTaskName = 'goTo';

@profile
export class TaskGoTo extends Task {
	target: null;

	constructor(target: goToTargetType, options = {} as TaskOptions) {
		if (target instanceof RoomPosition) {
			super(goToTaskName, {ref: '', pos: target}, options);
		} else {
			super(goToTaskName, {ref: '', pos: target.pos}, options);
		}
		// Settings
		this.settings.targetRange = 1;
	}

	isValidTask() {
		return !this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange);
	}

	isValidTarget() {
		return true;
	}

	isValid(): boolean {
		let validTask = false;
		if (this.creep) {
			validTask = this.isValidTask();
		}
		// Return if the task is valid; if not, finalize/delete the task and return false
		if (validTask) {
			return true;
		} else {
			// Switch to parent task if there is one
			let isValid = false;
			if (this.parent) {
				let isValid = this.parent.isValid();
			}
			this.finish();
			return isValid;
		}
	}

	work() {
		return OK;
	}

}
