import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Circle,
  Code2,
  ExternalLink,
  Flame,
  HelpCircle,
  Lock,
  RotateCcw,
  Sparkles,
  Trophy,
  Unlock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Bar, PageHeader, Stat } from "@/components/AppShell";
import { MILESTONES, MONTHS, RESOURCES, TOPICS, type Topic } from "@/data/catalog";
import {
  evaluateAssignmentSubmission,
  evaluateQuizSubmission,
  getTopicVerification,
  type TopicVerification,
} from "@/data/verification";
import { isMonthUnlocked, isTopicVerified } from "@/lib/calc";
import { useInvalidate, useRows, useSettings } from "@/lib/data";
import { meta } from "@/lib/meta";
import { useStats } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchParams = {
  month?: number;
  topic?: string;
  view?: "learn" | "checklist";
};

export const Route = createFileRoute("/learn")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      month: search.month ? Number(search.month) : undefined,
      topic: typeof search.topic === "string" ? search.topic : undefined,
      view: search.view === "checklist" ? "checklist" : "learn",
    };
  },
  head: () =>
    meta(
      "Guided Learning Workspace",
      "Step-by-step sequential learning: Learn, Practice, Verify, and Complete.",
    ),
  component: LearnPage,
});

function LearnPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const s = useStats();
  const inv = useInvalidate();

  const [activeTab, setActiveTab] = useState<"learn" | "practice" | "verify" | "notes">("learn");

  // Determine current month
  const currentMonthId = search.month ?? s.activeMonth ?? 1;
  const isUnlocked = isMonthUnlocked(currentMonthId, s.completedMonthIds);

  const monthTopics = TOPICS.filter((t) => t.monthId === currentMonthId);
  const currentTopicId =
    search.topic ??
    (s.nextIncompleteTopic?.monthId === currentMonthId
      ? s.nextIncompleteTopic.id
      : monthTopics[0]?.id) ??
    "m1-t1-s1";

  const currentTopic = monthTopics.find((t) => t.id === currentTopicId) ?? monthTopics[0]!;
  const currentTopicIndex = monthTopics.findIndex((t) => t.id === currentTopic?.id);
  const prevTopic = currentTopicIndex > 0 ? monthTopics[currentTopicIndex - 1] : null;
  const nextTopic =
    currentTopicIndex < monthTopics.length - 1 ? monthTopics[currentTopicIndex + 1] : null;

  const currentVerification = currentTopic ? getTopicVerification(currentTopic.id) : null;
  const monthData = s.months[currentMonthId - 1]!;
  const milestone = MILESTONES[currentMonthId - 1]!;

  // User progress data for current topic
  const topicProg = s.pmap.get(currentTopic?.id ?? "");
  const assessmentRecord = s.assessmentsMap.get(currentTopic?.id ?? "");
  const assignmentRecord = s.assignmentsMap.get(currentTopic?.id ?? "");

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Assignment code state
  const [assignmentCode, setAssignmentCode] = useState("");
  const [assignmentFeedback, setAssignmentFeedback] = useState<{
    passed: boolean;
    feedback: string;
    missing: string[];
  } | null>(null);

  // Personal notes state
  const [notesText, setNotesText] = useState("");

  // Month confirmation state
  const [confirmMonthChecked, setConfirmMonthChecked] = useState(false);
  const [completingMonth, setCompletingMonth] = useState(false);

  // Sync state when topic changes
  useEffect(() => {
    if (!currentVerification) return;
    setAssignmentCode(
      assignmentRecord?.submission_content ?? currentVerification.assignment.starterCode ?? "",
    );
    setAssignmentFeedback(
      assignmentRecord
        ? {
            passed: assignmentRecord.status === "Passed",
            feedback: assignmentRecord.feedback ?? "Previously submitted",
            missing: [],
          }
        : null,
    );
    setSelectedAnswers(
      assessmentRecord?.answers && typeof assessmentRecord.answers === "object"
        ? (assessmentRecord.answers as Record<string, number>)
        : {},
    );
    setQuizSubmitted(!!assessmentRecord);
    setQuizScore(assessmentRecord?.score ?? null);
    setNotesText(topicProg?.notes ?? "");
    setActiveTab("learn");
  }, [currentTopic?.id, assessmentRecord?.id, assignmentRecord?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resume tracking: save active topic to user_settings
  useEffect(() => {
    if (isUnlocked && currentTopic && s.settings.active_topic_id !== currentTopic.id) {
      supabase.from("user_settings").upsert(
        {
          active_month: currentMonthId,
          active_topic_id: currentTopic.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }, [currentMonthId, currentTopic?.id, isUnlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ==================== ACTIONS ====================

  async function handleQuizSubmit() {
    if (!currentVerification) return;
    try {
      const result = evaluateQuizSubmission(currentTopic.id, selectedAnswers);
      setQuizScore(result.score);
      setQuizSubmitted(true);

      const { error } = await supabase.from("topic_assessments").upsert(
        {
          topic_id: currentTopic.id,
          score: result.score,
          passed: result.passed,
          answers: selectedAnswers,
          attempt_number: (assessmentRecord?.attempt_number ?? 0) + 1,
          feedback: result.passed
            ? "Knowledge check passed! Score: " + result.score + "%"
            : "Score: " +
              result.score +
              "%. 80% required to pass. Please review explanations and retry.",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );

      if (error) throw error;
      inv("topic_assessments");

      if (result.passed) {
        toast.success(`Knowledge check passed! Score: ${result.score}%`);
      } else {
        toast.error(
          `Score: ${result.score}%. 80% required to pass. Review explanations and retry.`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit assessment");
    }
  }

  function handleQuizRetry() {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  }

  async function handleAssignmentSubmit() {
    if (!currentVerification) return;
    const evaluation = evaluateAssignmentSubmission(currentVerification.assignment, assignmentCode);
    setAssignmentFeedback({
      passed: evaluation.passed,
      feedback: evaluation.feedback,
      missing: evaluation.missingRequirements,
    });

    try {
      const { error } = await supabase.from("topic_assignments").upsert(
        {
          topic_id: currentTopic.id,
          submission_type: currentVerification.assignment.submissionType,
          submission_content: assignmentCode,
          status: evaluation.passed ? "Passed" : "Failed",
          feedback: evaluation.feedback,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );

      if (error) throw error;
      inv("topic_assignments");

      if (evaluation.passed) {
        toast.success("Practical assignment verified and passed!");
      } else {
        toast.error("Assignment criteria not met. Check missing requirements below.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit assignment");
    }
  }

  async function handleMarkComplete() {
    if (!currentTopic) return;
    const isQuizPassed = assessmentRecord?.passed === true;
    const isAsgPassed = assignmentRecord?.status === "Passed";

    if (!isQuizPassed || !isAsgPassed) {
      return toast.error(
        "You must pass both the Knowledge Check and Practical Assignment to complete this topic.",
      );
    }

    try {
      const { error } = await supabase.from("topic_progress").upsert(
        {
          topic_id: currentTopic.id,
          status: "Completed",
          notes: notesText || null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );

      if (error) throw error;
      toast.success(`"${currentTopic.title}" marked complete!`);
      inv("topic_progress");

      // Auto-advance to next topic if available
      if (nextTopic) {
        nav({ to: "/learn", search: { month: currentMonthId, topic: nextTopic.id } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark complete");
    }
  }

  async function handleSaveNotes() {
    if (!currentTopic) return;
    try {
      const { error } = await supabase.from("topic_progress").upsert(
        {
          topic_id: currentTopic.id,
          status: topicProg?.status ?? "In Progress",
          notes: notesText || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,topic_id" },
      );
      if (error) throw error;
      toast.success("Notes saved");
      inv("topic_progress");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save notes");
    }
  }

  async function handleUnlockNextMonth() {
    if (!monthData.requirements.isEligibleForCompletion) {
      return toast.error("Complete all remaining requirements for this month first.");
    }
    if (!confirmMonthChecked) {
      return toast.error("Please confirm that you have mastered this month's material.");
    }

    setCompletingMonth(true);
    try {
      // 1. Mark current month completed
      const { error: mcErr } = await supabase.from("month_completions").upsert(
        {
          month_id: currentMonthId,
          status: "Completed",
          confirmed_complete: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month_id" },
      );
      if (mcErr) throw mcErr;

      // 2. Unlock next month if month < 8
      if (currentMonthId < 8) {
        const nextMonthId = currentMonthId + 1;
        const { error: nextErr } = await supabase.from("month_completions").upsert(
          {
            month_id: nextMonthId,
            status: "Unlocked",
            confirmed_complete: false,
            unlocked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,month_id" },
        );
        if (nextErr) throw nextErr;

        // 3. Update user_settings active month
        await supabase.from("user_settings").upsert(
          {
            active_month: nextMonthId,
            active_topic_id: TOPICS.find((t) => t.monthId === nextMonthId)?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        toast.success(
          `Congratulations! Month ${currentMonthId} completed. Month ${nextMonthId} is now unlocked!`,
        );
        inv("month_completions");
        inv("user_settings");
        nav({ to: "/learn", search: { month: nextMonthId } });
      } else {
        toast.success(
          "Congratulations! You have completed the entire 8-month DevRoadmap curriculum!",
        );
        inv("month_completions");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unlock next month");
    } finally {
      setCompletingMonth(false);
    }
  }

  // ==================== LOCKED SCREEN ====================
  if (!isUnlocked) {
    const prevMonthId = currentMonthId - 1;
    const prevMonthData = s.months[prevMonthId - 1];
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="rounded-xl border border-warning/40 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">Month {currentMonthId} is Locked</h2>
          <p className="mt-2 text-muted-foreground">
            Month {currentMonthId} is locked. Finish all required lessons, assessments, and projects
            in Month {prevMonthId} to unlock it.
          </p>

          <div className="mt-6 rounded-lg border bg-background/50 p-4 text-left">
            <h4 className="font-semibold text-sm">
              Remaining requirements in Month {prevMonthId}:
            </h4>
            {prevMonthData?.requirements.missingRequirements &&
            prevMonthData.requirements.missingRequirements.length > 0 ? (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {prevMonthData.requirements.missingRequirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Requirements are complete! Go to Month {prevMonthId} and confirm final completion to
                unlock Month {currentMonthId}.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => nav({ to: "/learn", search: { month: prevMonthId } })}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to Month {prevMonthId} Workspace
            </Button>
            <Button variant="outline" onClick={() => nav({ to: "/roadmap" })}>
              View Full Roadmap
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== CHECKLIST VIEW ====================
  if (search.view === "checklist") {
    const reqs = monthData.requirements;
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="stat-label">Month {currentMonthId} Verification</div>
            <h1 className="font-display text-2xl font-bold">
              Month {currentMonthId} Completion Review
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              nav({
                to: "/learn",
                search: { month: currentMonthId, topic: currentTopic.id, view: "learn" },
              })
            }
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lesson
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Lessons verified" value={`${reqs.completedTopics} / ${reqs.totalTopics}`} />
          <Stat label="Quizzes passed" value={`${reqs.passedAssessments} / ${reqs.totalTopics}`} />
          <Stat
            label="Assignments passed"
            value={`${reqs.passedAssignments} / ${reqs.totalTopics}`}
          />
          <Stat
            label="Milestone criteria"
            value={`${reqs.mandatoryCriteriaChecked} / ${reqs.mandatoryCriteriaTotal}`}
          />
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <h3 className="font-display text-lg font-semibold">Sequential Completion Checklist</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border p-3.5">
              {reqs.isAllTopicsDone ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">All required topic lessons completed</div>
                <div className="text-xs text-muted-foreground">
                  {reqs.completedTopics} of {reqs.totalTopics} lessons completed
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3.5">
              {reqs.isAllAssessmentsPassed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  All topic knowledge checks passed (80% minimum)
                </div>
                <div className="text-xs text-muted-foreground">
                  {reqs.passedAssessments} of {reqs.totalTopics} quizzes passed
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3.5">
              {reqs.isAllAssignmentsPassed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">All practical coding assignments passed</div>
                <div className="text-xs text-muted-foreground">
                  {reqs.passedAssignments} of {reqs.totalTopics} assignments verified
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3.5">
              {reqs.isMilestoneCriteriaDone ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  Mandatory milestone criteria satisfied ({milestone.title})
                </div>
                <div className="text-xs text-muted-foreground">
                  {reqs.mandatoryCriteriaChecked} of {reqs.mandatoryCriteriaTotal} criteria verified
                  in Projects
                </div>
              </div>
              <Link to="/projects" className="text-xs text-primary hover:underline">
                Open Projects →
              </Link>
            </div>
          </div>

          {/* Missing items warnings */}
          {!reqs.isEligibleForCompletion && (
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm">
              <div className="font-semibold text-warning">Remaining incomplete items:</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground space-y-1">
                {reqs.missingRequirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Completion Confirmation */}
          <div className="border-t pt-4 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={confirmMonthChecked}
                onCheckedChange={(c) => setConfirmMonthChecked(!!c)}
                className="mt-0.5"
                disabled={!reqs.isEligibleForCompletion}
              />
              <span className="text-sm">
                I explicitly confirm that I have understood all topics, completed the coding
                assignments, and satisfied all milestone criteria for Month {currentMonthId}.
              </span>
            </label>

            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!reqs.isEligibleForCompletion || !confirmMonthChecked || completingMonth}
              onClick={handleUnlockNextMonth}
            >
              <Unlock className="h-5 w-5" />
              {currentMonthId < 8
                ? `Unlock Month ${currentMonthId + 1}`
                : "Complete Full 8-Month Roadmap!"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== PRIMARY WORKSPACE VIEW ====================
  const isLessonVerified = isTopicVerified(
    currentTopic.id,
    s.pmap,
    s.assessmentsMap,
    s.assignmentsMap,
  );

  return (
    <div className="space-y-6">
      {/* Month Header Banner */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="stat-label">Month {currentMonthId} of 8</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Active Learning Month
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold mt-1">{monthData.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{monthData.goal}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Month Progress</div>
              <div className="font-mono text-lg font-bold">{monthData.progress}%</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                nav({ to: "/learn", search: { month: currentMonthId, view: "checklist" } })
              }
              className="gap-1.5"
            >
              <CheckSquare className="h-4 w-4 text-primary" />
              Month Checklist
            </Button>
          </div>
        </div>
        <Bar value={monthData.progress} className="mt-4" />
      </div>

      {/* Main Guided Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Sequential Topic Navigation */}
        <div className="space-y-3 lg:col-span-4">
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">
                Month {currentMonthId} Syllabus
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                {monthData.done} / {monthTopics.length} done
              </span>
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-1 pr-1">
              {monthTopics.map((t, idx) => {
                const isSelected = t.id === currentTopic.id;
                const isVerified = isTopicVerified(
                  t.id,
                  s.pmap,
                  s.assessmentsMap,
                  s.assignmentsMap,
                );
                const isDone = s.pmap.get(t.id)?.status === "Completed";

                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      nav({ to: "/learn", search: { month: currentMonthId, topic: t.id } })
                    }
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-accent text-foreground",
                    )}
                  >
                    {isVerified ? (
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-primary-foreground" : "text-success",
                        )}
                      />
                    ) : isDone ? (
                      <Circle
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "text-primary-foreground" : "text-primary",
                        )}
                      />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" />
                    )}
                    <span className="truncate flex-1">
                      {idx + 1}. {t.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Step-by-Step Learning Workspace */}
        <div className="space-y-4 lg:col-span-8">
          {/* Topic Header & Breadcrumb */}
          <div className="panel p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <div className="stat-label">
                  Step {currentTopicIndex + 1} of {monthTopics.length} · Est.{" "}
                  {currentTopic.estHours}h
                </div>
                <h2 className="font-display text-xl font-bold">{currentTopic.title}</h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!prevTopic}
                  onClick={() =>
                    prevTopic &&
                    nav({ to: "/learn", search: { month: currentMonthId, topic: prevTopic.id } })
                  }
                  aria-label="Previous Lesson"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!nextTopic}
                  onClick={() =>
                    nextTopic &&
                    nav({ to: "/learn", search: { month: currentMonthId, topic: nextTopic.id } })
                  }
                  aria-label="Next Lesson"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* FreeCodeCamp-style 4-Stage Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "learn" | "practice" | "verify" | "complete")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="learn" className="gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" />
                  1. Learn
                </TabsTrigger>
                <TabsTrigger value="practice" className="gap-1.5 text-xs">
                  <Code2 className="h-3.5 w-3.5" />
                  2. Practice
                  {assignmentRecord?.status === "Passed" && (
                    <CheckCircle2 className="h-3 w-3 text-success ml-1" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="verify" className="gap-1.5 text-xs">
                  <HelpCircle className="h-3.5 w-3.5" />
                  3. Verify
                  {assessmentRecord?.passed && (
                    <CheckCircle2 className="h-3 w-3 text-success ml-1" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 text-xs">
                  <CheckSquare className="h-3.5 w-3.5" />
                  4. Complete
                </TabsTrigger>
              </TabsList>

              {/* Stage 1: Learn */}
              <TabsContent value="learn" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Lesson Overview</h4>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {currentVerification?.lessonSummary}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Key Concepts & Objectives</h4>
                  <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                    {currentVerification?.keyTakeaways.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-sm">Recommended Curriculum Resources</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {RESOURCES.filter((r) => r.monthId === currentMonthId)
                      .slice(0, 4)
                      .map((r) => (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="panel flex items-center justify-between p-3 text-xs hover:border-primary transition"
                        >
                          <div>
                            <div className="font-medium text-foreground">{r.title}</div>
                            <div className="text-muted-foreground">{r.type}</div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button size="sm" onClick={() => setActiveTab("practice")} className="gap-1.5">
                    Continue to Practice
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* Stage 2: Practice (Coding Assignment) */}
              <TabsContent value="practice" className="space-y-4 pt-4">
                {currentVerification && (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">
                          {currentVerification.assignment.title}
                        </span>
                        {assignmentRecord?.status === "Passed" ? (
                          <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs font-semibold text-success">
                            Passed
                          </span>
                        ) : (
                          <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-semibold text-warning">
                            Pending Verification
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90">
                        {currentVerification.assignment.description}
                      </p>
                      <div className="text-xs font-medium text-muted-foreground">
                        Expected Output:{" "}
                        <span className="font-mono text-foreground">
                          {currentVerification.assignment.expectedOutput}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="stat-label text-xs">Testable Acceptance Criteria</div>
                      <ul className="list-inside list-disc text-xs text-muted-foreground space-y-1">
                        {currentVerification.assignment.criteria.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="assignmentCode">Implementation Code / Submission</Label>
                      <Textarea
                        id="assignmentCode"
                        rows={10}
                        value={assignmentCode}
                        onChange={(e) => setAssignmentCode(e.target.value)}
                        className="font-mono text-xs"
                        placeholder="Write your code or paste repository link here..."
                      />
                    </div>

                    {assignmentFeedback && (
                      <div
                        className={cn(
                          "rounded-lg border p-3 text-xs",
                          assignmentFeedback.passed
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-destructive/40 bg-destructive/10 text-destructive",
                        )}
                      >
                        <div className="font-semibold">{assignmentFeedback.feedback}</div>
                        {assignmentFeedback.missing.length > 0 && (
                          <ul className="mt-1 list-inside list-disc space-y-0.5">
                            {assignmentFeedback.missing.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("learn")}>
                        Back to Learn
                      </Button>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleAssignmentSubmit} className="gap-1.5">
                          <Code2 className="h-4 w-4" />
                          Verify & Submit Code
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setActiveTab("verify")}
                        >
                          Next: Knowledge Check
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Stage 3: Verify (Knowledge Check Quiz) */}
              <TabsContent value="verify" className="space-y-4 pt-4">
                {currentVerification && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <span className="font-semibold text-sm">Topic Knowledge Check</span>
                        <div className="text-xs text-muted-foreground">Passing threshold: 80%</div>
                      </div>
                      {quizScore !== null && (
                        <div className="text-right">
                          <span
                            className={cn(
                              "text-sm font-bold font-mono",
                              quizScore >= 80 ? "text-success" : "text-destructive",
                            )}
                          >
                            Score: {quizScore}%
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            {quizScore >= 80 ? "Passed" : "Retake required"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                      {currentVerification.quiz.questions.map((q, qIdx) => {
                        const selected = selectedAnswers[q.id];
                        const isAnswered = selected !== undefined;
                        const isCorrect = selected === q.correctIndex;

                        return (
                          <div key={q.id} className="rounded-lg border p-4 space-y-2.5">
                            <div className="font-medium text-sm">
                              {qIdx + 1}. {q.question}
                            </div>
                            <div className="space-y-1.5">
                              {q.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() =>
                                    setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs transition",
                                    selected === optIdx
                                      ? "border-primary bg-primary/10 text-primary font-medium"
                                      : "hover:bg-accent",
                                    quizSubmitted &&
                                      optIdx === q.correctIndex &&
                                      "border-success bg-success/10 text-success font-semibold",
                                    quizSubmitted &&
                                      selected === optIdx &&
                                      !isCorrect &&
                                      "border-destructive bg-destructive/10 text-destructive",
                                  )}
                                >
                                  <span className="font-mono text-muted-foreground w-4">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span className="flex-1">{opt}</span>
                                </button>
                              ))}
                            </div>

                            {/* Show explanation after submission */}
                            {quizSubmitted && (
                              <div className="rounded bg-muted/40 p-2.5 text-xs text-muted-foreground border-t mt-2">
                                <span className="font-semibold text-foreground">Explanation: </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <Button size="sm" variant="outline" onClick={() => setActiveTab("practice")}>
                        Back to Practice
                      </Button>
                      <div className="flex gap-2">
                        {quizSubmitted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleQuizRetry}
                            className="gap-1.5"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Retake Quiz
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={handleQuizSubmit}
                            disabled={
                              Object.keys(selectedAnswers).length <
                              currentVerification.quiz.questions.length
                            }
                          >
                            Submit Knowledge Check
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => setActiveTab("notes")}>
                          Next: Complete Step
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Stage 4: Complete & Notes */}
              <TabsContent value="notes" className="space-y-4 pt-4">
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Topic Verification Status</h4>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Lesson Read</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {assignmentRecord?.status === "Passed" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-warning" />
                      )}
                      <span>
                        Assignment {assignmentRecord?.status === "Passed" ? "Passed" : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {assessmentRecord?.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Circle className="h-4 w-4 text-warning" />
                      )}
                      <span>Quiz {assessmentRecord?.passed ? "Passed" : "Pending"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Personal Learning Notes & Takeaways</Label>
                  <Textarea
                    id="notes"
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Document your own insights, commands, and key takeaways for this lesson..."
                  />
                  <Button size="sm" variant="outline" onClick={handleSaveNotes}>
                    Save Notes
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("verify")}>
                    Back to Verify
                  </Button>
                  <Button
                    size="sm"
                    disabled={!assessmentRecord?.passed || assignmentRecord?.status !== "Passed"}
                    onClick={handleMarkComplete}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {topicProg?.status === "Completed"
                      ? "Completed! Next Lesson →"
                      : "Mark Topic Complete"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
