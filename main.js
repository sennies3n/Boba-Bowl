// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Create the Babylon engine
const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true // Enable anti-aliasing for smoother edges
});

// Create the scene
const scene = new BABYLON.Scene(engine);

// === Configuration & Constants ===
const PANDA_POS = new BABYLON.Vector3(-3, 0, -12); // Panda's base position (moved slightly)
const BALL_START_POS = new BABYLON.Vector3(0, 0.3, 13); // Initial ball position (slightly lower for physics)
const LANE_WIDTH = 3;
const LANE_DEPTH = 30;
const BUMPER_WIDTH = 0.3;
const BUMPER_HEIGHT = 0.4;
const BALL_DIAMETER = 0.5;
const BALL_MASS = 1.5;
const BALL_RESTITUTION = 0.6; // Slightly bouncier
const BALL_FRICTION = 0.4;   // Slightly more friction
const STATIC_OBJECT_FRICTION = 0.2;
const STATIC_OBJECT_RESTITUTION = 0.2;
const LAUNCH_IMPULSE_FORCE = 8; // Force applied to the ball on launch

// === Physics Engine Setup ===
// Use uppercase CANNON for the global object from cannon.js script
const cannonPlugin = new BABYLON.CannonJSPlugin(true, 10, CANNON);
scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), cannonPlugin); // Enable physics with gravity

// === Game State Variables ===
let isDragging = false;
let hasLaunched = false;
let dragStartX = 0; // Not strictly needed with PointerDragBehavior, but kept for potential future use
let ball = null;
let dragArrowLeft = null;
let dragArrowRight = null;

// === Asset Loading (Sounds) ===
const boopSound = new Audio("drag-cue.mp3");
const swishSound = new Audio("swish-sound.mp3");
// boopSound.load(); // Optional preloading
// swishSound.load();

// === Helper Functions ===

function createCloud(x, y, z, scale = 1) {
    const cloud = BABYLON.MeshBuilder.CreatePlane("cloud_" + x + "_" + z, { size: 6 * scale }, scene); // Unique name
    cloud.position = new BABYLON.Vector3(x, y, z);
    cloud.rotation.y = Math.PI;

    let cloudMat = scene.getMaterialByName("cloudMat");
    if (!cloudMat) {
        cloudMat = new BABYLON.StandardMaterial("cloudMat", scene);
        const cloudTexture = new BABYLON.Texture("https://i.imgur.com/qXbIq1T.png", scene);
        cloudMat.diffuseTexture = cloudTexture;
        cloudMat.opacityTexture = cloudTexture;
        cloudMat.backFaceCulling = false;
        cloudMat.useAlphaFromDiffuseTexture = true;
        cloudMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        cloudMat.alpha = 0.9; // Slightly transparent clouds
    }
    cloud.material = cloudMat;
    cloud.isPickable = false;
    return cloud;
}

function createTrailEmitter(sourceMesh, scene, color = new BABYLON.Color4(1, 1, 1, 0.6)) {
    const systemId = sourceMesh.name + "_sparkleTrail";
    // Use getParticleSystemById to check if system already exists
    if (scene.getParticleSystemById(systemId)) {
        return; // Don't create duplicates
    }
    const particleSystem = new BABYLON.ParticleSystem(systemId, 200, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = sourceMesh;
    particleSystem.minEmitBox = new BABYLON.Vector3(0, 0, 0);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    particleSystem.color1 = color;
    particleSystem.color2 = color;
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 0);
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.1;
    particleSystem.minLifeTime = 0.2;
    particleSystem.maxLifeTime = 0.4;
    particleSystem.emitRate = 40;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0);
    particleSystem.minEmitPower = 0.1;
    particleSystem.maxEmitPower = 0.3;
    particleSystem.updateSpeed = 0.015;
    particleSystem.start();
    return particleSystem;
}

// === Scene Creation ===

// --- Camera ---
const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, 18), scene); // Start further back
camera.radius = 10;
camera.heightOffset = 4;
camera.rotationOffset = 0;
camera.cameraAcceleration = 0.05;
camera.maxCameraSpeed = 15;
camera.lowerRadiusLimit = 4;
camera.upperRadiusLimit = 25;
camera.lowerHeightOffsetLimit = 1;
camera.upperHeightOffsetLimit = 10;
// camera.lockedTarget assigned later after ball creation

// --- Lighting ---
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.5, 1, 0.2), scene);
light.intensity = 0.9;
light.diffuse = new BABYLON.Color3(1, 1, 1);
light.specular = new BABYLON.Color3(0.8, 0.8, 0.8);
light.groundColor = new BABYLON.Color3(0.6, 0.6, 0.8); // Slightly bluer ground color

