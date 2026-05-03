/**
 * Formats a token number for display with the correct DD+sequence format.
 * Token numbers are stored as integers: e.g. day 02, seq 1 → stored as 21.
 * This function reconstructs the display: "021", "022", ..., "0215", etc.
 *
 * @param tokenNumber - The integer token number from the database
 * @param tokenDate - Optional ISO date string to extract the day for reconstruction
 * @returns Formatted string like "021", "1503", etc.
 */
export function formatTokenNumber(tokenNumber: number, tokenDate?: string): string {
  if (!tokenNumber) return "—";

  // If we have the date, use it to determine the day prefix length
  if (tokenDate) {
    const day = new Date(tokenDate).getDate().toString().padStart(2, '0');
    const tokenStr = tokenNumber.toString();
    const dayStr = Number(day).toString(); // e.g. "2" for day 02

    // The token was created as Number(`${day}${seq}`) where day is zero-padded
    // So token 21 for day 02 means day="02", seq="1" → display "021"
    // Token 215 for day 02 means day="02", seq="15" → display "0215"
    // Token 1503 for day 15 means day="15", seq="03" → display "1503"
    
    // Extract sequence by removing the day prefix
    if (tokenStr.startsWith(dayStr)) {
      const seqPart = tokenStr.substring(dayStr.length);
      return `${day}${seqPart}`;
    }
  }

  // Fallback: just return the number as string (no date context)
  return tokenNumber.toString();
}
