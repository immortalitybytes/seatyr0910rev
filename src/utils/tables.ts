/**
 * Utility functions for table management
 */

/**
 * Calculate the minimum number of tables needed for a given number of guests
 * @param guests Guest list array
 * @param seatsPerTable Number of seats per table (default: 8)
 * @returns The minimum number of tables needed
 */
export function calculateMinTablesNeeded(guests: { name: string; count: number }[], seatsPerTable: number = 8): number {
  const totalGuestCount = guests.reduce((sum, guest) => sum + guest.count, 0);
  return Math.ceil(totalGuestCount / seatsPerTable);
}

/**
 * Calculate total capacity of all tables
 * @param tables Array of tables
 * @returns Total capacity
 */
export function calculateTotalCapacity(tables: { id: number; seats: number }[]): number {
  return tables.reduce((sum, table) => sum + table.seats, 0);
}

/**
 * Check if tables can be reduced based on guest count
 * @param guests Guest list array
 * @param tables Array of tables
 * @returns Object with canReduce flag and minimum tables needed
 */
export function canReduceTables(
  guests: { name: string; count: number }[],
  tables: { id: number; seats: number }[]
): { canReduce: boolean; minTablesNeeded: number; currentCapacity: number; requiredCapacity: number } {
  const totalGuestCount = guests.reduce((sum, guest) => sum + guest.count, 0);
  const minTablesNeeded = Math.ceil(totalGuestCount / 8); // Assuming 8 seats per table
  const currentCapacity = calculateTotalCapacity(tables);
  
  return {
    canReduce: tables.length > minTablesNeeded && totalGuestCount > 0,
    minTablesNeeded,
    currentCapacity,
    requiredCapacity: totalGuestCount
  };
}