// --- Sky Backdrop ---
const sky = BABYLON.MeshBuilder.CreatePlane("sky", { width: 150, height: 90 }, scene);
sky.position = new BABYLON.Vector3(0, 25, -40);
sky.rotation.x = Math.PI / 12;
sky.material = new BABYLON.StandardMaterial("skyMat", scene);
sky.material.backFaceCulling = false;
sky.material.disableLighting = true;
sky.material.emissiveColor = BABYLON.Color3.White();
sky.isPickable = false;

const skyTexture = new BABYLON.DynamicTexture("skyTexture", { width: 2, height: 128 }, scene, false);
sky.material.diffuseTexture = skyTexture;
sky.material.diffuseTexture.hasAlpha = false;
const skyCtx = skyTexture.getContext();
const gradient = skyCtx.createLinearGradient(0, 0, 0, 128);
gradient.addColorStop(0, "#aee2ff"); // Light blue top
gradient.addColorStop(1, "#e8f8ff"); // Lighter bottom
skyCtx.fillStyle = gradient;
skyCtx.fillRect(0, 0, 2, 128);
skyTexture.update();

// --- Sun ---
const sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 5 }, scene);
sun.position = new BABYLON.Vector3(-25, 25, -39.9);
sun.material = new BABYLON.StandardMaterial("sunMat", scene);
sun.material.emissiveColor = new BABYLON.Color3(1, 0.9, 0.4);
sun.material.diffuseColor = new BABYLON.Color3(0, 0, 0);
sun.material.specularColor = new BABYLON.Color3(0, 0, 0);
sun.material.disableLighting = true;
sun.isPickable = false;

// --- Ground ---
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 150, height: 150 }, scene); // Wider ground
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3.FromHexString("#b8f5d7"); // Pastel green
groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
ground.material = groundMat;
ground.position.y = 0; // Ground at Y=0
ground.isPickable = false;
ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION }, scene);

// --- Bowling Lane ---
const laneHeight = 0.1; // Make lane slightly above ground
const lane = BABYLON.MeshBuilder.CreateBox("lane", { width: LANE_WIDTH, height: laneHeight, depth: LANE_DEPTH }, scene);
// Position lane so its top surface is slightly above y=0
lane.position.y = laneHeight / 2;
// Adjust Z so the back is at -15, start near +15
lane.position.z = 15 - LANE_DEPTH / 2;
const laneMat = new BABYLON.StandardMaterial("laneMat", scene);
laneMat.diffuseColor = new BABYLON.Color3(0.95, 0.89, 1); // Pastel lilac
laneMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
lane.material = laneMat;
lane.isPickable = false;
lane.physicsImpostor = new BABYLON.PhysicsImpostor(lane, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION }, scene);

// --- Lane Bumpers ---
const bumperYPos = laneHeight + BUMPER_HEIGHT / 2; // Bumpers sit on top of lane edge
const bumperZPos = lane.position.z;

const bumperMatLeft = new BABYLON.StandardMaterial("leftBumperMat", scene);
bumperMatLeft.diffuseColor = new BABYLON.Color3(1, 0.8, 0.9); // Soft pink
bumperMatLeft.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

const bumperMatRight = new BABYLON.StandardMaterial("rightBumperMat", scene);
bumperMatRight.diffuseColor = new BABYLON.Color3(0.85, 0.95, 1); // Pastel blue
bumperMatRight.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

const bumperOptions = { width: BUMPER_WIDTH, height: BUMPER_HEIGHT, depth: LANE_DEPTH };

const leftBumper = BABYLON.MeshBuilder.CreateBox("leftBumper", bumperOptions, scene);
leftBumper.position.set(-(LANE_WIDTH / 2 + BUMPER_WIDTH / 2), bumperYPos, bumperZPos);
leftBumper.material = bumperMatLeft;
leftBumper.isPickable = false;
leftBumper.physicsImpostor = new BABYLON.PhysicsImpostor(leftBumper, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION }, scene);

const rightBumper = BABYLON.MeshBuilder.CreateBox("rightBumper", bumperOptions, scene);
rightBumper.position.set(LANE_WIDTH / 2 + BUMPER_WIDTH / 2, bumperYPos, bumperZPos);
rightBumper.material = bumperMatRight;
rightBumper.isPickable = false;
rightBumper.physicsImpostor = new BABYLON.PhysicsImpostor(rightBumper, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION }, scene);

