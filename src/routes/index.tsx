import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Code2,
  Compass,
  Flame,
  GraduationCap,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Bar, Empty, PageHeader, Stat } from "@/components/AppShell";
import { MILESTONES, topicById, TOPICS } from "@/data/catalog";
import { addDays } from "@/lib/calc";
import { meta } from "@/lib/meta";
import { useStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "Dashboard",
      "Sequential learning command center: current lesson, active tasks, study streak, and milestone progress.",
    ),
  component: Dashboard,
});

const h = (m: number) => `${(m / 60).toFixed(1)}h`;

function Dashboard() {
  const s = useStats();
  const activeMonth = s.activeMonth;
  const month = s.months[activeMonth - 1]!;
  const ms = MILESTONES[activeMonth - 1]!;
  const msProg = s.mprog.find((m) => m.milestone_id === ms.id);
  const nextTopic = s.nextIncompleteTopic;

  // Derive stage for the next topic
  const nextTopicStatus = nextTopic ? s.pmap.get(nextTopic.id)?.status : null;
  const nextTopicQuizPassed = nextTopic ? s.assessmentsMap.get(nextTopic.id)?.passed : false;
  const nextTopicAssignmentPassed = nextTopic
    ? s.assignmentsMap.get(nextTopic.id)?.status === "Passed"
    : false;

  let nextTopicStep = "Study Lesson";
  let nextTopicTab = "learn";
  if (nextTopicStatus === "Completed" && !nextTopicQuizPassed) {
    nextTopicStep = "Pass Knowledge Check";
    nextTopicTab = "verify";
  } else if (nextTopicStatus === "Completed" && nextTopicQuizPassed && !nextTopicAssignmentPassed) {
    nextTopicStep = "Practical Coding Task";
    nextTopicTab = "practice";
  }

  // Today's session time breakdown
  const todaySessions = s.sessions.filter((x) => x.date === s.today);
  const catMin = (c: string) =>
    todaySessions.filter((x) => x.category === c).reduce((a, x) => a + x.minutes, 0);

  const learningMinutes =
    catMin("Learning or Video Lessons") + catMin("Documentation Reading") + catMin("Revision");
  const dsaMinutes = catMin("DSA Practice");
  const projectMinutes = catMin("Project Development");

  // Scheduled / needs revision topics
  const revision = s.progress
    .filter(
      (p) =>
        p.status === "Needs Revision" ||
        (p.next_revision && p.next_revision <= addDays(s.today, 7)),
    )
    .slice(0, 3);

  // Generate Today's Tasks
  const todayTasks: Array<{
    id: string;
    type: "lesson" | "quiz" | "assignment" | "project" | "daily" | "revision";
    title: string;
    subtitle: string;
    isCompleted: boolean;
    to: string;
    search?: Record<string, string | number | boolean | undefined>;
    actionLabel: string;
    icon: typeof BookOpen;
  }> = [];

  // Task 1: Active Topic / Lesson
  if (nextTopic) {
    todayTasks.push({
      id: "active-topic",
      type:
        nextTopicTab === "verify" ? "quiz" : nextTopicTab === "practice" ? "assignment" : "lesson",
      title: `${nextTopicStep}: ${nextTopic.title}`,
      subtitle: `Month ${activeMonth} · ${nextTopic.estHours}h estimated · Practical tasks & quiz`,
      isCompleted: false,
      to: "/learn",
      search: { month: activeMonth, topic: nextTopic.id, tab: nextTopicTab },
      actionLabel:
        nextTopicTab === "verify"
          ? "Take Quiz"
          : nextTopicTab === "practice"
            ? "Open Task"
            : "Continue",
      icon:
        nextTopicTab === "verify" ? GraduationCap : nextTopicTab === "practice" ? Code2 : BookOpen,
    });
  } else {
    todayTasks.push({
      id: "month-checklist",
      type: "lesson",
      title: `Month ${activeMonth} Completion Review`,
      subtitle: `All topics verified! Complete the final month review to unlock Month ${activeMonth + 1}.`,
      isCompleted: s.completedMonthIds.has(activeMonth),
      to: "/learn",
      search: { month: activeMonth, view: "checklist" },
      actionLabel: "Review & Unlock",
      icon: Award,
    });
  }

  // Task 2: Milestone Project Work
  todayTasks.push({
    id: "milestone-work",
    type: "project",
    title: `Project: ${ms.title}`,
    subtitle: `${month.critDone} of ${month.critTotal} acceptance criteria verified · ${msProg?.status ?? "In Progress"}`,
    isCompleted: month.critDone === month.critTotal,
    to: "/projects",
    actionLabel: "Project Workspace",
    icon: Code2,
  });

  // Task 3: Daily Learning Target
  todayTasks.push({
    id: "daily-target",
    type: "daily",
    title: `Daily Study Goal: ${s.todayMinutes} / ${s.settings.daily_goal_minutes} mins`,
    subtitle: `${learningMinutes}m learning · ${projectMinutes}m building · ${dsaMinutes}m DSA practice`,
    isCompleted: s.todayMinutes >= s.settings.daily_goal_minutes,
    to: "/daily",
    actionLabel: "Log Focus Time",
    icon: Clock,
  });

  // Task 4: Revision if any
  if (revision.length > 0) {
    const revTopic = topicById.get(revision[0]!.topic_id);
    if (revTopic) {
      todayTasks.push({
        id: "topic-revision",
        type: "revision",
        title: `Spaced Revision: ${revTopic.title}`,
        subtitle: `Scheduled review to strengthen retention`,
        isCompleted: false,
        to: "/learn",
        search: { month: revTopic.monthId, topic: revTopic.id },
        actionLabel: "Review Lesson",
        icon: RotateCcw,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Learning Command Header */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-linear-to-r from-primary/10 via-background to-accent/20 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Month {activeMonth} Active Phase
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                Sequential Learning Gated
              </span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {s.completedMonthIds.size} of 8 Months Mastered
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Learning Command Center
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {nextTopic ? (
                <>
                  Current Lesson:{" "}
                  <span className="font-semibold text-foreground">{nextTopic.title}</span> —{" "}
                  <span className="text-primary font-medium">{nextTopicStep}</span>. Follow the{" "}
                  <strong>Learn → Practice → Verify → Complete</strong> sequence to advance.
                </>
              ) : (
                <>
                  You have verified all lessons in Month {activeMonth}! Open the{" "}
                  <strong>Month Checklist</strong> to confirm criteria and unlock Month{" "}
                  {activeMonth + 1}.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/learn"
              search={
                nextTopic
                  ? { month: activeMonth, topic: nextTopic.id, tab: nextTopicTab }
                  : { month: activeMonth, view: "checklist" }
              }
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              <Play className="h-4 w-4 fill-current" />
              Continue Learning
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/learn"
              search={{ month: activeMonth, view: "checklist" }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Award className="h-4 w-4 text-primary" />
              Month Checklist
            </Link>
          </div>
        </div>
      </div>

      {/* Top 7 KPIs required by specification */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Current Month" value={`Month ${activeMonth}`} hint={month.title} />
        <Stat
          label="Current Lesson"
          value={
            <span
              className="truncate block text-sm font-semibold"
              title={nextTopic?.title ?? "Completed"}
            >
              {nextTopic?.title ?? "All Verified"}
            </span>
          }
          hint={nextTopicStep}
        />
        <Stat
          label="Month Progress"
          value={`${month.progress}%`}
          hint={`${month.done}/${month.total} topics done`}
        />
        <Stat
          label="Roadmap Progress"
          value={`${s.overall}%`}
          hint={`${s.completed}/${s.topicsTotal} total topics`}
        />
        <Stat
          label="Today's Target"
          value={`${s.todayMinutes}m`}
          hint={`Goal: ${s.settings.daily_goal_minutes}m (${s.dailyPct}%)`}
        />
        <Stat
          label="Study Streak"
          value={
            <span className="flex items-center gap-1.5">
              <Flame className="h-5 w-5 text-warning" />
              {s.streak.current}d
            </span>
          }
          hint={`Best: ${s.streak.longest}d`}
        />
        <Stat
          label="Next Milestone"
          value={
            <span className="truncate block text-sm font-semibold" title={ms.title}>
              {ms.title}
            </span>
          }
          hint={`${month.critDone}/${month.critTotal} criteria`}
        />
      </div>

      {/* Main Content Grid: Today's Tasks + Active Month Overview */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Today's Tasks */}
        <div className="space-y-4 lg:col-span-7">
          <div className="panel p-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold">Today's Tasks</h2>
                <p className="text-xs text-muted-foreground">
                  Actionable learning milestones derived from your active curriculum progress.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {todayTasks.filter((t) => t.isCompleted).length} / {todayTasks.length} Done
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {todayTasks.map((task) => {
                const Icon = task.icon;
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                      task.isCompleted
                        ? "border-success/30 bg-success/5"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          task.isCompleted
                            ? "bg-success/20 text-success"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              task.isCompleted && "line-through text-muted-foreground",
                            )}
                          >
                            {task.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:self-center">
                      <Link
                        to={task.to}
                        search={task.search}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                          task.isCompleted
                            ? "border border-border bg-muted text-muted-foreground hover:bg-accent"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        )}
                      >
                        {task.actionLabel}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick time log footer */}
            <div className="mt-5 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span>Daily goal: {s.settings.daily_goal_minutes} mins</span>
              <Link to="/daily" className="text-primary hover:underline font-medium">
                Log study session →
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Active Month Spotlight & Project Status */}
        <div className="space-y-4 lg:col-span-5">
          {/* Active Month Spotlight */}
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="stat-label">Active Learning Month</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {month.status}
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold">
              Month {activeMonth}: {month.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {month.goal}
            </p>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Month Completion</span>
                <span className="font-mono font-semibold">{month.progress}%</span>
              </div>
              <Bar value={month.progress} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">Lessons Done</div>
                <div className="mt-1 font-mono font-bold text-foreground">
                  {month.done} / {month.total}
                </div>
              </div>
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">Quizzes Passed</div>
                <div className="mt-1 font-mono font-bold text-foreground">
                  {month.assessmentPassCount} / {month.total}
                </div>
              </div>
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">Tasks Passed</div>
                <div className="mt-1 font-mono font-bold text-foreground">
                  {month.assignmentPassCount} / {month.total}
                </div>
              </div>
              <div className="rounded-md border p-2.5">
                <div className="text-muted-foreground">Milestone Criteria</div>
                <div className="mt-1 font-mono font-bold text-foreground">
                  {month.critDone} / {month.critTotal}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to="/learn"
                search={{ month: activeMonth }}
                className="flex-1 rounded-md bg-primary py-2 text-center text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Open Workspace
              </Link>
              <Link
                to="/learn"
                search={{ month: activeMonth, view: "checklist" }}
                className="rounded-md border px-3 py-2 text-center text-xs font-medium hover:bg-accent"
              >
                Checklist
              </Link>
            </div>
          </div>

          {/* Current Milestone Spotlight */}
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="stat-label">Milestone {activeMonth}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {msProg?.status ?? "Not Started"}
              </span>
            </div>
            <h3 className="mt-1 font-semibold">{ms.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{ms.subtitle}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Acceptance Criteria</span>
                <span className="font-mono text-xs">
                  {month.critDone} / {month.critTotal} (
                  {Math.round((month.critDone / month.critTotal) * 100)}%)
                </span>
              </div>
              <Bar value={(month.critDone / month.critTotal) * 100} />
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
              <span className="text-muted-foreground">Estimated time: {ms.estimatedHours}h</span>
              <Link to="/projects" className="text-primary hover:underline font-medium">
                Milestone details →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subdued Sequential Roadmap Preview (8 Months) */}
      <div className="panel p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-semibold">8-Month Sequential Journey</h2>
            <p className="text-xs text-muted-foreground">
              Each month is gated sequentially. Pass all lessons, quizzes, assignments, and project
              criteria to unlock the next stage.
            </p>
          </div>
          <Link to="/roadmap" className="text-xs text-primary hover:underline font-medium shrink-0">
            View full roadmap details →
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          {s.months.map((m) => {
            const isCompleted = s.completedMonthIds.has(m.id);
            const isActive = m.id === activeMonth;
            const isUnlocked = m.isUnlocked;

            return (
              <div
                key={m.id}
                className={cn(
                  "relative flex flex-col justify-between rounded-lg border p-3.5 transition-all",
                  isActive && "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs",
                  isCompleted && "border-success/40 bg-success/5",
                  !isUnlocked && "border-dashed border-border/60 bg-muted/30 opacity-70",
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      M{m.id}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : isActive ? (
                      <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="mt-1.5 font-semibold text-xs line-clamp-1">{m.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isCompleted ? "Completed" : isActive ? "Active" : "Locked"}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-mono">{m.progress}%</span>
                  </div>
                  <Bar value={m.progress} />

                  <div className="mt-2 text-center">
                    {isUnlocked ? (
                      <Link
                        to="/learn"
                        search={{ month: m.id }}
                        className={cn(
                          "block rounded py-1 text-[11px] font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                            : "bg-accent hover:bg-accent/80 text-foreground",
                        )}
                      >
                        {isActive ? "Continue" : "Review"}
                      </Link>
                    ) : (
                      <span className="block py-1 text-[11px] text-muted-foreground">Locked</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
