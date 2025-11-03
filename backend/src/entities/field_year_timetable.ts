/**
 * FieldYearTimeTable entity - represents a field's timetable for a specific year
 *
 * Contains timetables for different groups/formations within a field and year
 *
 * Example:
 * - Field: Informatica (id: 1)
 * - Year: 3
 * - TimeTables: { "INFO3": Timetable, "INFO3/1": Timetable, "INFO3/2": Timetable }
 */

import { Field } from './field';
import { Timetable } from '../types';

export class FieldYearTimeTable {
    field: Field;
    year: number;
    url: string;
    timeTables: Map<string, Timetable>;

    constructor(data: {
        field: Field;
        year: number;
        url?: string; // optional URL to the timetable source
        timeTables?: Map<string, Timetable> | Record<string, Timetable>;
    }) {
        // Validate field
        if (!data.field || !(data.field instanceof Field)) {
            throw new Error('FieldYearTimeTable field must be a valid Field instance');
        }

        // Validate year
        if (typeof data.year !== 'number' || !Number.isInteger(data.year) || data.year < 1) {
            throw new Error('FieldYearTimeTable year must be a positive integer');
        }

        // Check if year is valid for the field
        if (!data.field.years.includes(data.year)) {
            throw new Error(`Year ${data.year} is not valid for field ${data.field.name}. Valid years: ${data.field.years.join(', ')}`);
        }

        this.field = data.field;
        this.year = data.year;
        this.url = data.url ?? '';

        // Convert Record to Map if needed
        if (data.timeTables) {
            if (data.timeTables instanceof Map) {
                this.timeTables = data.timeTables;
            } else {
                this.timeTables = new Map(Object.entries(data.timeTables));
            }
        } else {
            this.timeTables = new Map();
        }
    }

    /**
     * Add a timetable for a specific group
     */
    addTimetable(group: string, timetable: Timetable): void {
        if (!group || group.trim().length === 0) {
            throw new Error('Group name cannot be empty');
        }
        this.timeTables.set(group, timetable);
    }

    /**
     * Get a timetable for a specific group
     */
    getTimetable(group: string): Timetable | undefined {
        return this.timeTables.get(group);
    }

    /**
     * Get all group names
     */
    getGroups(): string[] {
        return Array.from(this.timeTables.keys());
    }

    /**
     * Get total number of timetables
     */
    getTimetableCount(): number {
        return this.timeTables.size;
    }

    /**
     * Convert timeTables Map to plain object for JSON serialization
     */
    toJSON(): {
        field: Field;
        year: number;
        url: string;
        timeTables: Record<string, Timetable>;
    } {
        return {
            field: this.field,
            year: this.year,
            url: this.url,
            timeTables: Object.fromEntries(this.timeTables),
        };
    }

    toString(): string {
        return this.field.toString();
    }
}

