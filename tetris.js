document.addEventListener('DOMContentLoaded', () => {
    // Canvas setup
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextPieceCanvas = document.getElementById('next-piece');
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    
    // Game constants
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = canvas.width / COLS;
    const NEXT_BLOCK_SIZE = nextPieceCanvas.width / 6;
    
    // Game variables
    let board = createEmptyBoard();
    let currentPiece = null;
    let nextPiece = null;
    let gameLoop = null;
    let dropInterval = 1000; // Initial drop speed (ms)
    let lastDropTime = 0;
    let isPaused = false;
    let isGameOver = false;
    let score = 0;
    let level = 1;
    let lines = 0;
    let animationFrameId = null;
    
    // DOM elements
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const musicToggle = document.getElementById('music-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const soundStatus = document.getElementById('sound-status');
    const pauseScreen = document.getElementById('pause-screen');
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    
    // Tetris blocks shapes and their colors
    const SHAPES = [
        { // I
            shape: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            color: '#00FFFF' // Cyan
        },
        { // J
            shape: [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#0000FF' // Blue
        },
        { // L
            shape: [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#FFA500' // Orange
        },
        { // O
            shape: [
                [1, 1],
                [1, 1]
            ],
            color: '#FFFF00' // Yellow
        },
        { // S
            shape: [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            color: '#00FF00' // Green
        },
        { // T
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#800080' // Purple
        },
        { // Z
            shape: [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ],
            color: '#FF0000' // Red
        }
    ];
    
    // Event Listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', resetGame);
    musicToggle.addEventListener('click', toggleMusic);
    document.addEventListener('keydown', handleKeyPress);
    
    // Initialize the game (empty board, etc.)
    initGame();
    
    // Functions
    function initGame() {
        // Draw initial board
        drawBoard();
        drawUI();
    }
    
    function createEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }
    
    function startGame() {
        if (gameLoop) return; // Game already started
        
        // Reset game state
        board = createEmptyBoard();
        score = 0;
        level = 1;
        lines = 0;
        isPaused = false;
        isGameOver = false;
        
        // Update UI
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
        
        // Hide screens
        pauseScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        
        // Update buttons
        startButton.classList.add('hidden');
        restartButton.classList.remove('hidden');
        
        // Generate first pieces
        currentPiece = generateRandomPiece();
        nextPiece = generateRandomPiece();
        
        // Start the game loop
        lastDropTime = performance.now();
        gameLoop = requestAnimationFrame(update);
        
        // Play background music
        const backgroundMusic = document.getElementById('background-music');
        backgroundMusic.play();
    }
    
    function resetGame() {
        // Cancel current game loop
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
            gameLoop = null;
        }
        
        // Start a new game
        startGame();
    }
    
    function generateRandomPiece() {
        const randomIndex = Math.floor(Math.random() * SHAPES.length);
        const piece = SHAPES[randomIndex];
        
        // Create piece object
        return {
            shape: piece.shape,
            color: piece.color,
            x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0
        };
    }
    
    function update(timestamp) {
        // Game loop
        if (!isPaused && !isGameOver) {
            // Handle automatic piece drop
            if (timestamp - lastDropTime > dropInterval) {
                lastDropTime = timestamp;
                
                // Try to move piece down
                if (!movePiece(0, 1)) {
                    // Piece cannot move down further
                    placePiece();
                    clearLines();
                    
                    // Get next piece
                    currentPiece = nextPiece;
                    nextPiece = generateRandomPiece();
                    
                    // Check for game over
                    if (!isValidMove(currentPiece.x, currentPiece.y, currentPiece.shape)) {
                        gameOver();
                        return;
                    }
                }
            }
            
            // Draw the game
            drawGame();
        }
        
        // Continue the game loop
        gameLoop = requestAnimationFrame(update);
    }
    
    function drawGame() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        nextPieceCtx.clearRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        
        // Draw the board
        drawBoard();
        
        // Draw current piece
        if (currentPiece) {
            drawPiece(ctx, currentPiece, BLOCK_SIZE);
        }
        
        // Draw next piece
        if (nextPiece) {
            // Center the next piece in the smaller canvas
            const offsetX = (nextPieceCanvas.width - (nextPiece.shape[0].length * NEXT_BLOCK_SIZE)) / 2;
            const offsetY = (nextPieceCanvas.height - (nextPiece.shape.length * NEXT_BLOCK_SIZE)) / 2;
            
            nextPiece.shape.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value) {
                        nextPieceCtx.fillStyle = nextPiece.color;
                        nextPieceCtx.fillRect(
                            offsetX + x * NEXT_BLOCK_SIZE, 
                            offsetY + y * NEXT_BLOCK_SIZE, 
                            NEXT_BLOCK_SIZE, 
                            NEXT_BLOCK_SIZE
                        );
                        nextPieceCtx.strokeStyle = '#222';
                        nextPieceCtx.lineWidth = 1;
                        nextPieceCtx.strokeRect(
                            offsetX + x * NEXT_BLOCK_SIZE, 
                            offsetY + y * NEXT_BLOCK_SIZE, 
                            NEXT_BLOCK_SIZE, 
                            NEXT_BLOCK_SIZE
                        );
                    }
                });
            });
        }
    }
    
    function drawBoard() {
        // Draw filled blocks
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    // Value will be the color of the block
                    ctx.fillStyle = value;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    
                    // Draw borders
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
        
        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(canvas.width, y * BLOCK_SIZE);
            ctx.stroke();
        }
    }
    
    function drawPiece(context, piece, blockSize) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    context.fillStyle = piece.color;
                    context.fillRect(
                        (piece.x + x) * blockSize, 
                        (piece.y + y) * blockSize, 
                        blockSize, 
                        blockSize
                    );
                    
                    context.strokeStyle = '#222';
                    context.lineWidth = 1;
                    context.strokeRect(
                        (piece.x + x) * blockSize, 
                        (piece.y + y) * blockSize, 
                        blockSize, 
                        blockSize
                    );
                }
            });
        });
    }
    
    function drawUI() {
        // Update score, level, and lines display
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }
    
    function movePiece(deltaX, deltaY) {
        const newX = currentPiece.x + deltaX;
        const newY = currentPiece.y + deltaY;
        
        if (isValidMove(newX, newY, currentPiece.shape)) {
            currentPiece.x = newX;
            currentPiece.y = newY;
            
            // No sound effects for now
            return true;
        }
        
        // If attempting to move down and failing, it's a drop
        // No sound effects for now
        
        return false;
    }
    
    function rotatePiece() {
        // Clone the current shape to avoid modifying the original
        const originalShape = currentPiece.shape;
        const rows = originalShape.length;
        const cols = originalShape[0].length;
        
        // Create a new rotated shape (90 degrees clockwise)
        let rotatedShape = [];
        for (let i = 0; i < cols; i++) {
            rotatedShape[i] = [];
            for (let j = 0; j < rows; j++) {
                rotatedShape[i][j] = originalShape[rows - 1 - j][i];
            }
        }
        
        // Check if the rotation is valid
        if (isValidMove(currentPiece.x, currentPiece.y, rotatedShape)) {
            currentPiece.shape = rotatedShape;
            return true;
        }
        
        // Attempt wall kick if rotation at current position is not valid
        // Try moving left or right to accommodate rotation
        const kicks = [-1, 1, -2, 2]; // Left, right, 2 left, 2 right
        
        for (const kick of kicks) {
            if (isValidMove(currentPiece.x + kick, currentPiece.y, rotatedShape)) {
                currentPiece.x += kick;
                currentPiece.shape = rotatedShape;
                return true;
            }
        }
        
        return false;
    }
    
    function isValidMove(x, y, shape) {
        // Check each cell of the piece
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    // Calculate actual position on the board
                    const boardX = x + col;
                    const boardY = y + row;
                    
                    // Check boundaries
                    if (
                        boardX < 0 || 
                        boardX >= COLS || 
                        boardY >= ROWS ||
                        (boardY >= 0 && board[boardY][boardX])
                    ) {
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    function placePiece() {
        // Add the piece to the board
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    const boardY = currentPiece.y + y;
                    const boardX = currentPiece.x + x;
                    
                    // Ensure we're within the board
                    if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                        board[boardY][boardX] = currentPiece.color;
                    }
                }
            });
        });
    }
    
    function clearLines() {
        let linesCleared = 0;
        let linesToClear = [];
        
        // Check each row from bottom to top
        for (let y = ROWS - 1; y >= 0; y--) {
            let lineIsFull = true;
            
            for (let x = 0; x < COLS; x++) {
                if (!board[y][x]) {
                    lineIsFull = false;
                    break;
                }
            }
            
            if (lineIsFull) {
                linesToClear.push(y);
                linesCleared++;
            }
        }
        
        // If lines were cleared, update board and score
        if (linesCleared > 0) {
            // Calculate score based on number of lines cleared
            // Using original Nintendo scoring system
            const linePoints = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 lines
            score += linePoints[linesCleared] * level;
            
            // Update lines count
            lines += linesCleared;
            
            // Check for level up (every 10 lines)
            const newLevel = Math.floor(lines / 10) + 1;
            if (newLevel > level) {
                level = newLevel;
                // Increase speed with each level
                dropInterval = Math.max(100, 1000 - ((level - 1) * 100));
            }
            
            // Remove the lines and drop blocks above
            linesToClear.forEach(lineY => {
                // Remove the line
                board.splice(lineY, 1);
                // Add an empty line at the top
                board.unshift(Array(COLS).fill(0));
            });
            
            // Update UI
            drawUI();
        }
    }
    
    function hardDrop() {
        let dropDistance = 0;
        
        while (movePiece(0, 1)) {
            dropDistance++;
        }
        
        // Immediately place piece and get next one
        placePiece();
        clearLines();
        
        // Add bonus for hard drop
        score += dropDistance;
        scoreElement.textContent = score;
        
        // Get next piece
        currentPiece = nextPiece;
        nextPiece = generateRandomPiece();
        
        // Check for game over
        if (!isValidMove(currentPiece.x, currentPiece.y, currentPiece.shape)) {
            gameOver();
        }
    }
    
    function gameOver() {
        isGameOver = true;
        
        // Pause the background music
        const backgroundMusic = document.getElementById('background-music');
        backgroundMusic.pause();
        
        // Show game over screen
        gameOverScreen.classList.remove('hidden');
        finalScoreElement.textContent = score;
        
        // Cancel game loop
        if (gameLoop) {
            cancelAnimationFrame(gameLoop);
            gameLoop = null;
        }
    }
    
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        const backgroundMusic = document.getElementById('background-music');
        
        if (isPaused) {
            pauseScreen.classList.remove('hidden');
            backgroundMusic.pause();
        } else {
            pauseScreen.classList.add('hidden');
            if (soundStatus.textContent === 'Music On') {
                backgroundMusic.play();
            }
        }
    }
    
    function toggleMusic() {
        const backgroundMusic = document.getElementById('background-music');
        
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            soundIcon.className = 'fas fa-volume-up';
            soundStatus.textContent = 'Music On';
        } else {
            backgroundMusic.pause();
            soundIcon.className = 'fas fa-volume-mute';
            soundStatus.textContent = 'Music Off';
        }
    }
    
    function handleKeyPress(event) {
        if (isGameOver) return;
        
        // Pause handling
        if (event.keyCode === 80) { // 'P' key
            togglePause();
            return;
        }
        
        if (isPaused) return;
        
        switch (event.keyCode) {
            case 37: // Left arrow
                movePiece(-1, 0);
                break;
            case 39: // Right arrow
                movePiece(1, 0);
                break;
            case 40: // Down arrow
                movePiece(0, 1);
                break;
            case 38: // Up arrow
                rotatePiece();
                break;
            case 32: // Spacebar (hard drop)
                hardDrop();
                break;
        }
    }
});
