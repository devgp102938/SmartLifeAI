const geminiService = require('../services/geminiService.js');

// POST /api/ai/chat
const getAiAdvice = async (req, res) => {
    try {
        const { prompt, timezone } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                message: 'A prompt message is required.'
            });
        }

        const reply = await geminiService.generateLifeAdvice({
            userId: req.user._id,
            userPrompt: prompt.trim(),
            timezone: timezone || 'UTC'
        });

        res.status(200).json({
            success: true,
            reply
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

module.exports = {
    getAiAdvice
};
