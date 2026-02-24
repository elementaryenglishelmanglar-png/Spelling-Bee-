/**
 * Returns a human-readable label for a grade value.
 * Grade 12 is used internally to represent "Group 3" (Preschool).
 */
export function getGradeLabel(grade: number): string {
    if (grade === 12) return 'Group 3';
    return `Grade ${grade}`;
}
