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
    yearLinks: Map<number, string>; // Map of year -> URL

    constructor(data: Partial<Field> & { yearLinks?: Map<number, string> } = {}) {
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
        this.yearLinks = data.yearLinks ?? new Map();
    }

    /**
     * Add a year link
     */
    addYearLink(year: number, url: string): void {
        if (!this.years.includes(year)) {
            throw new Error(`Year ${year} is not valid for field ${this.name}`);
        }
        this.yearLinks.set(year, url);
    }

    /**
     * Get URL for a specific year
     */
    getYearLink(year: number): string | undefined {
        return this.yearLinks.get(year);
    }

    toString(): string {
        return `${this.name} ${JSON.stringify(this.years)}`;
    }
}

