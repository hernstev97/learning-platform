import course from './bear-course.json' with { type: 'json' };
import type { Task } from './types';

export const tasks: Task[] = course.tasks;
export const chapters = course.chapters;
export const sourceFiles: Record<string, string> = course.files;
export const bearRevision = course.revision;
