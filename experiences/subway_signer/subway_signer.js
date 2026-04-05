// --- DATA ---
const videoData = {
    'A': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121644/A_ouivyg.mp4', 'B': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121645/B_zllvwo.mp4', 'C': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121646/C_kcx5j2.mp4', 'D': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121646/D_gdhbj1.mp4', 'E': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121647/E_pmfytx.mp4', 'F': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121647/F_ekkekk.mp4', 'G': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121649/G_mmjrui.mp4', 'H': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121650/H_jaa4kr.mp4', 'I': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121650/I_ednq4u.mp4', 'J': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121651/J_wpop2l.mp4', 'K': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121653/K_snz6wp.mp4', 'L': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121653/L_rskpe8.mp4', 'M': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121654/M_r4fl4l.mp4', 'N': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121656/N_hzdetj.mp4', 'O': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121657/O_xemffi.mp4', 'P': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121657/P_j21kry.mp4', 'Q': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121659/Q_mr59x6.mp4', 'R': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121660/R_jwzrro.mp4', 'S': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121662/S_eygskr.mp4', 'T': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121663/T_x83evt.mp4', 'U': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121664/U_cailys.mp4', 'V': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121666/V_e0lifh.mp4', 'W': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121668/W_dijsix.mp4', 'X': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121669/X_rbvscb.mp4', 'Y': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121670/Y_jvljul.mp4', 'Z': 'https://res.cloudinary.com/ddrwjhxu6/video/upload/v1773121671/Z_uu8nkd.mp4'
};
const letters = Object.keys(videoData);

// --- GAME STATE ---
let scene, camera, renderer, player, clock, walls = [];
let ground, ground2;
let gameSpeed = 0.3;
let score = 0;
let isGameOver = false;
let lanes = [-4.5, 0, 4.5];
let currentLane = 1;
let currentTargetLetter;
let materialCache = {};

