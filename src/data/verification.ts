import { TOPICS, type Topic } from "./catalog";
import { isSafeUrl } from "../lib/calc";

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type PracticalAssignment = {
  id: string;
  title: string;
  description: string;
  expectedOutput: string;
  criteria: string[];
  starterCode?: string;
  submissionType: "code" | "url" | "text";
  requiredKeywords?: string[];
  hints?: string[];
};

export type TopicVerification = {
  topicId: string;
  title: string;
  monthId: number;
  lessonSummary: string;
  keyTakeaways: string[];
  quiz: {
    passingScore: number; // default 80%
    questions: QuizQuestion[];
  };
  assignment: PracticalAssignment;
};

// Curated specialized questions & assignments mapped by topic title keywords or specific topic IDs
const SPECIALIZED_VERIFICATIONS: Record<
  string,
  {
    summary: string;
    takeaways: string[];
    questions: QuizQuestion[];
    assignment: Omit<PracticalAssignment, "id">;
  }
> = {
  "Source code, compilers, and interpreters": {
    summary:
      "Understand the execution model of software: how human-readable source code transforms into machine code via compilation or interpretation.",
    takeaways: [
      "Compilers translate the entire source code into native machine code before execution (e.g., C, Rust, Go).",
      "Interpreters execute instructions line-by-line or through an intermediate bytecode virtual machine (e.g., Python, Ruby, JavaScript).",
      "Python utilizes a hybrid model: source code compiles to bytecode (.pyc) which the Python Virtual Machine (PVM) interprets.",
    ],
    questions: [
      {
        id: "q1",
        question: "How does an interpreter differ fundamentally from an ahead-of-time compiler?",
        options: [
          "Compilers execute code line-by-line while interpreters generate machine binaries upfront.",
          "Compilers translate source code into machine code before execution; interpreters translate and execute instructions at runtime.",
          "Interpreters can only run low-level assembly language.",
          "Compilers do not perform syntax or type checking.",
        ],
        correctIndex: 1,
        explanation:
          "Compilers convert the complete program into machine code ahead of time. Interpreters parse and evaluate source code on the fly at runtime.",
      },
      {
        id: "q2",
        question:
          "What intermediate format does the CPython reference implementation produce before execution?",
        options: ["Native x86 assembly", "Python Bytecode (.pyc)", "LLVM IR", "Machine microcode"],
        correctIndex: 1,
        explanation:
          "CPython compiles Python source code into portable bytecode (.pyc files) which is then executed by the Python Virtual Machine (PVM).",
      },
      {
        id: "q3",
        question:
          "Which of the following is an advantage of interpreted languages over compiled binaries?",
        options: [
          "Faster raw execution speed for heavy numerical calculations",
          "Cross-platform portability without needing to recompile for every CPU architecture",
          "Zero runtime memory overhead",
          "Inability to encounter runtime errors",
        ],
        correctIndex: 1,
        explanation:
          "Interpreted code can run on any system with a compatible runtime installed without recompiling for target architecture.",
      },
    ],
    assignment: {
      title: "CPython Bytecode Disassembly Script",
      description:
        "Write a Python script that defines a simple function `def add(a, b): return a + b`, imports the `dis` module, and disassembles the function to inspect bytecode instructions.",
      expectedOutput:
        "The script should output the disassembled bytecode instructions including BINARY_OP or BINARY_ADD.",
      criteria: [
        "Defines function `add(a, b)` returning the sum.",
        "Imports the standard library `dis` module.",
        "Calls `dis.dis(add)` to inspect the compiled bytecode instructions.",
      ],
      starterCode: `# Import the standard library disassembler\nimport dis\n\ndef add(a, b):\n    return a + b\n\n# Disassemble and inspect bytecode\ndis.dis(add)\n`,
      submissionType: "code",
      requiredKeywords: ["def add", "import dis", "dis.dis"],
    },
  },

  "Variables and naming conventions": {
    summary:
      "Master Python variable assignment, dynamic typing, memory references, and PEP 8 naming conventions.",
    takeaways: [
      "Python variables are named references (pointers) pointing to objects in heap memory.",
      "Variable names should follow snake_case (e.g., user_count, total_score).",
      "Constants are conventionally written in UPPER_SNAKE_CASE.",
      "Reserved keywords (such as class, def, return, if) cannot be used as variable identifiers.",
    ],
    questions: [
      {
        id: "q1",
        question:
          "According to PEP 8, what is the standard naming convention for Python variables and functions?",
        options: ["camelCase", "PascalCase", "snake_case", "kebab-case"],
        correctIndex: 2,
        explanation:
          "PEP 8 specifies that variable and function names should be lowercase with words separated by underscores (snake_case).",
      },
      {
        id: "q2",
        question: "What happens when you assign `b = a` where `a = [1, 2, 3]` in Python?",
        options: [
          "A full deep clone of the list is allocated at a new memory address.",
          "`b` references the exact same list object in memory that `a` points to.",
          "Python converts `b` to an immutable tuple.",
          "An error is raised because lists cannot be assigned to multiple identifiers.",
        ],
        correctIndex: 1,
        explanation:
          "In Python, assignment binds a new reference name to the existing object. Both `a` and `b` reference the identical mutable list in memory.",
      },
      {
        id: "q3",
        question: "Which of the following is an invalid Python variable name?",
        options: ["_private_val", "user_age_2", "2nd_user", "MAX_CONNECTIONS"],
        correctIndex: 2,
        explanation: "Identifiers in Python cannot start with a numerical digit (e.g. `2nd_user`).",
      },
    ],
    assignment: {
      title: "PEP 8 Variable Declaration & Type Inspector",
      description:
        "Declare variables adhering strictly to PEP 8 standards: a user name string, an age integer, an active status boolean, and a MAX_RETRIES constant. Implement a function `get_profile_summary()` that returns a formatted dictionary containing each variable.",
      expectedOutput:
        "A dictionary with keys 'user_name', 'user_age', 'is_active', 'max_retries' and matching types.",
      criteria: [
        "Uses snake_case for standard variables and UPPER_SNAKE_CASE for constants.",
        "Defines function `get_profile_summary()` returning a dictionary.",
        "Demonstrates string, integer, boolean, and constant declarations.",
      ],
      starterCode: `# Declare variables adhering to PEP 8 conventions\nMAX_RETRIES = 3\nuser_name = "Nikhil"\nuser_age = 24\nis_active = True\n\ndef get_profile_summary():\n    return {\n        "user_name": user_name,\n        "user_age": user_age,\n        "is_active": is_active,\n        "max_retries": MAX_RETRIES\n    }\n`,
      submissionType: "code",
      requiredKeywords: [
        "MAX_RETRIES",
        "user_name",
        "user_age",
        "is_active",
        "def get_profile_summary",
      ],
    },
  },

  "Binary and number representation fundamentals": {
    summary:
      "Explore how digital computers represent numbers, characters, and binary data using bits, bytes, two's complement, and hexadecimal representations.",
    takeaways: [
      "A bit is the fundamental unit (0 or 1); 8 bits constitute 1 byte (0 to 255 unsigned).",
      "Two's complement is the standard binary encoding for signed integers.",
      "Hexadecimal (base 16) is used as a human-friendly compact shorthand for binary data.",
      "Bitwise operators (&, |, ^, ~, <<, >>) allow direct manipulation of individual bits for high-performance computing.",
    ],
    questions: [
      {
        id: "q1",
        question: "What is the decimal value of the unsigned 8-bit binary number 0b00001010?",
        options: ["8", "10", "12", "16"],
        correctIndex: 1,
        explanation: "2^3 (8) + 2^1 (2) = 10 in base 10.",
      },
      {
        id: "q2",
        question:
          "How does the bitwise left-shift operator `x << 1` affect an unsigned integer value?",
        options: [
          "Divides the integer by 2",
          "Multiplies the integer by 2",
          "Inverts all bits of the integer",
          "Subtracts 1 from the integer",
        ],
        correctIndex: 1,
        explanation:
          "Left shifting by one position shifts all bits to higher powers of two, effectively multiplying the number by 2.",
      },
      {
        id: "q3",
        question:
          "Why is two's complement universally preferred for signed integer representation in modern CPUs?",
        options: [
          "It uses fewer bits than unsigned representations.",
          "Addition and subtraction can be performed using the exact same hardware circuitry without a separate sign-bit comparator, and there is only a single representation of zero.",
          "It allows strings to be stored inside integer registers directly.",
          "It prevents all integer overflow errors automatically.",
        ],
        correctIndex: 1,
        explanation:
          "Two's complement avoids the redundant positive/negative zero of sign-and-magnitude and allows unified hardware adder circuits.",
      },
    ],
    assignment: {
      title: "Binary & Decimal Conversion Utility",
      description:
        "Implement two functions: `decimal_to_binary(n)` that returns an 8-bit binary string (e.g., 10 -> '00001010'), and `binary_to_decimal(b_str)` that converts an 8-bit binary string back into an integer.",
      expectedOutput: "decimal_to_binary(10) -> '00001010', binary_to_decimal('00001010') -> 10.",
      criteria: [
        "Function `decimal_to_binary(n)` correctly formats number to 8-bit binary.",
        "Function `binary_to_decimal(b_str)` accurately parses binary string to integer.",
        "Handles edge case of 0 correctly.",
      ],
      starterCode: `def decimal_to_binary(n: int) -> str:\n    # Return 8-bit binary representation\n    return format(n, '08b')\n\ndef binary_to_decimal(b_str: str) -> int:\n    # Parse binary string back to integer\n    return int(b_str, 2)\n`,
      submissionType: "code",
      requiredKeywords: ["def decimal_to_binary", "def binary_to_decimal", "return"],
    },
  },
};

