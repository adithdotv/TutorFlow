const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateSessionPlan = async ({
  student,
  session,
  pastSessions,
}) => {
  const prompt = `
You are an expert one-to-one tutoring assistant.

Create a personalized lesson plan for the upcoming tutoring session.

STUDENT PROFILE:
Name: ${student.name}
Subject: ${student.subject}
Current Level: ${student.current_level || "Not specified"}
Learning Goals: ${student.learning_goals || "Not specified"}
Weak Areas: ${student.weak_areas || "Not specified"}

UPCOMING SESSION:
Topic: ${session.topic}
Scheduled At: ${session.scheduled_at}

PAST SESSION HISTORY:
${
  pastSessions.length > 0
    ? pastSessions
        .map(
          (past, index) => `
Session ${index + 1}:
Topic: ${past.topic}
Status: ${past.status}
AI Review: ${
            past.ai_review
              ? JSON.stringify(past.ai_review)
              : "No AI review available"
          }
`
        )
        .join("\n")
    : "No previous sessions."
}

Create a practical lesson plan specifically for this student.

Requirements:
- Learning objectives must match the student's current level.
- Address the student's weak areas.
- Use previous session reviews when useful.
- Keep the plan suitable for a one-to-one tutoring session.
- Provide exactly 4 outline points.
- Provide exactly 3 practice questions.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: "object",

          properties: {
            learningObjectives: {
              type: "array",
              items: {
                type: "string",
              },
            },

            outline: {
              type: "array",
              items: {
                type: "string",
              },
            },

            practiceQuestions: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },

          required: [
            "learningObjectives",
            "outline",
            "practiceQuestions",
          ],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const plan = JSON.parse(text);

    // Validate the required structure
    if (
      !Array.isArray(plan.learningObjectives) ||
      !Array.isArray(plan.outline) ||
      !Array.isArray(plan.practiceQuestions)
    ) {
      throw new Error(
        "Gemini returned an invalid session plan structure"
      );
    }

    if (plan.outline.length !== 4) {
      throw new Error(
        "Gemini must return exactly 4 outline points"
      );
    }

    if (plan.practiceQuestions.length !== 3) {
      throw new Error(
        "Gemini must return exactly 3 practice questions"
      );
    }

    return plan;
  } catch (error) {
    console.error("Gemini AI error:", error);

    throw new Error(
      `Failed to generate AI session plan: ${error.message}`
    );
  }
};



const generateSessionReview = async ({
  student,
  session,
}) => {
  const prompt = `
You are an expert one-to-one tutoring assistant.

Review the completed tutoring session and create a concise
post-session review.

STUDENT PROFILE:
Name: ${student.name}
Subject: ${student.subject}
Current Level: ${student.current_level || "Not specified"}
Learning Goals: ${student.learning_goals || "Not specified"}
Weak Areas: ${student.weak_areas || "Not specified"}

COMPLETED SESSION:
Topic: ${session.topic}

SESSION NOTES:
${session.notes || "No notes were provided."}

Create a useful review based only on the information above.

Requirements:
- Provide a concise summary of what was covered and how the student performed.
- Provide exactly 2 or 3 practical homework tasks.
- Provide exactly one suggestion for the next tutoring session.
- Homework should relate to the student's weak areas and session topic.
- The next-session suggestion should be actionable.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: "object",

          properties: {
            summary: {
              type: "string",
            },

            homework: {
              type: "array",
              items: {
                type: "string",
              },
            },

            nextSessionSuggestion: {
              type: "string",
            },
          },

          required: [
            "summary",
            "homework",
            "nextSessionSuggestion",
          ],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    const review = JSON.parse(text);

    if (
      typeof review.summary !== "string" ||
      !Array.isArray(review.homework) ||
      typeof review.nextSessionSuggestion !== "string"
    ) {
      throw new Error(
        "Gemini returned an invalid session review structure"
      );
    }

    if (
      review.homework.length < 2 ||
      review.homework.length > 3
    ) {
      throw new Error(
        "Gemini must return 2 or 3 homework tasks"
      );
    }

    return review;
  } catch (error) {
    console.error("Gemini AI review error:", error);

    throw new Error(
      `Failed to generate AI session review: ${error.message}`
    );
  }
};

module.exports = {
  generateSessionPlan,
  generateSessionReview,
};