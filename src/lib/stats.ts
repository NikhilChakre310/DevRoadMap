import { MILESTONES, MONTHS, TOPICS, TOTAL_SLOTS, type Topic } from "@/data/catalog";
import {
  addDays,
  checkMonthRequirements,
  getActiveLearningMonth,
  isMonthUnlocked,
  localDay,
  pct,
  streaks,
  weekStart,
  type MonthRequirementsResult,
} from "./calc";
import { useRows, useSettings } from "./data";

export const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
export const heatLevel = (min: number) =>
  min <= 0 ? 0 : min < 30 ? 1 : min < 90 ? 2 : min < 180 ? 3 : 4;

export function useStats() {
  const { settings } = useSettings();
  const sessions = useRows("study_sessions").data ?? [];
  const progress = useRows("topic_progress").data ?? [];
  const subs = useRows("topic_submissions").data ?? [];
  const mprog = useRows("milestone_progress").data ?? [];
  const checks = useRows("criterion_checks").data ?? [];
  const problems = useRows("dsa_problems").data ?? [];
  const repos = useRows("github_repos").data ?? [];
  const monthCompletions = useRows("month_completions").data ?? [];
  const assessments = useRows("topic_assessments").data ?? [];
  const assignments = useRows("topic_assignments").data ?? [];

  const today = localDay(new Date(), settings.timezone);
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.minutes);
  const activeDays = [...byDay.entries()].filter(([, m]) => m > 0).map(([d]) => d);
  const st = streaks(activeDays, today);
  const totalMinutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const ws = weekStart(today);
  const weekMinutes = sessions
    .filter((s) => s.date >= ws && s.date <= today)
    .reduce((a, s) => a + s.minutes, 0);
  const todayMinutes = byDay.get(today) ?? 0;

  const pmap = new Map(progress.map((p) => [p.topic_id, p]));
  const assessmentsMap = new Map(assessments.map((a) => [a.topic_id, a]));
  const assignmentsMap = new Map(assignments.map((a) => [a.topic_id, a]));
  const completed = progress.filter((p) => p.status === "Completed").length;
  const needsRevision = progress.filter((p) => p.status === "Needs Revision").length;
  const checked = new Set(checks.map((c) => c.criterion_id));

  // Determine completed month IDs
  const completedMonthIds = new Set<number>();
  for (const mc of monthCompletions) {
    if (mc.confirmed_complete || mc.status === "Completed") {
      completedMonthIds.add(mc.month_id);
    }
  }

  const activeMonth = getActiveLearningMonth(completedMonthIds);

  const months = MONTHS.map((m) => {
    const ts = TOPICS.filter((t) => t.monthId === m.id);
    const mand = MILESTONES[m.id - 1]!.criteria.filter((c) => c.kind === "mandatory");
    const mandIds = mand.map((c) => c.id);
    const mcRecord = monthCompletions.find((mc) => mc.month_id === m.id);
    const isConfirmed = mcRecord?.confirmed_complete ?? false;

    const reqs: MonthRequirementsResult = checkMonthRequirements({
      monthId: m.id,
      topics: ts,
      progressMap: pmap,
      assessmentsMap,
      assignmentsMap,
      mandatoryCriterionIds: mandIds,
      checkedCriterionIds: checked,
      confirmedComplete: isConfirmed,
    });

    const isUnlocked = isMonthUnlocked(m.id, completedMonthIds);
    const status: "Locked" | "Active" | "Completed" = reqs.isCompleted
      ? "Completed"
      : isUnlocked
        ? m.id === activeMonth
          ? "Active"
          : "Active"
        : "Locked";

    return {
      ...m,
      total: ts.length,
      done: reqs.completedTopics,
      critTotal: mand.length,
      critDone: reqs.mandatoryCriteriaChecked,
      progress: reqs.progressPct,
      isUnlocked,
      status,
      requirements: reqs,
      assessmentPassCount: reqs.passedAssessments,
      assignmentPassCount: reqs.passedAssignments,
    };
  });

  const filledSlots = subs.filter((s) => s.repo_url || s.live_url || s.demo_url).length;
  const completedSlots = subs.filter((s) => s.status === "Completed").length;
  const solved = problems.filter((p) => p.status === "Solved");

  // Find next incomplete lesson for the active month
  const activeMonthObj = months[activeMonth - 1] || months[0]!;
  const activeMonthTopics = TOPICS.filter((t) => t.monthId === activeMonth);
  const nextIncompleteTopic =
    activeMonthTopics.find((t) => {
      const isDone = pmap.get(t.id)?.status === "Completed";
      const isQuizPassed = assessmentsMap.get(t.id)?.passed === true;
      const isAsgPassed = assignmentsMap.get(t.id)?.status === "Passed";
      return !isDone || !isQuizPassed || !isAsgPassed;
    }) ??
    activeMonthTopics[0] ??
    null;

  const last = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const d = addDays(today, i - n + 1);
      return { date: d, minutes: byDay.get(d) ?? 0 };
    });

  return {
    settings,
    today,
    sessions,
    progress,
    pmap,
    assessments,
    assessmentsMap,
    assignments,
    assignmentsMap,
    monthCompletions,
    completedMonthIds,
    activeMonth,
    activeMonthObj,
    nextIncompleteTopic,
    subs,
    mprog,
    checked,
    problems,
    repos,
    byDay,
    last,
    streak: st,
    totalMinutes,
    weekMinutes,
    todayMinutes,
    completed,
    needsRevision,
    topicsTotal: TOPICS.length,
    topicPct: pct(completed, TOPICS.length),
    milestonesDone: completedMonthIds.size,
    months,
    overall: Math.round(months.reduce((a, m) => a + m.progress, 0) / months.length),
    totalSlots: TOTAL_SLOTS,
    filledSlots,
    completedSlots,
    solved,
    dailyPct: pct(todayMinutes, settings.daily_goal_minutes),
  };
}

/** Current month index (1..8) */
export function currentMonth(start: string | null, today: string) {
  if (!start) return 1;
  const days = (new Date(today).getTime() - new Date(start).getTime()) / 86400000;
  return Math.min(8, Math.max(1, Math.floor(days / 30) + 1));
}