// --- DOM Elements ---
const scoreElement = document.getElementById('score');
const gameOverContainer = document.getElementById('game-over-container');
const targetVideoElement = document.getElementById('target-image');

        // --- INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x33334d);
    scene.fog = new THREE.Fog(0x33334d, 50, 150);
    clock = new THREE.Clock();
    
    // Get the new container dimensions
    const gameContainer = document.getElementById('game-container');
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 3, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    
    // CRITICAL FIX: Append to the container, not document.body
    gameContainer.appendChild(renderer.domElement); 
    
    setupLighting();
    createPlayer();
    createGround();
    createWalls();
    setNewTarget();
    setupEventListeners();
    spawnWall();
    animate();
}

        function setupLighting() {
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(20, 50, 20);
            directionalLight.castShadow = true;
            scene.add(directionalLight);
        }

        let touchStartX = null;
        const SWIPE_THRESHOLD = 50;

        function moveLeft() {
            if (currentLane > 0) currentLane -= 1;
        }

        function moveRight() {
            if (currentLane < lanes.length - 1) currentLane += 1;
        }

        function onTouchStart(event) {
            if (event.touches && event.touches.length === 1) {
                touchStartX = event.touches[0].clientX;
            }
        }

        function onTouchEnd(event) {
            if (isGameOver || touchStartX === null) return;
            const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : null;
            if (endX === null) return;
            const diff = endX - touchStartX;
            if (Math.abs(diff) > SWIPE_THRESHOLD) {
                if (diff > 0) moveRight();
                else moveLeft();
            }
            touchStartX = null;
        }

        function setupEventListeners() {
            window.addEventListener('resize', onWindowResize, false);
            document.addEventListener('keydown', onKeyDown, false);
            document.addEventListener('touchstart', onTouchStart, false);
            document.addEventListener('touchend', onTouchEnd, false);
            document.getElementById('restart-button').addEventListener('click', restartGame);
        }

        // --- GAME OBJECT CREATION ---
        function createPlayer() {
            player = new THREE.Group();
            const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff });
            const bodyGeometry = new THREE.BoxGeometry(1.5, 2.5, 1);
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.position.y = 2.25;
            body.castShadow = true;
            player.add(body);
            player.body = body;
            const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffdbac });
            const headGeometry = new THREE.BoxGeometry(1, 1, 1);
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.y = 4;
            head.castShadow = true;
            player.add(head);
            const limbMaterial = new THREE.MeshStandardMaterial({ color: 0x0055cc });
            const armGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);
            player.leftArm = new THREE.Mesh(armGeometry, limbMaterial);
            player.leftArm.position.set(-1.2, 2.25, 0);
            player.add(player.leftArm);
            player.rightArm = new THREE.Mesh(armGeometry, limbMaterial);
            player.rightArm.position.set(1.2, 2.25, 0);
            player.add(player.rightArm);
            const legGeometry = new THREE.BoxGeometry(0.5, 2, 0.5);
            legGeometry.translate(0, -1, 0);
            const bodyBottomY = body.position.y - (body.geometry.parameters.height / 2);
            player.leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
            player.leftLeg.position.set(-0.5, bodyBottomY, 0);
            player.add(player.leftLeg);
            player.rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
            player.rightLeg.position.set(0.5, bodyBottomY, 0);
            player.add(player.rightLeg);
            scene.add(player);
        }

        function createGround() {
            const groundGeometry = new THREE.PlaneGeometry(25, 200);
            const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);
            ground2 = ground.clone();
            ground2.position.z = -200;
            scene.add(ground2);
        }

        function createWalls() {
            const planeGeometry = new THREE.PlaneGeometry(4, 8);
            for (let i = 0; i < 5; i++) {
                const wallGroup = new THREE.Group();
                wallGroup.isPassed = false;
                for (let j = 0; j < 3; j++) {
                    const plane = new THREE.Mesh(planeGeometry, new THREE.MeshStandardMaterial());
                    plane.position.x = lanes[j];
                    plane.position.y = 4;
                    plane.castShadow = true;
                    wallGroup.add(plane);
                }
                wallGroup.visible = false;
                walls.push(wallGroup);
                scene.add(wallGroup);
            }
        }

        // --- GAME LOGIC ---
        let preloadedVideos = {}; // This will store our local video URLs
        let loadedCount = 0;
        const totalVideos = Object.keys(videoData).length;
        async function preloadAllVideos() {
        const loadingContainer = document.getElementById('loading-container');
        const progressBar = document.getElementById('loading-progress');

        console.log("Starting preload...");
        const entries = Object.entries(videoData);
    
        for (const [letter, url] of entries) {
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const localUrl = URL.createObjectURL(blob);
                preloadedVideos[letter] = localUrl;
                loadedCount++;
                
                // update progress bar
                const pct = Math.floor((loadedCount / totalVideos) * 100);
                progressBar.style.width = pct + '%';
                console.log(`Loaded ${letter}: ${loadedCount}/${totalVideos}`);
            } catch (e) {
                console.error(`Failed to load ${letter}`, e);
            }
        }
        console.log("All videos preloaded!");
        // hide loading screen and start game
        if (loadingContainer) loadingContainer.style.display = 'none';
        init(); // Start the game ONLY after preloading is done
        }
        function createTextMaterial(text) {
            if (materialCache[text]) {
                const material = materialCache[text].clone();
                material.transparent = false;
                material.opacity = 1.0;
                return material;
            }
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 512;

            context.fillStyle = '#FFFFFF';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = 'Bold 200px Inter';
            context.fillStyle = '#000000';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshStandardMaterial({ map: texture });
            materialCache[text] = material;
            return material.clone();
        }

        function setNewTarget() {
    const randomIndex = Math.floor(Math.random() * letters.length);
    currentTargetLetter = letters[randomIndex];
    
    // Use the preloaded local URL instead of the web link
    targetVideoElement.src = preloadedVideos[currentTargetLetter]; 
    
    targetVideoElement.play();
    targetVideoElement.playbackRate = 1 + (gameSpeed - 0.3) * 4;
}

        function spawnWall() {
            const wall = walls.find(w => !w.visible);
            if (!wall || !currentTargetLetter) return;

            const incorrectOptions = letters.filter(l => l !== currentTargetLetter);
            for (let i = incorrectOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [incorrectOptions[i], incorrectOptions[j]] = [incorrectOptions[j], incorrectOptions[i]];
            }

            const choices = [currentTargetLetter, incorrectOptions[0], incorrectOptions[1]];
            for (let i = choices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choices[i], choices[j]] = [choices[j], choices[i]];
            }
            
            wall.correctLaneIndex = choices.indexOf(currentTargetLetter);

            wall.children.forEach((plane, index) => {
                plane.material = createTextMaterial(choices[index]);
plane.material.opacity = 1; // Explicitly reset
plane.material.transparent = false;
            });

            wall.position.z = -120;
            wall.visible = true;
            wall.isPassed = false;
        }

        function checkGameState() {
            walls.forEach(wall => {
                if (wall.visible && !wall.isPassed) {
                    if (wall.position.z > player.position.z - 1 && wall.position.z < player.position.z + 1) {
                        if (currentLane !== wall.correctLaneIndex) {
                            endGame();
                        } else {
                            score += 100;
                            scoreElement.textContent = `Score: ${score}`;
                            gameSpeed += 0.025;
                            targetVideoElement.playbackRate = 1 + (gameSpeed - 0.3) * 4;
                            wall.isPassed = true;
                            
                            wall.children.forEach(plane => {
                                plane.material.transparent = true;
                                plane.material.opacity = 0.3;
                            });

                            // --- LOGIC FIX: Swapped the order of these two function calls ---
                            setNewTarget(); // Set the target for the wall after the next one.
                            spawnWall(); // Spawn the next wall using the NEW target.
                        }
                    }
                }
            });
        }

        function endGame() {
            isGameOver = true;
            gameOverContainer.style.display = 'block';
        }

        function restartGame() {
            isGameOver = false;
            gameSpeed = 0.3;
            score = 0;
            scoreElement.textContent = `Score: 0`;
            currentLane = 1;
            player.position.set(lanes[currentLane], 0, 0);
            player.rotation.set(0, 0, 0);
            gameOverContainer.style.display = 'none';

            // Reset world and walls
            ground.position.z = 0;
            ground2.position.z = -200;
            walls.forEach(w => {
                w.visible = false;
                w.isPassed = false;
                w.position.z = -120;
                w.children.forEach(plane => {
                    if (plane.material) {
                        plane.material.transparent = false;
                        plane.material.opacity = 1;
                    }
                });
            });

            // Reinitialize timing to avoid delta spikes
            clock = new THREE.Clock();

            setNewTarget();
            spawnWall();
            targetVideoElement.playbackRate = 1;
            animate();
        }

        // --- EVENT HANDLERS ---
