       // --- Game Setup ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const gifModal = document.getElementById('gif-modal');
        const topicModal = document.getElementById('topic-modal');
        const topicButtonsContainer = document.getElementById('topic-buttons');
        const gifImage = document.getElementById('gif-image');
        const gifQuestion = document.getElementById('gif-question');
        const optionBtns = [
            document.getElementById('option0'), document.getElementById('option1'),
            document.getElementById('option2'), document.getElementById('option3'),
        ];
        const jumpsDisplay = document.getElementById('jumps-display');
        const levelDisplay = document.getElementById('level-display');
        const messageBox = document.getElementById('message-box');
        const messageText = document.getElementById('message-text');
        const quizButton = document.getElementById('quiz-button');

        // --- Game Constants ---
        const GRAVITY = 0.5;
        const JUMP_POWER = 15;
        const ARROW_LENGTH = 50;
        const ARROW_SPEED = 0.03;

        // --- Game State ---
        let player, jumpsLeft, currentLevel, platforms, arrowAngle, onGround, selectedTopic;
        let arrowDirection = 1;
        let gamePaused = true; // Start paused
        let lastQuizTime = 0;
        let quizCooldown = 3000; // 3 seconds cooldown between quizzes

        // --- Quiz Topics ---
        let quizTopics = {};

        async function loadQuizTopics() {
            const candidates = ['vocabulary_topics.json', '../../vocabulary_topics.json'];
            for (const candidate of candidates) {
                try {
                    const res = await fetch(candidate);
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    const data = await res.json();
                    if (data && typeof data === 'object') {
                        quizTopics = data;
                        return;
                    }
                } catch (e) {
                    console.warn(`Could not load quiz topics JSON from ${candidate}:`, e);
                }
            }
            console.error('Failed to load quiz topics JSON from any known path.');
        }

        // --- Level Design ---
        const levels = [ /* ... Level data remains unchanged ... */ { startX:100,startY:450,platforms:[{x:50,y:500,width:150,height:20},{x:300,y:400,width:100,height:20},{x:500,y:300,width:100,height:20},{x:650,y:200,width:100,height:20,isGoal:true},]},{startX:100,startY:450,platforms:[{x:50,y:500,width:150,height:20},{x:250,y:450,width:50,height:20},{x:400,y:350,width:100,height:20},{x:250,y:250,width:50,height:20},{x:450,y:150,width:100,height:20},{x:650,y:100,width:100,height:20,isGoal:true},]},{startX:100,startY:550,platforms:[{x:50,y:580,width:150,height:20},{x:250,y:450,width:120,height:20,isMoving:true,moveSpeed:1.2,moveRange:150,startX:250},{x:600,y:350,width:100,height:20},{x:400,y:250,width:80,height:20},{x:150,y:150,width:100,height:20,isGoal:true},]} ];

        // --- Game Initialization ---
        async function init() {
            canvas.width = 800;
            canvas.height = 600;
            await loadQuizTopics();
            showTopicModal();
            showMobileHint();
            gameLoop(); // Start the loop, but it will be paused
        }

        function showMobileHint() {
            const hint = document.getElementById('mobile-hint');
            if (!hint) return;

            const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
            if (!isTouch) return;

            hint.classList.remove('hidden');

            const hideHint = () => {
                hint.classList.add('hidden');
                window.removeEventListener('touchstart', hideHint);
                window.removeEventListener('pointerdown', hideHint);
            };

            window.addEventListener('touchstart', hideHint, { once: true });
            window.addEventListener('pointerdown', hideHint, { once: true });
        }

        function startGame() {
            gamePaused = false;
            arrowAngle = -Math.PI / 4;
            currentLevel = 0;
            player = { x: 0, y: 0, vx: 0, vy: 0, radius: 15 };
            jumpsLeft = 3;
            onGround = false;
            loadLevel(currentLevel);
            updateUI();
        }
        
        function loadLevel(levelIndex) {
            const level = levels[levelIndex];
            player.x = level.startX;
            player.y = level.startY;
            player.vx = 0;
            player.vy = 0;
            platforms = JSON.parse(JSON.stringify(level.platforms));
            levelDisplay.textContent = `Level: ${levelIndex + 1}`;
        }
        
        let gameLoopId;
        function gameLoop() {
            if (!gamePaused) {
                update();
            }
            draw();
            gameLoopId = requestAnimationFrame(gameLoop);
        }

        // --- Game Logic ---
        function update() {
            platforms.forEach(p => {
                if (p.isMoving) {
                    if (p.direction === undefined) p.direction = 1;
                    p.x += p.moveSpeed * p.direction;
                    if (p.x >= p.startX + p.moveRange || p.x <= p.startX) {
                        p.direction *= -1;
                    }
                }
            });

            if (onGround) {
                arrowAngle += ARROW_SPEED * arrowDirection;
                if (arrowAngle >= 0) { arrowAngle = 0; arrowDirection = -1; } 
                else if (arrowAngle <= -Math.PI) { arrowAngle = -Math.PI; arrowDirection = 1; }
            }

            player.vy += GRAVITY;
            player.x += player.vx;
            player.y += player.vy;
            player.vx *= 0.98;
            onGround = false;

            platforms.forEach(p => {
                if (player.x > p.x - player.radius && player.x < p.x + p.width + player.radius &&
                    player.y > p.y - player.radius && player.y < p.y + p.height && player.vy > 0) {
                    player.y = p.y - player.radius;
                    player.vy = 0;
		    player.vx = 0;
                    onGround = true;
                    if (p.isMoving) {
                        player.x += p.moveSpeed * p.direction;
                        player.vx = 0;
                    }
                    if (p.isGoal) levelUp();
                }
            });

            if (player.y > canvas.height + player.radius) {
                loadLevel(currentLevel);
            }
        }

        function jump() {
            if (onGround && jumpsLeft > 0) {
                player.vy = Math.sin(arrowAngle) * JUMP_POWER;
                player.vx = Math.cos(arrowAngle) * JUMP_POWER;
                jumpsLeft--;
                onGround = false;
                updateUI();
            }
        }

        function levelUp() {
            currentLevel++;
            if (currentLevel >= levels.length) {
                showMessage("YOU WIN!");
                gamePaused = true;
                setTimeout(init, 3000);
            } else {
                showMessage(`Level ${currentLevel + 1}`);
                setTimeout(()=> messageBox.classList.add('hidden'), 1500);
                loadLevel(currentLevel);
            }
        }

        // --- Drawing ---
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw placeholder elements if game hasn't started
            if (!player) {
                drawPlatformsPlaceholder();
            } else {
                drawPlayer();
                drawPlatforms();
                if (onGround) drawArrow();
            }
        }

        function drawPlayer() {
            ctx.fillStyle = '#BF40BF';
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        function drawPlatforms() {
            platforms.forEach(p => {
                if (p.isGoal) ctx.fillStyle = '#4ade80';
                else if (p.isMoving) ctx.fillStyle = '#f87171';
                else ctx.fillStyle = '#60a5fa';
                ctx.fillRect(p.x, p.y, p.width, p.height);
            });
        }
        
        function drawPlatformsPlaceholder() {
            const p = levels[0].platforms; // Just draw level 1 platforms
             p.forEach(p => {
                if (p.isGoal) ctx.fillStyle = '#4ade80';
                else ctx.fillStyle = '#60a5fa';
                ctx.fillRect(p.x, p.y, p.width, p.height);
            });
        }

        function drawArrow() {
            const endX = player.x + Math.cos(arrowAngle) * ARROW_LENGTH;
            const endY = player.y + Math.sin(arrowAngle) * ARROW_LENGTH;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        function updateUI() {
            jumpsDisplay.textContent = `Jumps: ${jumpsLeft}`;
        }
        
        function showMessage(msg) {
             messageText.textContent = msg;
             messageBox.classList.remove('hidden');
        }

        // --- Modal Logic ---
        function showTopicModal() {
            messageBox.classList.add('hidden'); // Hide any existing messages
            topicButtonsContainer.innerHTML = ''; // Clear old buttons

            const topics = Object.keys(quizTopics);
            if (topics.length === 0) {
                showMessage('No quiz topics loaded. Check console for errors.');
                return;
            }

            topics.forEach(key => {
                const topic = quizTopics[key];
                const button = document.createElement('button');
                button.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-sm md:text-base whitespace-normal';
                button.textContent = topic.title;
                button.onclick = () => selectTopic(key);
                topicButtonsContainer.appendChild(button);
            });
            topicModal.classList.add('active');
        }

        function selectTopic(topicKey) {
            selectedTopic = topicKey;
            topicModal.classList.remove('active');
            startGame();
        }

        function showGifModal() {
            const currentTime = Date.now();
            if (currentTime - lastQuizTime < quizCooldown) {
                const remainingTime = Math.ceil((quizCooldown - (currentTime - lastQuizTime)) / 1000);
                showMessage(`Quiz cooldown: ${remainingTime}s remaining`);
                setTimeout(() => messageBox.classList.add('hidden'), 1500);
                return;
            }
            
            lastQuizTime = currentTime;
            gamePaused = true;
            const topic = quizTopics[selectedTopic];
            const currentQuestion = topic.questions[Math.floor(Math.random() * topic.questions.length)];
            
            gifImage.src = currentQuestion.image;
            gifQuestion.textContent = currentQuestion.question;
            
            optionBtns.forEach((btn, index) => {
                btn.textContent = currentQuestion.options[index];
                btn.onclick = () => handleAnswer(index === currentQuestion.correct);
            });

            gifModal.classList.add('active');
        }

        function handleAnswer(isCorrect) {
            gifModal.classList.remove('active');
            if (isCorrect) {
                jumpsLeft += 3;
                updateUI();
                 showMessage("Correct! +3 Jumps");
            } else {
                 showMessage("Wrong Answer!");
            }
             setTimeout(()=> messageBox.classList.add('hidden'), 1500);
            
            setTimeout(() => {
                gamePaused = false;
            }, 500);
        }

        // --- Event Listeners ---
        window.addEventListener('load', init);
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Always prevent default spacebar behavior
                if (onGround && !gamePaused && jumpsLeft > 0) {
                    jump();
                }
            }
        });

        function shouldIgnoreTap(target) {
            return !!target.closest('#quiz-button') || !!target.closest('#topic-modal') || !!target.closest('#gif-modal');
        }

        function handleTapToJump(e) {
            if (shouldIgnoreTap(e.target)) return;
            if (onGround && !gamePaused && jumpsLeft > 0) {
                jump();
            }
        }

        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') handleTapToJump(e);
        });

        window.addEventListener('touchstart', (e) => {
            handleTapToJump(e);
        });

        quizButton.addEventListener('click', () => {
            if (!gamePaused) {
                showGifModal();
            }
        }); 