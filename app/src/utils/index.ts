import { TaskType } from 'src/task/schema/task.schema';
import * as pidusage from 'pidusage';

export const getTaskType = (extension: string): TaskType => {
    if (extension === 'css') {
        return TaskType.CSS;
    } else if (extension === 'js') {
        return TaskType.JS;
    } else if (/jpg|jpeg|png/.test(extension)) {
        return TaskType.IMAGE;
    }
};

export const memoryUsageCalculator = (pid: number) => {
    const stats = [];
    pidusage(pid).then((stat) => stats.push(stat));
    const ref = setInterval(() => {
        pidusage(pid).then((stat) => stats.push(stat));
    }, 20);
    return [ref, stats];
};
