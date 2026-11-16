import { describe, expect, it } from "vitest";
import {
  canCompleteMilestone,
  checkMonthRequirements,
  getActiveLearningMonth,
  isMonthUnlocked,
  isSafeUrl,
  isTopicVerified,
  monthProgress,
  streaks,
  weekStart,
} from "./calc";
import { MILESTONES, MONTHS, TOPICS, TOTAL_SLOTS } from "@/data/catalog";
import {
  evaluateAssignmentSubmission,
  evaluateQuizSubmission,
  getTopicVerification,
} from "@/data/verification";

describe("curriculum", () => {
  it("has 8 months and 8 milestones", () => {
    expect(MONTHS).toHaveLength(8);
    expect(MILESTONES).toHaveLength(8);
  });
  it("gives every topic and subtopic exactly 3 slots", () => {
    expect(TOTAL_SLOTS).toBe(TOPICS.length * 3);
  });
  it("month 1 milestone is the calculator with 15 mandatory criteria", () => {
    expect(MILESTONES[0]!.title).toBe("Simple Calculator Application");
    expect(MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory")).toHaveLength(15);
  });
});

describe("sequential month unlocking rules", () => {
  it("Month 1 is available initially for a new user", () => {
    const completed = new Set<number>();
    expect(isMonthUnlocked(1, completed)).toBe(true);
    expect(getActiveLearningMonth(completed)).toBe(1);
  });

  it("Months 2–8 start locked for a new user", () => {
    const completed = new Set<number>();
    for (let m = 2; m <= 8; m++) {
      expect(isMonthUnlocked(m, completed)).toBe(false);
    }
  });

  it("completing only some Month 1 topics does not satisfy Month 1 requirements", () => {
    const m1Topics = TOPICS.filter((t) => t.monthId === 1);
    const progressMap = new Map<string, { status: string }>();
    const assessmentsMap = new Map<string, { passed: boolean }>();
    const assignmentsMap = new Map<string, { status: string }>();

    // Complete only the first 5 topics
    for (let i = 0; i < 5; i++) {
      const id = m1Topics[i]!.id;
      progressMap.set(id, { status: "Completed" });
      assessmentsMap.set(id, { passed: true });
      assignmentsMap.set(id, { status: "Passed" });
    }

    const mandIds = MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory").map((c) => c.id);
    const checked = new Set(mandIds);

    const res = checkMonthRequirements({
      monthId: 1,
      topics: m1Topics,
      progressMap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: true,
    });

    expect(res.isAllTopicsDone).toBe(false);
    expect(res.isEligibleForCompletion).toBe(false);
    expect(res.isCompleted).toBe(false);
    expect(isMonthUnlocked(2, new Set())).toBe(false);
  });

  it("completing lessons without passing assessments prevents month completion", () => {
    const m1Topics = TOPICS.filter((t) => t.monthId === 1);
    const progressMap = new Map<string, { status: string }>();
    const assessmentsMap = new Map<string, { passed: boolean }>();
    const assignmentsMap = new Map<string, { status: string }>();

    // Complete all lessons and assignments, but omit assessments
    for (const t of m1Topics) {
      progressMap.set(t.id, { status: "Completed" });
      assignmentsMap.set(t.id, { status: "Passed" });
    }

    const mandIds = MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory").map((c) => c.id);
    const checked = new Set(mandIds);

    const res = checkMonthRequirements({
      monthId: 1,
      topics: m1Topics,
      progressMap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: true,
    });

    expect(res.isAllTopicsDone).toBe(true);
    expect(res.isAllAssessmentsPassed).toBe(false);
    expect(res.isEligibleForCompletion).toBe(false);
    expect(res.missingRequirements.some((r) => r.includes("knowledge check"))).toBe(true);
  });

  it("a failed practical assignment prevents month completion", () => {
    const m1Topics = TOPICS.filter((t) => t.monthId === 1);
    const progressMap = new Map<string, { status: string }>();
    const assessmentsMap = new Map<string, { passed: boolean }>();
    const assignmentsMap = new Map<string, { status: string }>();

    for (const t of m1Topics) {
      progressMap.set(t.id, { status: "Completed" });
      assessmentsMap.set(t.id, { passed: true });
      assignmentsMap.set(t.id, { status: "Passed" });
    }
    // Fail one assignment
    assignmentsMap.set(m1Topics[0]!.id, { status: "Failed" });

    const mandIds = MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory").map((c) => c.id);
    const checked = new Set(mandIds);

    const res = checkMonthRequirements({
      monthId: 1,
      topics: m1Topics,
      progressMap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: true,
    });

    expect(res.isAllAssignmentsPassed).toBe(false);
    expect(res.isEligibleForCompletion).toBe(false);
  });

  it("unchecked milestone criteria prevent month completion", () => {
    const m1Topics = TOPICS.filter((t) => t.monthId === 1);
    const progressMap = new Map<string, { status: string }>();
    const assessmentsMap = new Map<string, { passed: boolean }>();
    const assignmentsMap = new Map<string, { status: string }>();

    for (const t of m1Topics) {
      progressMap.set(t.id, { status: "Completed" });
      assessmentsMap.set(t.id, { passed: true });
      assignmentsMap.set(t.id, { status: "Passed" });
    }

    const mandIds = MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory").map((c) => c.id);
    // Only check half the criteria
    const checked = new Set(mandIds.slice(0, 5));

    const res = checkMonthRequirements({
      monthId: 1,
      topics: m1Topics,
      progressMap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: true,
    });

    expect(res.isMilestoneCriteriaDone).toBe(false);
    expect(res.isEligibleForCompletion).toBe(false);
  });

  it("completing all required Month 1 conditions unlocks Month 2", () => {
    const m1Topics = TOPICS.filter((t) => t.monthId === 1);
    const progressMap = new Map<string, { status: string }>();
    const assessmentsMap = new Map<string, { passed: boolean }>();
    const assignmentsMap = new Map<string, { status: string }>();

    for (const t of m1Topics) {
      progressMap.set(t.id, { status: "Completed" });
      assessmentsMap.set(t.id, { passed: true });
      assignmentsMap.set(t.id, { status: "Passed" });
    }

    const mandIds = MILESTONES[0]!.criteria.filter((c) => c.kind === "mandatory").map((c) => c.id);
    const checked = new Set(mandIds);

    const res = checkMonthRequirements({
      monthId: 1,
      topics: m1Topics,
      progressMap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: true,
    });

    expect(res.isEligibleForCompletion).toBe(true);
    expect(res.isCompleted).toBe(true);

    const completed = new Set([1]);
    expect(isMonthUnlocked(2, completed)).toBe(true);
    expect(getActiveLearningMonth(completed)).toBe(2);
  });

  it("Month 3 remains locked until Month 2 is also completed", () => {
    const completed = new Set([1]);
    expect(isMonthUnlocked(3, completed)).toBe(false);

    // Complete Month 2 as well
    completed.add(2);
    expect(isMonthUnlocked(3, completed)).toBe(true);
    expect(getActiveLearningMonth(completed)).toBe(3);
  });

  it("sequential progression works completely through Month 8", () => {
    const completed = new Set<number>();
    for (let m = 1; m <= 7; m++) {
      expect(isMonthUnlocked(m + 1, completed)).toBe(false);
      completed.add(m);
      expect(isMonthUnlocked(m + 1, completed)).toBe(true);
      expect(getActiveLearningMonth(completed)).toBe(m + 1);
    }
    completed.add(8);
    expect(getActiveLearningMonth(completed)).toBe(8);
  });
});

describe("topic verification tasks & deterministic evaluations", () => {
  it("provides verification tasks for curriculum topics", () => {
    const v = getTopicVerification("m1-t1-s1");
    expect(v).not.toBeNull();
    expect(v?.quiz.questions.length).toBeGreaterThanOrEqual(3);
    expect(v?.assignment.criteria.length).toBeGreaterThanOrEqual(1);
  });

  it("evaluates quiz scores with 80% passing threshold", () => {
    const v = getTopicVerification("m1-t1-s1")!;
    const answers: Record<string, number> = {};

    // Answer all questions correctly
    v.quiz.questions.forEach((q) => {
      answers[q.id] = q.correctIndex;
    });

    const result = evaluateQuizSubmission("m1-t1-s1", answers);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);

    // Answer all questions incorrectly
    v.quiz.questions.forEach((q) => {
      answers[q.id] = (q.correctIndex + 1) % q.options.length;
    });

    const failedResult = evaluateQuizSubmission("m1-t1-s1", answers);
    expect(failedResult.score).toBe(0);
    expect(failedResult.passed).toBe(false);
  });

  it("evaluates practical assignments deterministically", () => {
    const v = getTopicVerification("m1-t2-s2")!; // "Variables and naming conventions"
    const validCode = `
MAX_RETRIES = 5
user_name = "Nikhil"
user_age = 24
is_active = True

def get_profile_summary():
    return {
        "user_name": user_name,
        "user_age": user_age,
        "is_active": is_active,
        "max_retries": MAX_RETRIES
    }
`;
    const res = evaluateAssignmentSubmission(v.assignment, validCode);
    expect(res.passed).toBe(true);

    const invalidCode = "x = 1";
    const failRes = evaluateAssignmentSubmission(v.assignment, invalidCode);
    expect(failRes.passed).toBe(false);
    expect(failRes.missingRequirements.length).toBeGreaterThan(0);
  });

  it("checks topic verification requires lesson, assessment and assignment", () => {
    const progressMap = new Map([["m1-t1", { status: "Completed" }]]);
    const assessmentsMap = new Map([["m1-t1", { passed: true }]]);
    const assignmentsMap = new Map([["m1-t1", { status: "Passed" }]]);

    expect(isTopicVerified("m1-t1", progressMap, assessmentsMap, assignmentsMap)).toBe(true);

    // Missing quiz
    assessmentsMap.set("m1-t1", { passed: false });
    expect(isTopicVerified("m1-t1", progressMap, assessmentsMap, assignmentsMap)).toBe(false);

    // Missing assignment
    assessmentsMap.set("m1-t1", { passed: true });
    assignmentsMap.set("m1-t1", { status: "Pending" });
    expect(isTopicVerified("m1-t1", progressMap, assessmentsMap, assignmentsMap)).toBe(false);
  });
});

