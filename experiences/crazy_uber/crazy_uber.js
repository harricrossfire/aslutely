        let scene, camera, renderer;
        let car;
        const keys = {};
        let fuel = 100;
        const maxFuel = 100;
        const fuelDepletionRate = 0.06;
        const nitroFuelCost = 10;
        let health = 100;
        const maxHealth = 100;
        let fuelBarElement, healthBarElement, nitroDisplayElement;
        let animationFrameId;
        let currentCorrectAnswer = '';
        let selectedAnswerButton = null;
        let selectedQuizCategory = 'Fingerspelling';
        let buildings = [];
        let collisionObjects = [];
        let aiCars = [];
        let people = [];
        let nitroPickups = [];
        let score = 0;
        let scoreBoardElement, timerElement, starGuideElement;

        // --- CAR PHYSICS & STATE ---
        let carVelocity = new THREE.Vector3();
        let currentSpeed = 0;
        let playerName = "Driver";
        let playerCarColor = 0xff0000;
        let nitroCount = 0;
        let isNitroActive = false;

        let gameState = 'START_SCREEN';
        let currentPassenger = null;
        let currentDestination = null;
        let currentDropoffPosition = null;
        let deliveryStartTime = 0;
        let arrow, targetMarker;
        let flame1, flame2;

        const normalCameraOffset = new THREE.Vector3(0, 5, -10);
        const nitroCameraOffset = new THREE.Vector3(0, 7, -14);
        let currentCameraOffset = new THREE.Vector3(0, 5, -10);

            const quizQuestions = {}
        function startGame() {
            const nameInput = document.getElementById('player-name');
            if (nameInput.value) {
                playerName = nameInput.value;
            }
            document.getElementById('start-modal').style.display = 'none';
            init();
        }

        function init() {
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xadd8e6);
            scene.fog = new THREE.Fog(0xadd8e6, 150, 400);

            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.shadowMap.enabled = true;
            document.body.appendChild(renderer.domElement);

            fuelBarElement = document.getElementById('fuel-bar');
            healthBarElement = document.getElementById('health-bar');
            scoreBoardElement = document.getElementById('score-board');
            timerElement = document.getElementById('timer-display');
            starGuideElement = document.getElementById('star-guide');
            nitroDisplayElement = document.getElementById('nitro-display');

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(100, 200, 150);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.left = -300;
            directionalLight.shadow.camera.right = 300;
            directionalLight.shadow.camera.top = 300;
            directionalLight.shadow.camera.bottom = -300;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 500;
            scene.add(directionalLight);

            createGround();
            createRoads();
            createBuildings();
            createBoundaryWalls();
            createPeople();
            createAICars();
            createNitros();
            createCar();
            createHelpers();
            setupUI();
            
            gameState = 'FINDING_PASSENGER';
            selectNewPassenger();

            window.addEventListener('keydown', (e) => (keys[e.key] = true));
            window.addEventListener('keyup', (e) => (keys[e.key] = false));
            window.addEventListener('resize', onWindowResize, false);

            animate();
        }

        function createGround() {
            const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
            const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8, metalness: 0.2 });
            const ground = new THREE.Mesh(planeGeometry, planeMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);
        }

        function createRoads() {
            const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
            const roadWidth = 20;
            const roadLength = 600;

            for (let i = -2; i <= 2; i++) {
                if (i === 0) continue;
                const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
                const road = new THREE.Mesh(roadGeometry, roadMaterial);
                road.rotation.x = -Math.PI / 2;
                road.position.set(i * 100, 0.01, 0);
                road.receiveShadow = true;
                scene.add(road);
            }

            for (let i = -2; i <= 2; i++) {
                 if (i === 0) continue;
                const roadGeometry = new THREE.PlaneGeometry(roadLength, roadWidth);
                const road = new THREE.Mesh(roadGeometry, roadMaterial);
                road.rotation.x = -Math.PI / 2;
                road.position.set(0, 0.01, i * 100);
                road.receiveShadow = true;
                scene.add(road);
            }
        }

        function createBuildings() {
            const buildingColors = [0xa6cee3, 0x1f78b4, 0xb2df8a, 0x33a02c, 0xfb9a99, 0xe31a1c, 0xfdbf6f, 0xff7f00, 0xcab2d6];
            const blockSize = 100;
            const roadWidth = 20;
            const sidewalkWidth = 10;
            const buildingArea = blockSize - roadWidth - (sidewalkWidth * 2);

            for (let i = -2; i < 2; i++) {
                for (let j = -2; j < 2; j++) {
                    if (i === 0 && j === 0) continue;

                    const buildingHeight = Math.random() * 30 + 10;
                    const buildingGeometry = new THREE.BoxGeometry(buildingArea, buildingHeight, buildingArea);
                    const buildingMaterial = new THREE.MeshStandardMaterial({ 
                        color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                        transparent: true,
                        opacity: 0
                    });
                    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
                    
                    building.position.set(i * blockSize + blockSize / 2, buildingHeight / 2, j * blockSize + blockSize / 2);
                    building.castShadow = true;
                    building.receiveShadow = true;
                    scene.add(building);
                    buildings.push(building);
                    collisionObjects.push(new THREE.Box3().setFromObject(building));
                }
            }
        }

        function createBoundaryWalls() {
            const wallHeight = 50;
            const wallThickness = 5;
            const mapSize = 600;
            const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, transparent: true, opacity: 0.5 });

            const wallPositions = [
                { x: 0, z: -mapSize/2, w: mapSize, h: wallThickness }, { x: 0, z: mapSize/2, w: mapSize, h: wallThickness },
                { x: -mapSize/2, z: 0, w: wallThickness, h: mapSize }, { x: mapSize/2, z: 0, w: wallThickness, h: mapSize }
            ];

            wallPositions.forEach(pos => {
                const wallGeometry = new THREE.BoxGeometry(pos.w, wallHeight, pos.h);
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(pos.x, wallHeight/2, pos.z);
                scene.add(wall);
                collisionObjects.push(new THREE.Box3().setFromObject(wall));
            });
        }

        function createPeople() {
            const personColors = [0x0055ff, 0xffa500, 0xffff00, 0xffc0cb];
            const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
            const blockSize = 100;
            const roadWidth = 20;
            const sidewalkWidth = 10;
            const halfBlock = blockSize / 2;
            const buildingArea = blockSize - roadWidth - (sidewalkWidth * 2);

            for (let i = 0; i < 10; i++) {
                const personMaterial = new THREE.MeshStandardMaterial({ color: personColors[Math.floor(Math.random() * personColors.length)] });
                const person = new THREE.Group();

                const body = new THREE.Mesh(bodyGeometry, personMaterial);
                body.position.y = 0.75;
                const head = new THREE.Mesh(headGeometry, personMaterial);
                head.position.y = 1.5 + 0.5;

                person.add(body); person.add(head);

                const blockX = Math.floor(Math.random() * 4) - 2;
                const blockZ = Math.floor(Math.random() * 4) - 2;

                const side = Math.floor(Math.random() * 4);
                let x, z;
                
                const sidewalkStart = buildingArea / 2;
                const sidewalkEnd = halfBlock - roadWidth / 2;
                
                const randomLengthPos = (Math.random() - 0.5) * buildingArea;
                const randomWidthPos = sidewalkStart + Math.random() * (sidewalkEnd - sidewalkStart);

                switch(side) {
                    case 0: x = randomLengthPos; z = randomWidthPos; break;
                    case 1: x = randomLengthPos; z = -randomWidthPos; break;
                    case 2: x = randomWidthPos; z = randomLengthPos; break;
                    case 3: x = -randomWidthPos; z = randomLengthPos; break;
                }
                
                person.position.set(blockX * blockSize + halfBlock + x, 0, blockZ * blockSize + halfBlock + z);
                person.traverse(child => { if (child.isMesh) child.castShadow = true; });
                scene.add(person);
                people.push({ mesh: person, isPickedUp: false });
            }
        }
        
        function createCarMesh(color) {
            const carMesh = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshStandardMaterial({ color }));
            body.castShadow = true; carMesh.add(body);
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2.5), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            cabin.position.set(0, 0.9, -0.5); cabin.castShadow = true; carMesh.add(cabin);
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
            const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const wheelPositions = [ { x: 1.2, z: 1.2 }, { x: -1.2, z: 1.2 }, { x: 1.2, z: -1.2 }, { x: -1.2, z: -1.2 } ];
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeo, wheelMat);
                wheel.position.set(pos.x, -0.25, pos.z); wheel.rotation.z = Math.PI / 2;
                wheel.castShadow = true; carMesh.add(wheel);
            });
            return carMesh;
        }

        function createAICars() {
            const aiCarColors = [0x0000ff, 0x00ff00, 0x800080, 0xffff00, 0xffffff];
            const paths = [
                [ new THREE.Vector3(-200, 1, -200), new THREE.Vector3(200, 1, -200), new THREE.Vector3(200, 1, 200), new THREE.Vector3(-200, 1, 200) ],
                [ new THREE.Vector3(100, 1, 100), new THREE.Vector3(100, 1, -100), new THREE.Vector3(-100, 1, -100), new THREE.Vector3(-100, 1, 100) ],
                [ new THREE.Vector3(200, 1, -100), new THREE.Vector3(100, 1, -100), new THREE.Vector3(100, 1, 100), new THREE.Vector3(200, 1, 100) ],
                [ new THREE.Vector3(-100, 1, -200), new THREE.Vector3(-200, 1, -200), new THREE.Vector3(-200, 1, 200), new THREE.Vector3(-100, 1, 200) ]
            ];
            
            paths.forEach(path => {
                const carMesh = createCarMesh(aiCarColors[Math.floor(Math.random() * aiCarColors.length)]);
                carMesh.position.copy(path[0]);
                
                scene.add(carMesh);
                aiCars.push({
                    mesh: carMesh,
                    path: path,
                    targetIndex: 1,
                    speed: 0.5 + Math.random() * 0.3
                });
            });
        }

        function createCar() {
            car = createCarMesh(playerCarColor);
            car.position.set(100, 1, 0);
            scene.add(car);

            // Create flames
            const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.8 });
            flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 8), flameMaterial);
            flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1, 8), flameMaterial);
            flame1.position.set(-0.6, -0.2, -2.2);
            flame2.position.set(0.6, -0.2, -2.2);
            flame1.rotation.x = Math.PI / 2;
            flame2.rotation.x = Math.PI / 2;
            flame1.visible = false;
            flame2.visible = false;
            car.add(flame1, flame2);
        }

        function createNitros() {
            const nitroGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
            const nitroMaterial = new THREE.MeshStandardMaterial({ color: 0x800080, emissive: 0x800080 });
            for (let i = 0; i < 5; i++) {
                const nitro = new THREE.Mesh(nitroGeometry, nitroMaterial);
                const roadX = (Math.floor(Math.random() * 4) - 2 + 0.5) * 100;
                const roadZ = (Math.floor(Math.random() * 4) - 2 + 0.5) * 100;
                nitro.position.set(roadX, 1, roadZ);
                scene.add(nitro);
                nitroPickups.push(nitro);
            }
        }

        function createHelpers() {
            const arrowGeometry = new THREE.ConeGeometry(0.7, 5, 8);
            arrowGeometry.rotateX(Math.PI / 2);
            const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            scene.add(arrow);

            const markerGeometry = new THREE.CylinderGeometry(5, 5, 0.5, 32);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            targetMarker = new THREE.Mesh(markerGeometry, markerMaterial);
            scene.add(targetMarker);
        }

        function setupUI() {
            document.getElementById('earn-fuel-btn').addEventListener('click', showQuiz);
            document.getElementById('close-quiz-btn').addEventListener('click', closeQuiz);
            document.getElementById('restart-game-btn').addEventListener('click', restartGame);
        }

        function showQuiz() {
            document.getElementById('quiz-modal').style.display = 'block';
            loadNewQuestion();
        }

        function closeQuiz() {
            document.getElementById('quiz-modal').style.display = 'none';
        }

        function loadNewQuestion() {
            const gifEl = document.getElementById('quiz-gif');
            const answersContainer = document.getElementById('answers-container');
            const questionEl = document.getElementById('question');
            
            answersContainer.innerHTML = '';
            selectedAnswerButton = null;

            // Get questions from selected category
            const categoryQuestions = quizQuestions[selectedQuizCategory];
            if (!categoryQuestions || categoryQuestions.length === 0) {
                console.error('No questions found for category:', selectedQuizCategory);
                return;
            }

            const currentQuestion = categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
            
            // Handle both old and new data formats
            let imageUrl, questionText, answerOptions, correctAnswerIndex;
            
            if (currentQuestion.gif) {
                // Old format
                imageUrl = currentQuestion.gif;
                questionText = currentQuestion.question;
                answerOptions = currentQuestion.answers;
                correctAnswerIndex = currentQuestion.correctAnswer;
            } else {
                // New format
                imageUrl = currentQuestion.image;
                questionText = currentQuestion.question;
                answerOptions = currentQuestion.options;
                correctAnswerIndex = currentQuestion.correct;
            }
            
            currentCorrectAnswer = answerOptions[correctAnswerIndex];
            gifEl.src = imageUrl;
            questionEl.textContent = questionText;

            // Use the predefined answers from the question
            answerOptions.forEach(answer => {
                const button = document.createElement('button');
                button.textContent = answer;
                button.classList.add('answer-btn');
                button.addEventListener('click', () => checkAnswer(button));
                answersContainer.appendChild(button);
            });
        }

        function checkAnswer(clickedButton) {
            const answerButtons = document.querySelectorAll('.answer-btn');
            answerButtons.forEach(button => button.disabled = true);

            const selectedAnswer = clickedButton.textContent;
            const correctButton = Array.from(answerButtons).find(btn => btn.textContent === currentCorrectAnswer);
            if (correctButton) correctButton.classList.add('correct');

            if (selectedAnswer === currentCorrectAnswer) {
                const fuelReward = 40;
                fuel = Math.min(fuel + fuelReward, maxFuel);
                const notification = document.getElementById('fuel-notification');
                notification.textContent = `+${fuelReward} Fuel`;
                notification.classList.add('show');
                setTimeout(() => { notification.classList.remove('show'); }, 1200);
            } else {
                clickedButton.classList.add('incorrect');
            }
            
            setTimeout(() => { loadNewQuestion(); }, 1200);
        }

        function updateCar() {
            if (fuel <= 0 || gameState === 'GAME_OVER') return;
            const maxSpeed = 0.5;
            const acceleration = 0.02;
            const deceleration = 0.95;
            const turnSpeed = 0.03;
            const driftFactor = 0.07;
            let isMoving = false;

            if (isNitroActive) {
                currentSpeed = 1.5;
                fuel = Math.max(0, fuel - nitroFuelCost / 180); // Consume 10 fuel over 3 seconds (180 frames)
            } else {
                if (keys['ArrowUp']) {
                    currentSpeed += acceleration;
                    isMoving = true;
                } else if (keys['ArrowDown']) {
                    currentSpeed -= acceleration;
                    isMoving = true;
                } else {
                    currentSpeed *= deceleration;
                }
                currentSpeed = Math.max(-maxSpeed / 2, Math.min(maxSpeed, currentSpeed));
            }

            if (Math.abs(currentSpeed) > 0.01) {
                if (keys['ArrowLeft']) {
                    car.rotateY(turnSpeed * (currentSpeed > 0 ? 1 : -1));
                }
                if (keys['ArrowRight']) {
                    car.rotateY(-turnSpeed * (currentSpeed > 0 ? 1 : -1));
                }
            }

            const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
            carVelocity.lerp(forward.multiplyScalar(currentSpeed), driftFactor);
            
            const originalPosition = car.position.clone();
            car.position.add(carVelocity);

            if (isMoving && !isNitroActive) {
                fuel = Math.max(0, fuel - fuelDepletionRate);
            }

            const carBox = new THREE.Box3().setFromObject(car);
            let collision = false;
            
            for (const objectBox of collisionObjects) {
                if (carBox.intersectsBox(objectBox)) { collision = true; break; }
            }
            if (!collision) {
                for (const aiCar of aiCars) {
                    if (carBox.intersectsBox(new THREE.Box3().setFromObject(aiCar.mesh))) { collision = true; break; }
                }
            }

            if (collision) {
                car.position.copy(originalPosition);
                currentSpeed = 0;
                carVelocity.set(0, 0, 0);
                health = Math.max(0, health - 5);
                if (health <= 0) {
                    endGame("You wrecked your car!");
                }
            }

            if (car.position.distanceTo(targetMarker.position) < 7) {
                if (gameState === 'FINDING_PASSENGER') {
                    pickupPassenger();
                } else if (gameState === 'DELIVERING_PASSENGER') {
                    dropoffPassenger();
                }
            }

            for (let i = nitroPickups.length - 1; i >= 0; i--) {
                const nitro = nitroPickups[i];
                if (car.position.distanceTo(nitro.position) < 5) {
                    nitroCount++;
                    scene.remove(nitro);
                    nitroPickups.splice(i, 1);
                }
            }

            if (keys[' '] && nitroCount > 0 && !isNitroActive) {
                isNitroActive = true;
                nitroCount--;
                setTimeout(() => { isNitroActive = false; }, 3000);
            }
        }

        function updateAICars() {
            aiCars.forEach((aiCar) => {
                const carMesh = aiCar.mesh;
                const targetPos = aiCar.path[aiCar.targetIndex];
                const direction = new THREE.Vector3().subVectors(targetPos, carMesh.position);

                if (direction.lengthSq() < 4) {
                    aiCar.targetIndex = (aiCar.targetIndex + 1) % aiCar.path.length;
                } 
                else {
                    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
                    carMesh.quaternion.slerp(targetQuaternion, 0.1);
                    carMesh.translateZ(aiCar.speed);
                }
            });
        }

        function updateFuelBar() {
            const fuelPercentage = (fuel / maxFuel) * 100;
            fuelBarElement.style.width = fuelPercentage + '%';

            const earnFuelBtn = document.getElementById('earn-fuel-btn');
            if (fuel <= 0) {
                earnFuelBtn.classList.add('out-of-fuel');
            } else {
                earnFuelBtn.classList.remove('out-of-fuel');
            }
        }

        function updateHealthBar() {
            const healthPercentage = (health / maxHealth) * 100;
            healthBarElement.style.width = healthPercentage + '%';
        }

        function updateCarAppearance() {
            const carBody = car.children[0];
            if (health < 50) {
                carBody.material.color.set(0x8B0000);
            } else {
                carBody.material.color.set(playerCarColor);
            }

            flame1.visible = isNitroActive;
            flame2.visible = isNitroActive;
            if (isNitroActive) {
                flame1.scale.set(1, 1, Math.random() * 2 + 1);
                flame2.scale.set(1, 1, Math.random() * 2 + 1);
            }
        }

        function updateBuildingOpacity() {
            const maxVisibleDistance = 300;
            const minVisibleDistance = 100;

            buildings.forEach(building => {
                const distance = car.position.distanceTo(building.position);
                let opacity = 1.0;

                if (distance > maxVisibleDistance) {
                    opacity = 0.0;
                } else if (distance > minVisibleDistance) {
                    opacity = 1.0 - (distance - minVisibleDistance) / (maxVisibleDistance - minVisibleDistance);
                }
                
                building.material.opacity = opacity;
            });
        }
        
        function updateHelpers() {
            if (gameState === 'GAME_OVER' || !currentPassenger) {
                arrow.visible = false;
                targetMarker.visible = false;
                return;
            }

            const targetPosition = (gameState === 'FINDING_PASSENGER') ? currentPassenger.mesh.position : currentDropoffPosition;
            const distance = car.position.distanceTo(targetPosition);
            
            if (distance < 25) {
                arrow.position.set(targetPosition.x, targetPosition.y + 8, targetPosition.z);
                arrow.rotation.set(Math.PI / 2, 0, 0);
            } else {
                arrow.position.copy(car.position).add(new THREE.Vector3(0, 6, 0));
                arrow.lookAt(targetPosition);
            }

            targetMarker.position.set(targetPosition.x, 0.1, targetPosition.z);
            targetMarker.scale.y = Math.sin(Date.now() * 0.005) * 0.2 + 1;
            targetMarker.rotation.y += 0.02;
        }

        function updateTimer() {
            if (gameState !== 'DELIVERING_PASSENGER') return;

            const elapsedTime = (Date.now() - deliveryStartTime) / 1000;
            timerElement.textContent = `Time: ${elapsedTime.toFixed(2)}`;

            let stars = '';
            if (elapsedTime < 15) stars = '★★★★★';
            else if (elapsedTime < 25) stars = '★★★★☆';
            else if (elapsedTime < 35) stars = '★★★☆☆';
            else if (elapsedTime < 45) stars = '★★☆☆☆';
            else stars = '★☆☆☆☆';
            starGuideElement.innerHTML = stars;
        }

        function selectNewPassenger() {
            const availablePeople = people.filter(p => !p.isPickedUp);
            if (availablePeople.length === 0) {
                endGame("You've delivered all passengers!");
                return;
            }
            currentPassenger = availablePeople[Math.floor(Math.random() * availablePeople.length)];
            targetMarker.material.color.set(0x00ff00);
            arrow.material.color.set(0x00ff00);
        }

        function pickupPassenger() {
            currentPassenger.isPickedUp = true;
            currentPassenger.mesh.visible = false;
            
            let destination;
            do {
                destination = buildings[Math.floor(Math.random() * buildings.length)];
            } while (destination.position.distanceTo(currentPassenger.mesh.position) < 200);
            currentDestination = destination;

            const blockSize = 100;
            const roadWidth = 20;
            const sidewalkWidth = 10;
            const buildingArea = blockSize - roadWidth - (sidewalkWidth * 2);
            const offset = buildingArea / 2 + sidewalkWidth / 2;
            const side = Math.floor(Math.random() * 4);
            let dropoffPos = currentDestination.position.clone();

            switch(side) {
                case 0: dropoffPos.z += offset; break;
                case 1: dropoffPos.z -= offset; break;
                case 2: dropoffPos.x += offset; break;
                case 3: dropoffPos.x -= offset; break;
            }
            currentDropoffPosition = dropoffPos;
            
            gameState = 'DELIVERING_PASSENGER';
            deliveryStartTime = Date.now();
            targetMarker.material.color.set(0xffff00);
            arrow.material.color.set(0xff0000);
            timerElement.style.display = 'block';
            starGuideElement.style.display = 'block';
        }

        function dropoffPassenger() {
            const timeTaken = (Date.now() - deliveryStartTime) / 1000;
            const points = Math.max(10, 100 - Math.floor(timeTaken * 2));
            score += points;
            scoreBoardElement.textContent = `Score: ${score}`;

            gameState = 'FINDING_PASSENGER';
            timerElement.style.display = 'none';
            starGuideElement.style.display = 'none';
            selectNewPassenger();
        }

        function endGame(message) {
            gameState = 'GAME_OVER';
            document.getElementById('game-over-title').textContent = `${playerName}, ${message}`;
            document.getElementById('final-score').textContent = score;
            const totalPassengers = people.length;
            const starRating = Math.max(1, Math.ceil((score / (totalPassengers * 100)) * 5));
            document.getElementById('star-rating').textContent = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
            document.getElementById('game-over-modal').style.display = 'block';
        }

        function updateCamera() {
            const targetOffset = isNitroActive ? nitroCameraOffset : normalCameraOffset;
            currentCameraOffset.lerp(targetOffset, 0.1);
            
            const cameraPosition = car.position.clone().add(currentCameraOffset.clone().applyQuaternion(car.quaternion));
            camera.position.lerp(cameraPosition, 0.4);
            camera.lookAt(car.position);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            if (gameState !== 'START_SCREEN') {
                updateCar();
                updateAICars();
                updateCamera();
                updateFuelBar();
                updateHealthBar();
                updateCarAppearance();
                updateBuildingOpacity();
                updateHelpers();
                updateTimer();
                nitroDisplayElement.textContent = `Nitro: ${nitroCount}`;
            }
            renderer.render(scene, camera);
        }

        function resetGameState() {
            // Reset all game variables to initial state
            fuel = 100;
            health = 100;
            score = 0;
            nitroCount = 0;
            isNitroActive = false;
            currentSpeed = 0;
            carVelocity.set(0, 0, 0);
            gameState = 'FINDING_PASSENGER';
            currentPassenger = null;
            currentDestination = null;
            currentDropoffPosition = null;
            deliveryStartTime = 0;

            // Reset UI elements
            scoreBoardElement.textContent = 'Score: 0';
            timerElement.style.display = 'none';
            starGuideElement.style.display = 'none';
            nitroDisplayElement.textContent = 'Nitro: 0';
            updateFuelBar();
            updateHealthBar();

            // Reset car position and rotation
            car.position.set(0, 1, 0);
            car.rotation.set(0, 0, 0);
            car.quaternion.set(0, 0, 0, 1);

            // Reset camera
            currentCameraOffset.copy(normalCameraOffset);

            // Reset people visibility and pickup status
            people.forEach(person => {
                person.isPickedUp = false;
                person.mesh.visible = true;
            });

            // Reset arrow and target marker
            if (arrow && targetMarker) {
                arrow.visible = true;
                targetMarker.visible = true;
                arrow.material.color.set(0x00ff00);
                targetMarker.material.color.set(0x00ff00);
            }

            // Hide modals
            document.getElementById('game-over-modal').style.display = 'none';
            document.getElementById('quiz-modal').style.display = 'none';

            // Start new game
            selectNewPassenger();
        }

        function restartGame() {
            resetGameState();
        }

        document.addEventListener('DOMContentLoaded', () => {
            // Load quiz questions from vocabulary_topics.json
            fetch('../../vocabulary_topics.json')
                .then(response => response.json())
                .then(data => {
                    // Populate quizQuestions with categories and their questions
                    const categorySelect = document.getElementById('quiz-category-select');
                    
                    for (const [key, category] of Object.entries(data)) {
                        quizQuestions[key] = category.questions;
                        
                        // Add option to category select
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = category.title || key;
                        categorySelect.appendChild(option);
                    }
                    
                    // Set initial category to first available
                    if (Object.keys(quizQuestions).length > 0) {
                        selectedQuizCategory = Object.keys(quizQuestions)[0];
                        categorySelect.value = selectedQuizCategory;
                    }
                    
                    console.log('Quiz categories loaded:', Object.keys(quizQuestions));
                })
                .catch(error => console.error('Error loading vocabulary topics:', error));

             document.getElementById('start-game-btn').addEventListener('click', () => {
                 // Get selected quiz category
                 selectedQuizCategory = document.getElementById('quiz-category-select').value;
                 startGame();
             });
             document.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', () => {
                    document.querySelector('.color-swatch.selected').classList.remove('selected');
                    swatch.classList.add('selected');
                    playerCarColor = parseInt(swatch.dataset.color);
                });
            });
        });