function onWindowResize() {
    const gameContainer = document.getElementById('game-container');
    const width = gameContainer.clientWidth;
    const height = gameContainer.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
function onKeyDown(event) {
    // Prevent default scrolling for game controls
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
        event.preventDefault();
    }
    
    if (isGameOver) return;
    
    if (event.key === 'ArrowLeft' && currentLane > 0) currentLane--;
    else if (event.key === 'ArrowRight' && currentLane < lanes.length - 1) currentLane++;
}

        // --- ANIMATION LOOP ---
        function animatePlayer() {
            const time = clock.getElapsedTime() * 10;
            player.rightArm.rotation.x = Math.sin(time) * 0.8;
            player.leftArm.rotation.x = -Math.sin(time) * 0.8;
            player.rightLeg.rotation.x = -Math.sin(time) * 0.8;
            player.leftLeg.rotation.x = Math.sin(time) * 0.8;
        }

        function animate() {
            if (isGameOver) return;
            requestAnimationFrame(animate);
            
            // 1. Get the time passed since the last frame
            const delta = clock.getDelta(); 
            
            // 2. Create a multiplier to keep your current 'gameSpeed' values feeling similar
            // We use 60 as a base so that gameSpeed 0.3 still feels like 0.3 at 60fps.
            const speedFactor = delta * 60; 

            animatePlayer();
            
            const targetX = lanes[currentLane];
            // Use speedFactor for horizontal movement too
            player.position.x += (targetX - player.position.x) * (0.1 * speedFactor);

            // 3. Apply the factor to the world movement (robust looping ground)
            const groundLoopSegment = 200;
            const cameraZ = camera.position.z;

            [ground, ground2].forEach(g => {
                g.position.z += gameSpeed * speedFactor;
                if (g.position.z - cameraZ > groundLoopSegment) {
                    g.position.z -= groundLoopSegment * 2;
                }
            });
            
            walls.forEach(wall => {
                if (wall.visible) {
                    wall.position.z += gameSpeed * speedFactor; // Apply here too
                    if (wall.position.z > camera.position.z) {
                        wall.visible = false;
                    }
                }
            });

            checkGameState();

            // keep the obstacle stream going so there is no long empty phase
            const activeWallCount = walls.filter(w => w.visible).length;
            if (!isGameOver && activeWallCount === 0) {
                setNewTarget();
                spawnWall();
            }

            renderer.render(scene, camera);
        }

        // --- RUN GAME ---
        preloadAllVideos();