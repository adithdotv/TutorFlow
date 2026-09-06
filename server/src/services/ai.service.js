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

module.exports = {
  generateSessionPlan,
};