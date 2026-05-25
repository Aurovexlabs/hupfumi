export type SkillMatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  totalRequired: number;
  label: "Strong match" | "Partial match" | "Needs upskilling";
};

function toSkillList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

export function calculateSkillMatch(
  requiredSkillsInput: unknown,
  candidateSkillsInput: unknown,
): SkillMatchResult | null {
  const requiredSkills = toSkillList(requiredSkillsInput);
  if (!requiredSkills.length) return null;

  const candidateSkills = toSkillList(candidateSkillsInput);
  const normalizedCandidateSkills = new Set(
    candidateSkills.map((skill) => normalizeSkill(skill)),
  );

  const uniqueRequiredSkills = Array.from(
    new Map(
      requiredSkills.map((skill) => [normalizeSkill(skill), skill]),
    ).values(),
  );

  const matched: string[] = [];
  const missing: string[] = [];

  uniqueRequiredSkills.forEach((skill) => {
    if (normalizedCandidateSkills.has(normalizeSkill(skill))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  });

  const score = Math.round(
    (matched.length / uniqueRequiredSkills.length) * 100,
  );
  const label =
    score >= 70
      ? "Strong match"
      : score >= 40
        ? "Partial match"
        : "Needs upskilling";

  return {
    score,
    matched,
    missing,
    totalRequired: uniqueRequiredSkills.length,
    label,
  };
}
