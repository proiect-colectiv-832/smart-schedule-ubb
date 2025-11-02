/**
 * Field entity - represents a study program/specialization field
 *
 * Examples:
 * - Informatica - linia de studiu romana (years: [1, 2, 3])
 * - Matematica informatica - linia de studiu engleza (years: [1, 2, 3])
 */

export class Field {
    name: string;
    years: number[];

    constructor(data: Partial<Field> = {}) {
        // Validate name
        if (data.name !== undefined) {
            if (data.name.trim().length === 0) {
                throw new Error('Field name cannot be empty');
            }
        }

        // Validate years
        if (data.years !== undefined) {
            if (!Array.isArray(data.years)) {
                throw new Error('Field years must be an array');
            }
            if (data.years.some(year => !Number.isInteger(year) || year < 1)) {
                throw new Error('All years must be positive integers');
            }
        }

        this.name = data.name ?? '';
        this.years = data.years ?? [];
    }

    toString(): string {
        return `${this.name} ${JSON.stringify(this.years)}`;
    }
}