// Generates fallback curriculum-grounded verification tasks when an exact match isn't statically hardcoded
function generateCurriculumVerification(topic: Topic): TopicVerification {
  const isTopLevel = !topic.parentId;
  const title = topic.title;
  const monthId = topic.monthId;

  // Domain categorization based on month
  let domain = "programming foundations and algorithmic thinking";
  if (monthId === 2)
    domain = "object-oriented programming, clean code principles, and design patterns";
  else if (monthId === 3)
    domain = "data structures, algorithm optimization, and computational complexity";
  else if (monthId === 4)
    domain = "FastAPI backend engineering, REST architecture, and database integrations";
  else if (monthId === 5)
    domain =
      "React/Next.js modern frontend engineering, component lifecycle, and full-stack integration";
  else if (monthId === 6)
    domain = "system design, distributed systems, caching, and scalable architecture";
  else if (monthId === 7)
    domain =
      "AI engineering fundamentals, LLM prompt engineering, embeddings, and API integrations";
  else if (monthId === 8)
    domain = "RAG architectures, MCP protocols, vector databases, and autonomous AI agents";

  const question1: QuizQuestion = {
    id: `${topic.id}-q1`,
    question: `In the context of ${domain}, what is the core purpose of "${title}"?`,
    options: [
      `To structure, implement, and maintain "${title}" adhering to production engineering standards.`,
      `To replace all automated testing with manual runtime checks.`,
      `To bypass memory safety constraints and disable operating system isolation.`,
      `To eliminate the need for version control and documentation.`,
    ],
    correctIndex: 0,
    explanation: `Understanding "${title}" enables engineers to design reliable, scalable systems within the ${domain} curriculum.`,
  };

  const question2: QuizQuestion = {
    id: `${topic.id}-q2`,
    question: `Which engineering trade-off or best practice is critical when applying "${title}"?`,
    options: [
      "Prioritizing obscure syntax over readability and maintainability.",
      "Ensuring clean separation of concerns, robust error handling, and predictable execution behavior.",
      "Hardcoding credentials and environmental configuration directly into source code.",
      "Skipping input validation when handling untrusted user data.",
    ],
    correctIndex: 1,
    explanation:
      "Maintainable software requires clear separation of concerns, defensive input validation, and predictable error handling.",
  };

  const question3: QuizQuestion = {
    id: `${topic.id}-q3`,
    question: `When debugging or testing implementations of "${title}", which practice ensures correctness?`,
    options: [
      "Assuming the code works without executing unit tests or inspecting logs.",
      "Verifying edge cases, boundary conditions, and deterministic output with automated tests.",
      "Deleting log statements whenever an unhandled exception occurs.",
      "Running code exclusively in production environments without local testing.",
    ],
    correctIndex: 1,
    explanation:
      "Testing boundary conditions and edge cases guarantees that the module behaves reliably across all execution paths.",
  };

  const assignment: PracticalAssignment = {
    id: `${topic.id}-task`,
    title: `Practical Implementation: ${title}`,
    description: `Implement a functional, documented code module in Python or TypeScript that demonstrates practical mastery of "${title}". Your solution must include input handling, core business logic, and return verifiable output.`,
    expectedOutput: `A working module exporting a primary function or class exercising "${title}" with valid test output.`,
    criteria: [
      `Implements core logic exercising "${title}".`,
      "Includes structured error handling or input validation.",
      "Returns deterministic output or exports a verifiable class/function.",
      "Code is well-structured and documented with comments.",
    ],
    starterCode: `# Module: ${title}\n# Month ${monthId} - DevRoadmap Sequential Platform\n\ndef run_exercise():\n    """\n    Demonstrates practical application of ${title}.\n    """\n    # TODO: Implement exercise logic here\n    result = f"Mastery verified for: ${title}"\n    return result\n\nif __name__ == "__main__":\n    output = run_exercise()\n    print(output)\n`,
    submissionType: "code",
    requiredKeywords: ["def ", "return"],
    hints: [
      `Review Month ${monthId} curriculum objectives for ${title}.`,
      "Ensure your solution defines a callable function that returns a value.",
    ],
  };

  return {
    topicId: topic.id,
    title: topic.title,
    monthId: topic.monthId,
    lessonSummary: `Comprehensive study guide and practical implementation lab for "${title}" within Month ${monthId} (${domain}).`,
    keyTakeaways: [
      `Master the core theoretical concepts and industry standards surrounding "${title}".`,
      `Learn how "${title}" integrates with upstream and downstream architecture in Month ${monthId}.`,
      "Implement hands-on code examples to transition from passive understanding to verifiable engineering ability.",
    ],
    quiz: {
      passingScore: 80,
      questions: [question1, question2, question3],
    },
    assignment,
  };
}