// --- Background Scenery ---
// Tree
const treeRoot = new BABYLON.TransformNode("treeRoot", scene);
treeRoot.position = new BABYLON.Vector3(8, 0, -18); // Positioned off lane
treeRoot.isPickable = false;
const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
trunkMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const treeTrunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { diameter: 0.4, height: 3 }, scene);
treeTrunk.position = new BABYLON.Vector3(0, 1.5, 0);
treeTrunk.material = trunkMat;
treeTrunk.parent = treeRoot;
treeTrunk.isPickable = false;
const topMat = new BABYLON.StandardMaterial("topMat", scene);
topMat.diffuseColor = new BABYLON.Color3(0.6, 0.9, 0.6);
topMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const treeTop = BABYLON.MeshBuilder.CreateSphere("treeTop", { diameter: 3 }, scene);
treeTop.position = new BABYLON.Vector3(0, 3.8, 0);
treeTop.material = topMat;
treeTop.parent = treeRoot;
treeTop.isPickable = false;

// House
const houseRoot = new BABYLON.TransformNode("houseRoot", scene);
houseRoot.position = new BABYLON.Vector3(-10, 0, -20); // Positioned off lane
houseRoot.isPickable = false;
const houseMat = new BABYLON.StandardMaterial("houseMat", scene);
houseMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.6);
houseMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const houseBase = BABYLON.MeshBuilder.CreateBox("houseBase", { width: 3, height: 2, depth: 2 }, scene);
houseBase.position = new BABYLON.Vector3(0, 1, 0);
houseBase.material = houseMat;
houseBase.parent = houseRoot;
houseBase.isPickable = false;
const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
roofMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5);
roofMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const roof = BABYLON.MeshBuilder.CreateCylinder("roof", { diameter: 3.2, height: 1.5, tessellation: 3 }, scene);
roof.rotation.z = Math.PI / 2;
roof.rotation.y = Math.PI / 2;
roof.position = new BABYLON.Vector3(0, 2 + (1.5 / 2 * Math.sin(Math.PI / 3)), 0);
roof.material = roofMat;
roof.parent = houseRoot;
roof.isPickable = false;

// Clouds
createCloud(15, 22, -39.8, 1.2);
createCloud(-12, 25, -39.8, 1);
createCloud(5, 28, -39.8, 1.5);
createCloud(25, 18, -35, 0.9);

// --- Panda Mascot ---
const pandaWhiteMat = new BABYLON.StandardMaterial("pandaWhiteMat", scene);
pandaWhiteMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
pandaWhiteMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const pandaBlackMat = new BABYLON.StandardMaterial("pandaBlackMat", scene);
pandaBlackMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
pandaBlackMat.specularColor = new BABYLON.Color3(0, 0, 0);
const cupMat = new BABYLON.StandardMaterial("cupMat", scene);
cupMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 1); // Pastel purple
cupMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
const strawMat = new BABYLON.StandardMaterial("strawMat", scene);
strawMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8); // Soft pink
strawMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

const panda = new BABYLON.TransformNode("pandaGroup", scene);
panda.position = PANDA_POS;
panda.isPickable = false;

const pandaBody = BABYLON.MeshBuilder.CreateSphere("pandaBody", { diameter: 1 }, scene);
pandaBody.position = new BABYLON.Vector3(0, 0.5, 0);
pandaBody.material = pandaWhiteMat;
pandaBody.parent = panda;
pandaBody.isPickable = false;

const pandaHead = BABYLON.MeshBuilder.CreateSphere("pandaHead", { diameter: 0.6 }, scene);
pandaHead.position = new BABYLON.Vector3(0, 1.1, 0);
pandaHead.material = pandaWhiteMat;
pandaHead.parent = panda; // Parent head to group directly
pandaHead.isPickable = false;

const pandaEarL = BABYLON.MeshBuilder.CreateSphere("pandaEarL", { diameter: 0.25 }, scene);
pandaEarL.position = new BABYLON.Vector3(-0.25, 1.4, 0);
pandaEarL.material = pandaBlackMat;
pandaEarL.parent = pandaHead; // Parent ears to head
pandaEarL.isPickable = false;

const pandaEarR = BABYLON.MeshBuilder.CreateSphere("pandaEarR", { diameter: 0.25 }, scene);
pandaEarR.position = new BABYLON.Vector3(0.25, 1.4, 0);
pandaEarR.material = pandaBlackMat;
pandaEarR.parent = pandaHead; // Parent ears to head
pandaEarR.isPickable = false;

const cup = BABYLON.MeshBuilder.CreateCylinder("bobaCup", { diameter: 0.2, height: 0.35 }, scene);
cup.material = cupMat;
cup.position = new BABYLON.Vector3(0.35, 0.6, 0.3); // Relative to panda group origin
cup.parent = panda;
cup.isPickable = false;