describe("streaks", () => {
  it("does not count missed days", () => {
    expect(streaks(["2026-10-10", "2026-10-12", "2026-10-13"], "2026-10-13")).toEqual({
      current: 2,
      longest: 2,
    });
  });
  it("is zero when nothing recorded today or yesterday", () => {
    expect(streaks(["2026-10-01"], "2026-10-13").current).toBe(0);
  });
  it("keeps the streak alive if today is not logged yet", () => {
    expect(streaks(["2026-10-11", "2026-10-12"], "2026-10-13").current).toBe(2);
  });
});

describe("milestone completion", () => {
  it("requires all mandatory criteria", () => {
    expect(canCompleteMilestone(["a", "b"], new Set(["a"]), true)).toBe(false);
  });
  it("requires explicit confirmation", () => {
    expect(canCompleteMilestone(["a"], new Set(["a"]), false)).toBe(false);
    expect(canCompleteMilestone(["a"], new Set(["a"]), true)).toBe(true);
  });
});

describe("misc", () => {
  it("rejects unsafe url protocols", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("https://github.com/x/y")).toBe(true);
  });
  it("month progress weights topics 70 / criteria 30", () => {
    expect(monthProgress(10, 10, 0, 15)).toBe(70);
  });
  it("week starts Monday", () => {
    expect(weekStart("2026-10-13")).toBe("2026-10-12");
  });
});
