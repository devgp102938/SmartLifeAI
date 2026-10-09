const dashboardService = require('./dashboardService.js');

const generateLifeAdvice = async ({ userId, userPrompt, timezone = 'UTC' }) => {
    // 1. Gather rich user context from existing dashboardService
    let contextSummary = '';
    try {
        const dashboard = await dashboardService.getDashboard({
            userId,
            period: 'last7days',
            timezone,
            now: new Date()
        });

        const { overview } = dashboard;
        contextSummary = `
User Context (Last 7 Days):
- Tasks: ${overview.tasks.completed}/${overview.tasks.totalDue} completed (${overview.tasks.completionRate ?? 0}%), ${overview.tasks.pending} pending, ${overview.tasks.overdue} overdue.
- Habits: ${overview.habits.totalHabits} active habits, current average streak: ${overview.habits.averageCurrentStreak ?? 0} days.
- Medicine Adherence: ${overview.medicines.adherenceRate ?? 0}% (${overview.medicines.takenDoses}/${overview.medicines.expectedDoses} doses taken, ${overview.medicines.missedDoses} missed).
- Daily Well-being: ${overview.dailyCheckIns.totalCheckIns} check-ins, avg mood: ${overview.dailyCheckIns.averageMood ?? 'N/A'}/5, avg energy: ${overview.dailyCheckIns.averageEnergy ?? 'N/A'}/5, avg productivity: ${overview.dailyCheckIns.averageProductivity ?? 'N/A'}/5.
`;
    } catch (e) {
        contextSummary = 'User Context: New user profile or no prior activity recorded yet.';
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const prompt = `You are ORION AI, the intelligent personal life optimization assistant in SmartLife AI.
You provide empathetic, scientifically-grounded, and actionable guidance across productivity, habits, wellness, and medicine adherence.

${contextSummary}

User Query: "${userPrompt}"

Instructions:
- Keep recommendations specific, realistic, and encouraging.
- Format responses cleanly with brief bullet points and concise markdown.
- If health or medication issues arise, prioritize consistency and safety.`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return text;
            }
        } catch (apiError) {
            console.error('Gemini API call failed, falling back to local heuristic reasoning:', apiError.message);
        }
    }

    // High quality intelligent heuristic fallback when GEMINI_API_KEY is not set or network fails
    return generateIntelligentHeuristicResponse(userPrompt, contextSummary);
};

function generateIntelligentHeuristicResponse(prompt, context) {
    const p = (prompt || '').toLowerCase();

    if (p.includes('medicine') || p.includes('pill') || p.includes('dose') || p.includes('medication')) {
        return `### 💊 ORION Medication & Health Guidance\n\nBased on your recent tracking:\n* **Consistency First**: Align dose times with anchored daily habits (e.g., breakfast or evening brush).\n* **Don't Double Up**: If you skipped a dose, verify your schedule rather than taking double amounts without medical guidance.\n* **Smart Reminders**: Keep your active schedules updated in the Medicine Management tab to keep your adherence above 90%.\n\n*${context.trim()}*`;
    }

    if (p.includes('habit') || p.includes('streak') || p.includes('routine')) {
        return `### ⚡ ORION Habit Calibration\n\n* **Micro-Habit Scaling**: Focus on doing 2 minutes of the habit on low-energy days to protect your current streak.\n* **Friction Reduction**: Prepare your environment the night before.\n* **Track Daily**: Complete today's habit check before 9:00 PM to keep momentum alive.\n\n*${context.trim()}*`;
    }

    if (p.includes('task') || p.includes('priority') || p.includes('overdue') || p.includes('work') || p.includes('productive')) {
        return `### 🎯 ORION Productivity Optimization\n\n* **Tackle Overdue First**: Clear or reschedule your overdue tasks to reduce cognitive overload.\n* **Rule of 3**: Select only top 3 high-priority tasks for today and tackle the hardest during your peak energy window.\n* **Pomodoro Pacing**: Work in 25-minute sprints followed by 5-minute active recovery breaks.\n\n*${context.trim()}*`;
    }

    return `### 🌌 ORION Life Management Overview\n\nHere is your synthesized SmartLife performance check:\n* **Productivity**: Keep tabs on upcoming tasks due this week.\n* **Wellness**: Keep logging your daily check-in to generate mood and energy patterns.\n* **Health**: Keep your medicine adherence high and maintain your ongoing streaks.\n\n${context.trim()}\n\n*How can I help you optimize your schedule or habits today?*`;
}

module.exports = {
    generateLifeAdvice
};