const straw = BABYLON.MeshBuilder.CreateCylinder("bobaStraw", { diameter: 0.05, height: 0.4 }, scene);
straw.material = strawMat;
straw.position = new BABYLON.Vector3(0, 0.18, 0); // Relative to cup center
straw.parent = cup;
straw.isPickable = false;

// Panda Idle Animation
let pandaTime = 0;
scene.onBeforeRenderObservable.add(() => {
    const deltaTime = scene.getEngine().getDeltaTime() / 1000;
    pandaTime += deltaTime * 1.5; // Slightly faster animation
    panda.position.y = PANDA_POS.y + Math.sin(pandaTime) * 0.06;
    panda.rotation.y = PANDA_POS.y + Math.sin(pandaTime * 0.6) * 0.15;
});

// --- Animated Elements & Particles ---
function createButterfly(x, y, z, scale = 1, speed = 0.8, flutterSpeed = 1.5) {
    const butterfly = BABYLON.MeshBuilder.CreatePlane("butterfly_" + x + "_" + z, { size: 0.4 * scale }, scene); // Unique name
    butterfly.position = new BABYLON.Vector3(x, y, z);
    butterfly.rotation.y = Math.PI;
    let butterflyMat = scene.getMaterialByName("butterflyMat");
    if (!butterflyMat) {
        butterflyMat = new BABYLON.StandardMaterial("butterflyMat", scene);
        butterflyMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8);
        butterflyMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        butterflyMat.backFaceCulling = false;
    }
    butterfly.material = butterflyMat;
    butterfly.isPickable = false;
    let butterflyAnimTime = Math.random() * 10;
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        butterflyAnimTime += deltaTime;
        butterfly.position.x += Math.sin(butterflyAnimTime * speed) * 0.01 * speed;
        butterfly.position.y += Math.cos(butterflyAnimTime * speed * 1.2) * 0.005 * speed;
        butterfly.rotation.z = Math.sin(butterflyAnimTime * flutterSpeed * 5) * 0.2;
    });
    createTrailEmitter(butterfly, scene, new BABYLON.Color4(1, 0.6, 0.8, 0.5));
}

function createBee(x, y, z, color = new BABYLON.Color3(1, 0.9, 0.3), speed = 1.0, buzzSpeed = 2.0) {
    const bee = BABYLON.MeshBuilder.CreateSphere("bee_" + x + "_" + z, { diameter: 0.3 }, scene); // Unique name
    bee.position = new BABYLON.Vector3(x, y, z);
    const beeMat = new BABYLON.StandardMaterial("beeMat_" + color.toHexString(), scene);
    beeMat.diffuseColor = color;
    beeMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    bee.material = beeMat;
    bee.isPickable = false;
    let beeAnimTime = Math.random() * 10;
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        beeAnimTime += deltaTime;
        bee.position.x += Math.sin(beeAnimTime * speed * 1.5) * 0.005 * speed;
        bee.position.y += Math.sin(beeAnimTime * buzzSpeed) * 0.01 * speed;
        bee.rotation.y += deltaTime * speed * 2;
    });
    createTrailEmitter(bee, scene, new BABYLON.Color4(color.r, color.g, color.b, 0.6));
}

createButterfly(-5, 4, -20, 1, 0.8, 1.5);
createButterfly(6, 6, -15, 1.2, 1.1, 1.8);
createBee(3, 3, -10, new BABYLON.Color3(1, 0.9, 0.3), 1.0, 2.0);
createBee(-4, 5, -12, new BABYLON.Color3(1, 0.8, 0.5), 1.5, 2.5);

// --- Jelly Ball ---
ball = BABYLON.MeshBuilder.CreateSphere("jellyBall", { diameter: BALL_DIAMETER }, scene);
ball.position = BALL_START_POS.clone(); // Use constant for start position
const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
ballMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 1);
ballMat.alpha = 0.9;
ballMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
ball.material = ballMat;
ball.physicsImpostor = new BABYLON.PhysicsImpostor(ball, BABYLON.PhysicsImpostor.SphereImpostor, { mass: BALL_MASS, friction: BALL_FRICTION, restitution: BALL_RESTITUTION }, scene);
// ball.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0)); // Let it spin naturally for now

// Set camera target AFTER ball is created
camera.lockedTarget = ball;