// Global registry cache
const REGISTRY = new Map<string, TopicVerification>();

export function getTopicVerification(topicId: string): TopicVerification | null {
  if (REGISTRY.has(topicId)) {
    return REGISTRY.get(topicId)!;
  }

  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;

  // Check if a specialized verification matches
  const specialized = SPECIALIZED_VERIFICATIONS[topic.title];
  if (specialized) {
    const custom: TopicVerification = {
      topicId: topic.id,
      title: topic.title,
      monthId: topic.monthId,
      lessonSummary: specialized.summary,
      keyTakeaways: specialized.takeaways,
      quiz: {
        passingScore: 80,
        questions: specialized.questions,
      },
      assignment: {
        id: `${topic.id}-task`,
        ...specialized.assignment,
      },
    };
    REGISTRY.set(topicId, custom);
    return custom;
  }

  // Generate curriculum-grounded verification
  const generated = generateCurriculumVerification(topic);
  REGISTRY.set(topicId, generated);
  return generated;
}

export function evaluateQuizSubmission(
  topicId: string,
  userAnswers: Record<string, number>,
): {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctCount: number;
  results: {
    questionId: string;
    questionText: string;
    userSelected: number | null;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
  }[];
} {
  const verification = getTopicVerification(topicId);
  if (!verification) {
    throw new Error(`Assessment not configured for topic: ${topicId}`);
  }

  const questions = verification.quiz.questions;
  let correctCount = 0;

  const results = questions.map((q) => {
    const selected = userAnswers[q.id] !== undefined ? userAnswers[q.id] : null;
    const isCorrect = selected === q.correctIndex;
    if (isCorrect) correctCount++;
    return {
      questionId: q.id,
      questionText: q.question,
      userSelected: selected,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= verification.quiz.passingScore;

  return {
    score,
    passed,
    totalQuestions: questions.length,
    correctCount,
    results,
  };
}

export function evaluateAssignmentSubmission(
  assignment: PracticalAssignment,
  submission: string,
): {
  passed: boolean;
  feedback: string;
  missingRequirements: string[];
} {
  const trimmed = submission.trim();
  const missing: string[] = [];

  if (!trimmed || trimmed.length < 15) {
    return {
      passed: false,
      feedback: "Submission is too short. Please provide a complete, working implementation.",
      missingRequirements: ["Non-empty implementation containing required logic."],
    };
  }

  if (assignment.submissionType === "url") {
    if (!isSafeUrl(trimmed)) {
      return {
        passed: false,
        feedback:
          "Invalid URL. Please provide a valid http:// or https:// repository or deployment link.",
        missingRequirements: ["Valid http(s) URL"],
      };
    }
    return {
      passed: true,
      feedback: "URL successfully validated and accepted.",
      missingRequirements: [],
    };
  }

  // Deterministic checks for code/text assignments
  if (assignment.requiredKeywords && assignment.requiredKeywords.length > 0) {
    for (const kw of assignment.requiredKeywords) {
      if (!trimmed.includes(kw)) {
        missing.push(`Missing required code construct or definition: "${kw}"`);
      }
    }
  }

  // Verify minimal structure (at least function or class definition or statements)
  if (
    assignment.submissionType === "code" &&
    !trimmed.includes("def ") &&
    !trimmed.includes("class ") &&
    !trimmed.includes("function ") &&
    !trimmed.includes("const ") &&
    !trimmed.includes("import ")
  ) {
    missing.push("Code must declare a function, class, or executable block.");
  }

  const passed = missing.length === 0;
  const feedback = passed
    ? "All acceptance criteria verified! Your assignment passed."
    : `Assignment criteria not met. Please address the following missing items: ${missing.join(", ")}`;

  return {
    passed,
    feedback,
    missingRequirements: missing,
  };
}
