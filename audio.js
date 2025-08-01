class AudioManager {
    constructor() {
        this.isPlaying = false;
        this.currentAudio = null;
        this.onAudioStart = null;
        this.onAudioEnd = null;
    }

    async speak(text, voice = "en-male") {
        try {
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            const result = await websim.textToSpeech({
                text: text,
                voice: voice
            });

            return new Promise((resolve, reject) => {
                const audio = new Audio(result.url);
                this.currentAudio = audio;
                
                audio.onloadstart = () => {
                    this.isPlaying = true;
                    if (this.onAudioStart) this.onAudioStart(text);
                };

                audio.onended = () => {
                    this.isPlaying = false;
                    this.currentAudio = null;
                    if (this.onAudioEnd) this.onAudioEnd(text);
                    resolve();
                };

                audio.onerror = (error) => {
                    this.isPlaying = false;
                    this.currentAudio = null;
                    reject(error);
                };

                audio.play().catch(reject);
            });
        } catch (error) {
            console.error('TTS Error:', error);
            this.isPlaying = false;
            throw error;
        }
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.isPlaying = false;
        }
    }
}

// Game-specific audio phrases
const gameAudio = {
    redLight: [
        "Red light! Freeze right there!",
        "Red light! Don't you dare move!",
        "Red light! Stop immediately!",
        "Red light! Stay perfectly still!",
        "Red light! Not a muscle!"
    ],
    greenLight: [
        "Green light! Move forward!",
        "Green light! Go go go!",
        "Green light! Time to advance!",
        "Green light! Keep moving!",
        "Green light! Make your move!"
    ],
    gameStart: [
        "Welcome to Red Light Green Light! I am your AI game master. Get ready to play!",
        "Hello player! I'll be watching your every move. Let's begin!",
        "Ready for the ultimate test? I have perfect vision. Game starting now!"
    ],
    caught: [
        "I saw you move! You're out!",
        "Caught you! Game over!",
        "No cheating! I have digital eyes everywhere!",
        "You moved during red light! Better luck next time!",
        "My sensors detected movement! You lose!"
    ],
    win: [
        "Impressive! You made it! Congratulations!",
        "Well played, human! You have excellent self-control!",
        "Victory is yours! You've mastered the art of stillness!",
        "Amazing! You've beaten the AI at its own game!"
    ],
    warning: [
        "I'm watching you very carefully...",
        "My motion sensors are active...",
        "Remember, I can see everything...",
        "Stay perfectly still during red light..."
    ]
};

// Export for use in main.js
window.AudioManager = AudioManager;
window.gameAudio = gameAudio;