// --- Drag Arrows ---
function createDragArrows() {
    const arrowShape = [ new BABYLON.Vector3(-0.2, 0, 0), new BABYLON.Vector3(0.2, 0, 0), new BABYLON.Vector3(0, 0.4, 0) ]; // Slightly smaller arrows
    dragArrowLeft = BABYLON.MeshBuilder.CreatePolygon("arrowLeft", { shape: arrowShape }, scene);
    dragArrowRight = BABYLON.MeshBuilder.CreatePolygon("arrowRight", { shape: arrowShape }, scene);
    const arrowMat = new BABYLON.StandardMaterial("arrowMat", scene);
    arrowMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.8);
    arrowMat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.4);
    arrowMat.disableLighting = true;
    arrowMat.backFaceCulling = false;
    dragArrowLeft.material = arrowMat;
    dragArrowRight.material = arrowMat;
    dragArrowLeft.parent = ball;
    dragArrowRight.parent = ball;
    dragArrowLeft.position = new BABYLON.Vector3(-0.4, 0, 0.4); // Relative position
    dragArrowRight.position = new BABYLON.Vector3(0.4, 0, 0.4);
    dragArrowLeft.rotation.y = -Math.PI / 2;
    dragArrowRight.rotation.y = Math.PI / 2;
    dragArrowLeft.isVisible = false;
    dragArrowRight.isVisible = false;
    dragArrowLeft.isPickable = false;
    dragArrowRight.isPickable = false;
}
createDragArrows();

// === Interaction Logic ===
const pointerDragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: new BABYLON.Vector3(1, 0, 0) });
pointerDragBehavior.useObjectOrientationForDragging = false;

pointerDragBehavior.onDragStartObservable.add((event) => {
    if (hasLaunched || !ball || event.pickedMesh !== ball) {
        pointerDragBehavior.releaseDrag(); // Prevent dragging other things or after launch
        return;
    }
    isDragging = true;
    boopSound.play().catch(e => console.warn("Audio play failed (boop):", e));
    dragArrowLeft.isVisible = true;
    dragArrowRight.isVisible = true;
    // Keep physics active, but override position/velocity
});

pointerDragBehavior.onDragObservable.add((event) => {
    if (!isDragging || hasLaunched || !ball) return;
    // Ball mesh position is updated by the behavior automatically along dragAxis
    // We just need to clamp it and sync physics
    const allowedXMin = -(LANE_WIDTH / 2 - BALL_DIAMETER / 2 - 0.05); // Tighter buffer
    const allowedXMax = (LANE_WIDTH / 2 - BALL_DIAMETER / 2 - 0.05);
    ball.position.x = BABYLON.Scalar.Clamp(ball.position.x, allowedXMin, allowedXMax);
    // Keep ball physically still during drag
    ball.position.y = BALL_START_POS.y;
    ball.position.z = BALL_START_POS.z;
    if (ball.physicsImpostor) {
       ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
       ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
       // Sync mesh position TO physics impostor state
       ball.physicsImpostor.syncImpostorWithPosition();
    }
});

pointerDragBehavior.onDragEndObservable.add((event) => {
    if (!isDragging || hasLaunched || !ball) return;
    isDragging = false;
    hasLaunched = true; // Mark as launched
    dragArrowLeft.isVisible = false;
    dragArrowRight.isVisible = false;
    dragArrowLeft.parent = null; // Unparent
    dragArrowRight.parent = null;

    swishSound.play().catch(e => console.warn("Audio play failed (swish):", e));

    if (ball.physicsImpostor) {
        ball.physicsImpostor.applyImpulse(
            new BABYLON.Vector3(0, 0, -LAUNCH_IMPULSE_FORCE), // Apply impulse down the lane
            ball.getAbsolutePosition() // Apply at center
        );
    }

    // Detach drag behavior after launch
    ball.removeBehavior(pointerDragBehavior);

    // TEMP: Game progress tracker
    incrementGamesPlayed();
});

// Attach the drag behavior
if (ball) {
    ball.addBehavior(pointerDragBehavior);
} else {
    console.error("Failed to attach PointerDragBehavior: Ball mesh not created.");
}


// === TEMPORARY: Track game progress for unlocks ===
function incrementGamesPlayed() {
    try {
        const updatedGames = (parseInt(localStorage.getItem("gamesPlayed")) || 0) + 1;
        localStorage.setItem("gamesPlayed", updatedGames);
        console.log("Games Played:", updatedGames);
    } catch (e) {
        console.error("Could not access localStorage:", e);
    }
}

// === Render Loop ===
engine.runRenderLoop(() => {
    scene.render();
});

// === Handle Browser Resize ===
window.addEventListener("resize", () => {
    engine.resize();
});

// === TODO: Add Pins ===
// Placeholder


console.log("Scene setup complete. Physics enabled.");