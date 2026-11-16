import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Code2,
  FolderKanban,
  HelpCircle,
  Lock,
  Sparkles,
  Trophy,
  Unlock,
} from "lucide-react";
import { Bar, PageHeader, Stat } from "@/components/AppShell";
import { setTopicStatus, TopicDetail } from "@/components/TopicDetail";
import { MILESTONES, MONTHS, subtopicsOf, TOPICS, type Topic } from "@/data/catalog";
import { isTopicVerified, pct } from "@/lib/calc";
import { useInvalidate } from "@/lib/data";
import { meta } from "@/lib/meta";
import { useStats } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    meta(
      "Sequential Roadmap",
      "Eight-month gated engineering curriculum. Master each month to unlock the next.",
    ),
  component: Roadmap,
});

function Roadmap() {
  const s = useStats();
  const inv = useInvalidate();
  const [openMonth, setOpenMonth] = useState<number | null>(s.activeMonth);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [sel, setSel] = useState<Topic | null>(null);

  const slotCount = (id: string) =>
    s.subs.filter((x) => x.topic_id === id && (x.repo_url || x.live_url || x.demo_url)).length;

  const Row = ({ t, sub }: { t: Topic; sub?: boolean }) => {
    const isVerified = isTopicVerified(t.id, s.pmap, s.assessmentsMap, s.assignmentsMap);
    const isDone = s.pmap.get(t.id)?.status === "Completed";
    const hasQuiz = s.assessmentsMap.get(t.id)?.passed === true;
    const hasAsg = s.assignmentsMap.get(t.id)?.status === "Passed";

    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-accent/60",
          sub && "pl-8",
        )}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={async (c) => {
            await setTopicStatus(t.id, c ? "Completed" : "In Progress");
            inv("topic_progress");
          }}
          aria-label={`Mark ${t.title} complete`}
        />
        <button
          className="flex-1 text-left text-xs font-medium hover:text-primary transition"
          onClick={() => setSel(t)}
        >
          {t.title}
        </button>

        {/* Verification badges */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
          <span
            title="Practical Coding Assignment"
            className={cn(
              "flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono",
              hasAsg ? "bg-success/15 text-success font-medium" : "bg-muted text-muted-foreground",
            )}
          >
            <Code2 className="h-3 w-3" />
            {hasAsg ? "Code" : "—"}
          </span>
          <span
            title="Knowledge Check Quiz"
            className={cn(
              "flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono",
              hasQuiz ? "bg-primary/15 text-primary font-medium" : "bg-muted text-muted-foreground",
            )}
          >
            <HelpCircle className="h-3 w-3" />
            {hasQuiz ? "Quiz" : "—"}
          </span>
        </div>

        <span
          className="font-mono text-xs text-muted-foreground"
          title="Project slots with submissions"
        >
          {slotCount(t.id)}/3 slots
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sequential Learning Roadmap"
        sub="An eight-month software engineering curriculum. Complete all lessons, assessments, and capstone milestones in each month to unlock the next."
      >
        <Link
          to="/learn"
          search={{ month: s.activeMonth }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
        >
          <Sparkles className="h-4 w-4" />
          Enter Active Month {s.activeMonth} Workspace
        </Link>
      </PageHeader>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Stat
          label="Active stage"
          value={`Month ${s.activeMonth} of 8`}
          hint={s.months[s.activeMonth - 1]?.title}
        />
        <Stat
          label="Months unlocked"
          value={`${s.completedMonthIds.size + 1} / 8`}
          hint={`${s.completedMonthIds.size} completed`}
        />
        <Stat
          label="Topics verified"
          value={`${s.completed} / ${s.topicsTotal}`}
          hint={`${s.topicPct}% complete`}
        />
        <Stat label="Overall progress" value={`${s.overall}%`} hint="weighted roadmap completion" />
        <Stat
          label="Milestones confirmed"
          value={`${s.completedMonthIds.size} / 8`}
          hint="capstone projects"
        />
      </div>

      {/* 8-Stage Sequential Roadmap Cards */}
      <div className="space-y-4">
        {MONTHS.map((m) => {
          const mData = s.months[m.id - 1]!;
          const ms = MILESTONES[m.id - 1]!;
          const open = openMonth === m.id;
          const isUnlocked = mData.isUnlocked;
          const isCompleted = mData.status === "Completed";
          const isActive = mData.status === "Active" && m.id === s.activeMonth;

          const estHours = TOPICS.filter((t) => t.monthId === m.id).reduce(
            (acc, t) => acc + t.estHours,
            0,
          );
          const actualHours = (
            s.sessions.filter((x) => x.month_id === m.id).reduce((a, x) => a + x.minutes, 0) / 60
          ).toFixed(1);

          return (
            <div
              key={m.id}
              className={cn(
                "rounded-xl border transition-all bg-card shadow-sm",
                isActive && "border-primary/60 shadow-md ring-1 ring-primary/30",
                isCompleted && "border-success/40",
                !isUnlocked && "opacity-80 border-dashed bg-muted/20",
              )}
            >
              {/* Header Bar */}
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display font-bold text-lg",
                      isCompleted && "bg-success/15 text-success",
                      isActive && "bg-primary/20 text-primary",
                      !isUnlocked && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isUnlocked ? (
                      `M${m.id}`
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="stat-label">Month {m.id}</span>
                      {isCompleted ? (
                        <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : isActive ? (
                        <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Active Workspace
                        </span>
                      ) : isUnlocked ? (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground">
                          Available
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Locked
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-lg font-bold mt-0.5">{m.title}</h2>
                    <p className="text-xs text-muted-foreground max-w-2xl mt-0.5">{m.goal}</p>
                  </div>
                </div>

                {/* Progress & Quick Actions */}
                <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                  <div className="w-36 text-right">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-bold">{mData.progress}%</span>
                    </div>
                    <Bar value={mData.progress} />
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <Link
                        to="/learn"
                        search={{ month: m.id }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition",
                          isActive
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "border bg-background hover:bg-accent",
                        )}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {isCompleted ? "Review Workspace" : "Open Workspace"}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        className="text-xs text-muted-foreground gap-1.5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Complete Month {m.id - 1} to Unlock
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setOpenMonth(open ? null : m.id)}
                      aria-label="Toggle Syllabus"
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Collapsible Syllabus & Verification Inspection */}
              {open && (
                <div className="border-t p-5 space-y-4 bg-muted/10 rounded-b-xl">
                  {/* Month Telemetry Row */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    <div className="panel p-3">
                      <div className="stat-label">Topics Verified</div>
                      <div className="font-mono font-semibold mt-1">
                        {mData.done} / {mData.total}
                      </div>
                    </div>
                    <div className="panel p-3">
                      <div className="stat-label">Quizzes Passed</div>
                      <div className="font-mono font-semibold mt-1">
                        {mData.assessmentPassCount} / {mData.total}
                      </div>
                    </div>
                    <div className="panel p-3">
                      <div className="stat-label">Assignments Passed</div>
                      <div className="font-mono font-semibold mt-1">
                        {mData.assignmentPassCount} / {mData.total}
                      </div>
                    </div>
                    <div className="panel p-3">
                      <div className="stat-label">Est. vs Actual Time</div>
                      <div className="font-mono font-semibold mt-1">
                        {actualHours}h / {estHours}h
                      </div>
                    </div>
                  </div>

                  {/* Capstone Milestone Card */}
                  <div className="rounded-xl border border-dashed p-4 bg-background/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-warning" />
                        <span className="stat-label text-xs">Monthly Capstone Milestone</span>
                      </div>
                      <div className="font-semibold text-sm mt-0.5">{ms.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {mData.critDone} of {mData.critTotal} mandatory criteria verified ·{" "}
                        {m.completionRule}
                      </div>
                    </div>
                    <Link
                      to="/projects"
                      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:border-primary transition"
                    >
                      <FolderKanban className="h-3.5 w-3.5 text-primary" />
                      View Project Spec & Criteria
                    </Link>
                  </div>

                  {/* Topics List */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Required Lessons & Verification Tasks
                    </h4>
                    {m.topics.map((t, idx) => {
                      const subs = subtopicsOf(t.id);
                      const isSubOpen = openTopic === t.id;
                      const doneSubs = subs.filter(
                        (x) => s.pmap.get(x.id)?.status === "Completed",
                      ).length;

                      return (
                        <div key={t.id} className="rounded-lg border bg-background">
                          <div className="flex items-center gap-2 p-2.5">
                            {subs.length > 0 ? (
                              <button
                                onClick={() => setOpenTopic(isSubOpen ? null : t.id)}
                                aria-label="Toggle subtopics"
                                className="p-1 hover:bg-accent rounded"
                              >
                                {isSubOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6" />
                            )}
                            <span className="stat-label w-5 text-center">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <Row t={t} />
                            </div>
                            {subs.length > 0 && (
                              <span className="font-mono text-xs text-muted-foreground">
                                {doneSubs}/{subs.length} subtopics
                              </span>
                            )}
                          </div>

                          {isSubOpen && subs.length > 0 && (
                            <div className="border-t p-2 space-y-1 bg-muted/5">
                              {subs.map((x) => (
                                <Row key={x.id} t={x} sub />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <TopicDetail topic={sel} onClose={() => setSel(null)} />
    </div>
  );
}
