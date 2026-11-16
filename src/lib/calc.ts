// Pure progress calculations. All numbers derive from stored records only.

export function isSafeUrl(v: string | null | undefined): boolean {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function localDay(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Streaks from days with at least one recorded session of >0 minutes. */
export function streaks(activeDays: string[], today: string): { current: number; longest: number } {
  const set = new Set(activeDays);
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  // Current streak: counts back from today; if today has nothing yet, from yesterday.
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function pct(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/** A milestone can be completed only when all mandatory criteria are checked and the user confirms. */
export function canCompleteMilestone(
  mandatoryIds: string[],
  checked: Set<string>,
  confirmed: boolean,
): boolean {
  return confirmed && mandatoryIds.every((id) => checked.has(id));
}

/** Month progress: 70% topic completion, 30% milestone mandatory criteria. */
export function monthProgress(
  topicsDone: number,
  topicsTotal: number,
  critDone: number,
  critTotal: number,
): number {
  const t = topicsTotal ? topicsDone / topicsTotal : 0;
  const c = critTotal ? critDone / critTotal : 0;
  return Math.round((t * 0.7 + c * 0.3) * 100);
}

export function weekStart(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -dow);
}

export { addDays };

export type TopicProgressLike = { status: string };
export type AssessmentLike = { passed: boolean };
export type AssignmentLike = { status: string };

/**
 * Checks if an individual topic is fully verified (lesson completed, assessment passed, assignment passed).
 */
export function isTopicVerified(
  topicId: string,
  progressMap: Map<string, TopicProgressLike>,
  assessmentsMap: Map<string, AssessmentLike>,
  assignmentsMap: Map<string, AssignmentLike>,
): boolean {
  const p = progressMap.get(topicId);
  const asm = assessmentsMap.get(topicId);
  const asg = assignmentsMap.get(topicId);

  const isCompleted = p?.status === "Completed";
  const isQuizPassed = asm?.passed === true;
  const isAssignmentPassed = asg?.status === "Passed";

  return isCompleted && isQuizPassed && isAssignmentPassed;
}

export type MonthRequirementsResult = {
  monthId: number;
  totalTopics: number;
  completedTopics: number;
  passedAssessments: number;
  passedAssignments: number;
  mandatoryCriteriaTotal: number;
  mandatoryCriteriaChecked: number;
  isAllTopicsDone: boolean;
  isAllAssessmentsPassed: boolean;
  isAllAssignmentsPassed: boolean;
  isMilestoneCriteriaDone: boolean;
  isEligibleForCompletion: boolean;
  isCompleted: boolean;
  progressPct: number;
  missingRequirements: string[];
  nextIncompleteItem: {
    type: "lesson" | "assessment" | "assignment" | "milestone";
    topicId?: string;
    title?: string;
  } | null;
};

/**
 * Centrally evaluates all required completion conditions for a month:
 * 1. All required topics and subtopics are completed.
 * 2. Every required topic assessment has been passed.
 * 3. Every required practical assignment has been submitted and passed.
 * 4. All mandatory milestone acceptance criteria are checked.
 * 5. User explicitly confirms the final month completion.
 */
export function checkMonthRequirements(params: {
  monthId: number;
  topics: Array<{ id: string; title: string }>;
  progressMap: Map<string, TopicProgressLike>;
  assessmentsMap: Map<string, AssessmentLike>;
  assignmentsMap: Map<string, AssignmentLike>;
  mandatoryCriterionIds: string[];
  checkedCriterionIds: Set<string>;
  confirmedComplete: boolean;
}): MonthRequirementsResult {
  const {
    monthId,
    topics,
    progressMap,
    assessmentsMap,
    assignmentsMap,
    mandatoryCriterionIds,
    checkedCriterionIds,
    confirmedComplete,
  } = params;

  const totalTopics = topics.length;
  let completedTopics = 0;
  let passedAssessments = 0;
  let passedAssignments = 0;

  let nextIncompleteItem: MonthRequirementsResult["nextIncompleteItem"] = null;

  for (const t of topics) {
    const isDone = progressMap.get(t.id)?.status === "Completed";
    const isQuizPassed = assessmentsMap.get(t.id)?.passed === true;
    const isAsgPassed = assignmentsMap.get(t.id)?.status === "Passed";

    if (isDone) completedTopics++;
    if (isQuizPassed) passedAssessments++;
    if (isAsgPassed) passedAssignments++;

    if (!nextIncompleteItem) {
      if (!isDone) {
        nextIncompleteItem = { type: "lesson", topicId: t.id, title: t.title };
      } else if (!isAsgPassed) {
        nextIncompleteItem = { type: "assignment", topicId: t.id, title: t.title };
      } else if (!isQuizPassed) {
        nextIncompleteItem = { type: "assessment", topicId: t.id, title: t.title };
      }
    }
  }

  const mandatoryCriteriaTotal = mandatoryCriterionIds.length;
  const mandatoryCriteriaChecked = mandatoryCriterionIds.filter((id) =>
    checkedCriterionIds.has(id),
  ).length;

  if (!nextIncompleteItem && mandatoryCriteriaChecked < mandatoryCriteriaTotal) {
    nextIncompleteItem = {
      type: "milestone",
      title: `Month ${monthId} Milestone Acceptance Criteria`,
    };
  }

  const isAllTopicsDone = totalTopics > 0 && completedTopics === totalTopics;
  const isAllAssessmentsPassed = totalTopics > 0 && passedAssessments === totalTopics;
  const isAllAssignmentsPassed = totalTopics > 0 && passedAssignments === totalTopics;
  const isMilestoneCriteriaDone =
    mandatoryCriteriaTotal > 0 && mandatoryCriteriaChecked === mandatoryCriteriaTotal;

  const isEligibleForCompletion =
    isAllTopicsDone && isAllAssessmentsPassed && isAllAssignmentsPassed && isMilestoneCriteriaDone;

  const isCompleted = isEligibleForCompletion && confirmedComplete;

  const missingRequirements: string[] = [];
  if (!isAllTopicsDone) {
    missingRequirements.push(
      `${totalTopics - completedTopics} topic lesson${totalTopics - completedTopics > 1 ? "s" : ""} incomplete`,
    );
  }
  if (!isAllAssessmentsPassed) {
    missingRequirements.push(
      `${totalTopics - passedAssessments} topic knowledge check${totalTopics - passedAssessments > 1 ? "s" : ""} pending`,
    );
  }
  if (!isAllAssignmentsPassed) {
    missingRequirements.push(
      `${totalTopics - passedAssignments} practical coding assignment${totalTopics - passedAssignments > 1 ? "s" : ""} pending`,
    );
  }
  if (!isMilestoneCriteriaDone) {
    missingRequirements.push(
      `${mandatoryCriteriaTotal - mandatoryCriteriaChecked} milestone acceptance criteria unchecked`,
    );
  }
  if (isEligibleForCompletion && !confirmedComplete) {
    missingRequirements.push("Final month completion confirmation required");
  }

  // Weighted progress calculation: 40% topics, 20% quizzes, 20% assignments, 20% milestone criteria
  const tRatio = totalTopics ? completedTopics / totalTopics : 0;
  const qRatio = totalTopics ? passedAssessments / totalTopics : 0;
  const aRatio = totalTopics ? passedAssignments / totalTopics : 0;
  const mRatio = mandatoryCriteriaTotal ? mandatoryCriteriaChecked / mandatoryCriteriaTotal : 0;

  const progressPct = isCompleted
    ? 100
    : Math.round((tRatio * 0.4 + qRatio * 0.2 + aRatio * 0.2 + mRatio * 0.2) * 100);

  return {
    monthId,
    totalTopics,
    completedTopics,
    passedAssessments,
    passedAssignments,
    mandatoryCriteriaTotal,
    mandatoryCriteriaChecked,
    isAllTopicsDone,
    isAllAssessmentsPassed,
    isAllAssignmentsPassed,
    isMilestoneCriteriaDone,
    isEligibleForCompletion,
    isCompleted,
    progressPct,
    missingRequirements,
    nextIncompleteItem,
  };
}

/**
 * Checks if Month M is unlocked.
 * Month 1 is ALWAYS unlocked.
 * Month M (>1) is unlocked if and only if all preceding months (1 .. M-1) are completed.
 */
export function isMonthUnlocked(
  monthId: number,
  completedMonthIds: Set<number> | number[],
): boolean {
  if (monthId <= 1) return true;
  if (monthId > 8) return false;

  const set = Array.isArray(completedMonthIds) ? new Set(completedMonthIds) : completedMonthIds;

  for (let m = 1; m < monthId; m++) {
    if (!set.has(m)) return false;
  }
  return true;
}

/**
 * Returns the active month index (the earliest unlocked incomplete month 1..8).
 */
export function getActiveLearningMonth(completedMonthIds: Set<number> | number[]): number {
  const set = Array.isArray(completedMonthIds) ? new Set(completedMonthIds) : completedMonthIds;

  for (let m = 1; m <= 8; m++) {
    if (!set.has(m)) return m;
  }
  return 8; // All 8 completed
}
