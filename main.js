class RedLightGreenLightGame {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.motionCanvas = document.getElementById('motionCanvas');
        this.motionCtx = this.motionCanvas.getContext('2d');
        
        this.gameStatus = document.getElementById('gameStatus');
        this.lightIndicator = document.getElementById('lightIndicator');
        this.distanceProgress = document.getElementById('distanceProgress');
        this.aiIndicator = document.getElementById('aiSpeaking');
        this.startBtn = document.getElementById('startBtn');
        this.calibrateBtn = document.getElementById('calibrateBtn');
        
        // Debug elements
        this.motionLevelDisplay = document.getElementById('motionLevel');
        this.distanceDisplay = document.getElementById('distanceDisplay');
        this.gameStateDisplay = document.getElementById('gameState');
        
        this.audioManager = new AudioManager();
        this.setupAudioEvents();
        
        this.gameState = 'idle'; // idle, playing, green, red, checking, win, lose
        this.distance = 0;
        this.maxDistance = 100;
        this.motionThreshold = 15;
        
        // Motion detection variables
        this.previousFrame = null;
        this.baselineFrame = null;
        this.motionHistory = [];
        this.isCheckingMotion = false;
        
        this.setupEventListeners();
        this.initializeWebcam();
    }

    setupAudioEvents() {
        this.audioManager.onAudioStart = (text) => {
            this.aiIndicator.textContent = '🤖 AI Speaking...';
            this.aiIndicator.classList.add('speaking');
            
            if (text.toLowerCase().includes('red light')) {
                this.startRedLightPhase();
            } else if (text.toLowerCase().includes('green light')) {
                this.startGreenLightPhase();
            }
        };

        this.audioManager.onAudioEnd = (text) => {
            this.aiIndicator.textContent = '🤖 AI Ready';
            this.aiIndicator.classList.remove('speaking');
            
            if (text.toLowerCase().includes('red light')) {
                this.endRedLightPhase();
            }
        };
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.calibrateBtn.addEventListener('click', () => this.calibratePosition());
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.distance >= 90) {
                e.preventDefault();
                this.winGame();
            }
        });

        // Resize canvas when window resizes
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    async initializeWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            
            this.webcam.srcObject = stream;
            this.webcam.onloadedmetadata = () => {
                this.resizeCanvas();
                this.startMotionDetection();
            };
        } catch (error) {
            console.error('Webcam access denied:', error);
            this.gameStatus.textContent = 'Please allow webcam access to play!';
        }
    }

    resizeCanvas() {
        this.motionCanvas.width = this.webcam.videoWidth || 640;
        this.motionCanvas.height = this.webcam.videoHeight || 480;
    }

    startMotionDetection() {
        const detectMotion = () => {
            if (this.webcam.readyState === this.webcam.HAVE_ENOUGH_DATA) {
                this.processFrame();
            }
            requestAnimationFrame(detectMotion);
        };
        detectMotion();
    }

    processFrame() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.motionCanvas.width;
        canvas.height = this.motionCanvas.height;
        
        ctx.drawImage(this.webcam, 0, 0, canvas.width, canvas.height);
        const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        if (this.previousFrame) {
            const motionLevel = this.calculateMotion(currentFrame, this.previousFrame);
            this.updateMotionVisualization(currentFrame, this.previousFrame);
            
            // Update debug info
            this.motionLevelDisplay.textContent = motionLevel.toFixed(1);
            this.gameStateDisplay.textContent = this.gameState;
            
            if (this.isCheckingMotion && motionLevel > this.motionThreshold) {
                this.caughtMoving();
            }
            
            // Update distance based on overall motion during green light
            if (this.gameState === 'green') {
                this.updateDistance(motionLevel);
            }
        }
        
        this.previousFrame = currentFrame;
    }

    calculateMotion(current, previous) {
        let motionLevel = 0;
        const threshold = 50; // Sensitivity threshold
        
        for (let i = 0; i < current.data.length; i += 4) {
            const rDiff = Math.abs(current.data[i] - previous.data[i]);
            const gDiff = Math.abs(current.data[i + 1] - previous.data[i + 1]);
            const bDiff = Math.abs(current.data[i + 2] - previous.data[i + 2]);
            
            const pixelDiff = (rDiff + gDiff + bDiff) / 3;
            if (pixelDiff > threshold) {
                motionLevel++;
            }
        }
        
        return (motionLevel / (current.data.length / 4)) * 100;
    }

    updateMotionVisualization(current, previous) {
        this.motionCtx.clearRect(0, 0, this.motionCanvas.width, this.motionCanvas.height);
        
        const imageData = this.motionCtx.createImageData(this.motionCanvas.width, this.motionCanvas.height);
        const threshold = 50;
        
        for (let i = 0; i < current.data.length; i += 4) {
            const rDiff = Math.abs(current.data[i] - previous.data[i]);
            const gDiff = Math.abs(current.data[i + 1] - previous.data[i + 1]);
            const bDiff = Math.abs(current.data[i + 2] - previous.data[i + 2]);
            
            const pixelDiff = (rDiff + gDiff + bDiff) / 3;
            
            if (pixelDiff > threshold && this.isCheckingMotion) {
                imageData.data[i] = 255;     // Red
                imageData.data[i + 1] = 0;   // Green
                imageData.data[i + 2] = 0;   // Blue
                imageData.data[i + 3] = 150; // Alpha
            } else {
                imageData.data[i + 3] = 0; // Transparent
            }
        }
        
        this.motionCtx.putImageData(imageData, 0, 0);
    }

    updateDistance(motionLevel) {
        if (motionLevel > 5) { // Only count significant movement
            this.distance += motionLevel * 0.1;
            this.distance = Math.min(this.distance, this.maxDistance);
            
            const percentage = (this.distance / this.maxDistance) * 100;
            this.distanceProgress.style.width = `${percentage}%`;
            this.distanceDisplay.textContent = `${percentage.toFixed(1)}%`;
            
            if (this.distance >= 90) {
                this.gameStatus.textContent = 'Press SPACEBAR to win!';
            }
        }
    }

    async startGame() {
        this.gameState = 'playing';
        this.distance = 0;
        this.distanceProgress.style.width = '0%';
        this.distanceDisplay.textContent = '0%';
        this.startBtn.disabled = true;
        this.updateUI();
        
        // Calibrate baseline
        this.calibratePosition();
        
        const startPhrase = this.getRandomPhrase(gameAudio.gameStart);
        await this.audioManager.speak(startPhrase);
        
        // Start the game loop
        setTimeout(() => this.gameLoop(), 1000);
    }

    async gameLoop() {
        if (this.gameState !== 'playing') return;
        
        // Alternate between green and red light
        const isGreenLight = Math.random() > 0.5;
        const phrase = isGreenLight 
            ? this.getRandomPhrase(gameAudio.greenLight)
            : this.getRandomPhrase(gameAudio.redLight);
            
        await this.audioManager.speak(phrase);
        
        // Schedule next round with random interval between 1-7 seconds
        const delay = Math.random() * 6000 + 1000; // 1-7 seconds
        setTimeout(() => this.gameLoop(), delay);
    }

    startGreenLightPhase() {
        this.gameState = 'green';
        this.isCheckingMotion = false;
        this.lightIndicator.className = 'light-indicator green';
        document.body.className = 'green-light';
        this.gameStatus.textContent = 'GREEN LIGHT - Move Forward!';
    }

    startRedLightPhase() {
        this.gameState = 'red';
        this.isCheckingMotion = false; // Don't check during the speaking
        this.lightIndicator.className = 'light-indicator red';
        document.body.className = 'red-light';
        this.gameStatus.textContent = 'RED LIGHT - Don\'t Move!';
    }

    endRedLightPhase() {
        if (this.gameState === 'red') {
            this.gameState = 'checking';
            this.isCheckingMotion = true;
            this.lightIndicator.className = 'light-indicator checking';
            this.gameStatus.textContent = 'CHECKING FOR MOVEMENT...';
            
            // Check for a few seconds after red light ends
            setTimeout(() => {
                if (this.gameState === 'checking') {
                    this.isCheckingMotion = false;
                    this.gameState = 'playing';
                    this.lightIndicator.className = 'light-indicator';
                }
            }, 2000);
        }
    }

    async caughtMoving() {
        this.gameState = 'lose';
        this.isCheckingMotion = false;
        this.lightIndicator.className = 'light-indicator red';
        document.body.className = 'lose';
        
        const caughtPhrase = this.getRandomPhrase(gameAudio.caught);
        await this.audioManager.speak(caughtPhrase);
        
        this.gameStatus.textContent = 'CAUGHT! Game Over!';
        this.startBtn.disabled = false;
        this.startBtn.textContent = 'Play Again';
    }

    async winGame() {
        this.gameState = 'win';
        this.isCheckingMotion = false;
        this.lightIndicator.className = 'light-indicator green';
        document.body.className = 'win';
        
        const winPhrase = this.getRandomPhrase(gameAudio.win);
        await this.audioManager.speak(winPhrase);
        
        this.gameStatus.textContent = '🎉 YOU WIN! 🎉';
        this.startBtn.disabled = false;
        this.startBtn.textContent = 'Play Again';
    }

    calibratePosition() {
        this.gameStatus.textContent = 'Calibrating... Stay still for 3 seconds';
        
        setTimeout(() => {
            if (this.previousFrame) {
                this.baselineFrame = this.previousFrame;
                this.distance = 0;
                this.gameStatus.textContent = 'Calibration complete!';
            }
        }, 3000);
    }

    updateUI() {
        this.gameStateDisplay.textContent = this.gameState;
    }

    getRandomPhrase(phrases) {
        return phrases[Math.floor(Math.random() * phrases.length)];
    }
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new RedLightGreenLightGame();
});