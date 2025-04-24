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
const PANDA_POS = new BABYLON.Vector3(0, 0, -15); // Panda's base position
const BALL_START_POS = new BABYLON.Vector3(0, 0.5, 13); // Initial ball position
const LANE_WIDTH = 3;
const LANE_DEPTH = 30;
const BUMPER_WIDTH = 0.3;
const BUMPER_HEIGHT = 0.4;
const BALL_DIAMETER = 0.5;
const BALL_MASS = 1.5; // Mass for physics simulation
const BALL_RESTITUTION = 0.5; // Bounciness (0 = no bounce, 1 = fully elastic)
const BALL_FRICTION = 0.2;
const STATIC_OBJECT_FRICTION = 0.1;
const STATIC_OBJECT_RESTITUTION = 0.2;
const LAUNCH_IMPULSE_ сила = 8; // Force applied to the ball on launch

// === Physics Engine Setup ===
const cannonPlugin = new BABYLON.CannonJSPlugin(true, 10, cannon); // Use global 'cannon' loaded from script
scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), cannonPlugin); // Enable physics with gravity

// === Game State Variables ===
let isDragging = false;
let hasLaunched = false;
let dragStartX = 0;
let ball = null; // Will be assigned after creation
let dragArrowLeft = null; // Will be assigned after creation
let dragArrowRight = null; // Will be assigned after creation

// === Asset Loading (Sounds) ===
// Preload sounds for better responsiveness - consider a loading screen later
const boopSound = new Audio("drag-cue.mp3");
const swishSound = new Audio("swish-sound.mp3");
// Optional: Preload sounds if experiencing delays on first play
// boopSound.load();
// swishSound.load();

// === Helper Functions ===

function createCloud(x, y, z, scale = 1) {
    // Use Instanced Meshes if creating many clouds later for performance
    const cloud = BABYLON.MeshBuilder.CreatePlane("cloud", { size: 6 * scale }, scene);
    cloud.position = new BABYLON.Vector3(x, y, z);
    cloud.rotation.y = Math.PI; // Make texture face forward if needed

    // Share material among clouds for performance
    let cloudMat = scene.getMaterialByName("cloudMat");
    if (!cloudMat) {
        cloudMat = new BABYLON.StandardMaterial("cloudMat", scene);
        // Load texture only once
        const cloudTexture = new BABYLON.Texture("https://i.imgur.com/qXbIq1T.png", scene);
        cloudMat.diffuseTexture = cloudTexture;
        cloudMat.opacityTexture = cloudTexture; // Use same texture for opacity
        cloudMat.backFaceCulling = false;
        cloudMat.useAlphaFromDiffuseTexture = true; // Ensure alpha is used
        cloudMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce shininess
    }
    cloud.material = cloudMat;
    cloud.isPickable = false; // Clouds shouldn't block clicks/drags
    return cloud;
}

function createTrailEmitter(sourceMesh, scene, color = new BABYLON.Color4(1, 1, 1, 0.6)) {
    // Check if particle system already exists for this mesh to avoid duplicates
    if (scene.getParticleSystemByName(sourceMesh.name + "_sparkleTrail")) {
        return;
    }
    const particleSystem = new BABYLON.ParticleSystem(sourceMesh.name + "_sparkleTrail", 200, scene);
    // Use a more performant texture or create one dynamically if possible
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = sourceMesh; // Emitter is the mesh position
    particleSystem.minEmitBox = new BABYLON.Vector3(0, 0, 0); // Emit from center of mesh
    particleSystem.maxEmitBox = new BABYLON.Vector3(0, 0, 0);
    particleSystem.color1 = color;
    particleSystem.color2 = color; // Can vary colors for effect
    particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 0); // Fade out
    particleSystem.minSize = 0.05;
    particleSystem.maxSize = 0.1;
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 0.5;
    particleSystem.emitRate = 30; // Particles per second
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD; // Or ADDITIVE for brighter look
    particleSystem.gravity = new BABYLON.Vector3(0, 0, 0); // No gravity for sparkles
    // Give particles a slight initial velocity outward if desired
    particleSystem.minEmitPower = 0.1;
    particleSystem.maxEmitPower = 0.3;
    particleSystem.updateSpeed = 0.015; // Simulation speed
    particleSystem.start();
    return particleSystem;
}

// === Scene Creation ===

// --- Camera ---
const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 5, -10), scene);
camera.radius = 12; // Distance from target
camera.heightOffset = 5; // Height above target
camera.rotationOffset = 0; // Angle around target (0 = behind)
camera.cameraAcceleration = 0.03; // Smoothing factor
camera.maxCameraSpeed = 15;
camera.lowerRadiusLimit = 5;
camera.upperRadiusLimit = 20;
camera.lowerHeightOffsetLimit = 2;
camera.upperHeightOffsetLimit = 10;
// camera.lockedTarget will be set to the ball later

// --- Lighting ---
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.5, 1, 0.2), scene);
light.intensity = 0.9;
light.diffuse = new BABYLON.Color3(1, 1, 1);
light.specular = new BABYLON.Color3(0.8, 0.8, 0.8);
light.groundColor = new BABYLON.Color3(0.4, 0.4, 0.6); // Ambient color from below

// --- Sky Backdrop ---
const sky = BABYLON.MeshBuilder.CreatePlane("sky", { width: 150, height: 90 }, scene); // Make larger
sky.position = new BABYLON.Vector3(0, 25, -40); // Position further back
sky.rotation.x = Math.PI / 12; // Slight tilt
sky.material = new BABYLON.StandardMaterial("skyMat", scene);
sky.material.backFaceCulling = false;
sky.material.disableLighting = true; // Sky shouldn't be affected by scene lighting
sky.material.emissiveColor = BABYLON.Color3.White(); // Make it glow slightly
sky.isPickable = false;

// Dynamic Texture for Gradient Sky
const skyTexture = new BABYLON.DynamicTexture("skyTexture", { width: 2, height: 128 }, scene, false);
sky.material.diffuseTexture = skyTexture;
sky.material.diffuseTexture.hasAlpha = false;

const skyCtx = skyTexture.getContext();
const gradient = skyCtx.createLinearGradient(0, 0, 0, 128);
gradient.addColorStop(0, "#aee2ff"); // Top color
gradient.addColorStop(1, "#d8ffe7"); // Bottom color (near horizon)
skyCtx.fillStyle = gradient;
skyCtx.fillRect(0, 0, 2, 128);
skyTexture.update();

// --- Sun ---
const sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 5 }, scene);
sun.position = new BABYLON.Vector3(-25, 25, -39.9); // Position relative to sky
sun.material = new BABYLON.StandardMaterial("sunMat", scene);
sun.material.emissiveColor = new BABYLON.Color3(1, 0.9, 0.4);
sun.material.diffuseColor = new BABYLON.Color3(0, 0, 0); // Sun is emitting light, not reflecting
sun.material.specularColor = new BABYLON.Color3(0, 0, 0);
sun.material.disableLighting = true;
sun.isPickable = false;

// --- Clouds ---
createCloud(15, 22, -39.8, 1.2);
createCloud(-12, 25, -39.8, 1);
createCloud(5, 28, -39.8, 1.5);
createCloud(25, 18, -35, 0.9); // Add some nearer clouds

// --- Ground ---
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 150, height: 90 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3.FromHexString("#b8f5d7"); // Greener ground
groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Less shiny
ground.material = groundMat;
ground.position.y = -0.1; // Slightly below origin
ground.isPickable = false;
// Add physics impostor for ground
ground.physicsImpostor = new BABYLON.PhysicsImpostor(
    ground,
    BABYLON.PhysicsImpostor.BoxImpostor, // Ground is effectively a flat box
    { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION },
    scene
);

// --- Bowling Lane ---
const lane = BABYLON.MeshBuilder.CreateBox("lane", {
    width: LANE_WIDTH,
    height: 0.2,
    depth: LANE_DEPTH
}, scene);
lane.position.y = 0.1; // Center lane height at y=0.1
lane.position.z = -(LANE_DEPTH / 2) + 15; // Position start near z=15, extends back
const laneMat = new BABYLON.StandardMaterial("laneMat", scene);
laneMat.diffuseColor = new BABYLON.Color3(0.95, 0.89, 1); // Pastel lilac
laneMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
lane.material = laneMat;
lane.isPickable = false;
// Add physics impostor for lane
lane.physicsImpostor = new BABYLON.PhysicsImpostor(
    lane,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION },
    scene
);

// --- Lane Bumpers ---
const bumperMatLeft = new BABYLON.StandardMaterial("leftBumperMat", scene);
bumperMatLeft.diffuseColor = new BABYLON.Color3(1, 0.8, 0.9); // Soft pink
bumperMatLeft.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

const bumperMatRight = new BABYLON.StandardMaterial("rightBumperMat", scene);
bumperMatRight.diffuseColor = new BABYLON.Color3(0.85, 0.95, 1); // Pastel blue
bumperMatRight.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

const bumperOptions = {
    width: BUMPER_WIDTH,
    height: BUMPER_HEIGHT,
    depth: LANE_DEPTH
};

const leftBumper = BABYLON.MeshBuilder.CreateBox("leftBumper", bumperOptions, scene);
leftBumper.position.set(-(LANE_WIDTH / 2 + BUMPER_WIDTH / 2), BUMPER_HEIGHT / 2, lane.position.z);
leftBumper.material = bumperMatLeft;
leftBumper.isPickable = false;
leftBumper.physicsImpostor = new BABYLON.PhysicsImpostor(
    leftBumper,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION },
    scene
);

const rightBumper = BABYLON.MeshBuilder.CreateBox("rightBumper", bumperOptions, scene); // Don't clone if adding impostor separately
rightBumper.position.set(LANE_WIDTH / 2 + BUMPER_WIDTH / 2, BUMPER_HEIGHT / 2, lane.position.z);
rightBumper.material = bumperMatRight;
rightBumper.isPickable = false;
rightBumper.physicsImpostor = new BABYLON.PhysicsImpostor(
    rightBumper,
    BABYLON.PhysicsImpostor.BoxImpostor,
    { mass: 0, friction: STATIC_OBJECT_FRICTION, restitution: STATIC_OBJECT_RESTITUTION },
    scene
);


// --- Tree (Example Background Element) ---
const treeRoot = new BABYLON.TransformNode("treeRoot", scene);
treeRoot.position = new BABYLON.Vector3(8, 0, -25); // Base position on ground

const treeTrunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { diameter: 0.4, height: 3 }, scene);
treeTrunk.position = new BABYLON.Vector3(0, 1.5, 0); // Relative to root
const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
trunkMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
treeTrunk.material = trunkMat;
treeTrunk.parent = treeRoot;
treeTrunk.isPickable = false;

const treeTop = BABYLON.MeshBuilder.CreateSphere("treeTop", { diameter: 3 }, scene);
treeTop.position = new BABYLON.Vector3(0, 3.8, 0); // Relative to root
const topMat = new BABYLON.StandardMaterial("topMat", scene);
topMat.diffuseColor = new BABYLON.Color3(0.6, 0.9, 0.6);
topMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
treeTop.material = topMat;
treeTop.parent = treeRoot;
treeTop.isPickable = false;

// --- House (Example Background Element) ---
const houseRoot = new BABYLON.TransformNode("houseRoot", scene);
houseRoot.position = new BABYLON.Vector3(-10, 0, -25); // Base position on ground

const houseBase = BABYLON.MeshBuilder.CreateBox("houseBase", { width: 3, height: 2, depth: 2 }, scene);
houseBase.position = new BABYLON.Vector3(0, 1, 0); // Relative to root
const houseMat = new BABYLON.StandardMaterial("houseMat", scene);
houseMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.6);
houseMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
houseBase.material = houseMat;
houseBase.parent = houseRoot;
houseBase.isPickable = false;

const roof = BABYLON.MeshBuilder.CreateCylinder("roof", { diameter: 3.2, height: 1.5, tessellation: 3 }, scene);
roof.rotation.z = Math.PI / 2; // Rotate correctly for triangular roof
roof.rotation.y = Math.PI / 2;
roof.position = new BABYLON.Vector3(0, 2 + (1.5/2 * Math.sin(Math.PI/3)), 0); // Position top relative to base
const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
roofMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5);
roofMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
roof.material = roofMat;
roof.parent = houseRoot;
roof.isPickable = false;


// --- Panda Mascot ---
// Materials (create once, reuse)
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


// Panda Group Node
const panda = new BABYLON.TransformNode("pandaGroup", scene);
panda.position = PANDA_POS; // Use constant
panda.isPickable = false;

// Body
const pandaBody = BABYLON.MeshBuilder.CreateSphere("pandaBody", { diameter: 1 }, scene);
pandaBody.position = new BABYLON.Vector3(0, 0.5, 0); // Relative to panda group
pandaBody.material = pandaWhiteMat;
pandaBody.parent = panda;

// Head
const pandaHead = BABYLON.MeshBuilder.CreateSphere("pandaHead", { diameter: 0.6 }, scene);
pandaHead.position = new BABYLON.Vector3(0, 1.1, 0); // Raised head position
pandaHead.material = pandaWhiteMat;
pandaHead.parent = panda;

// Ears
const pandaEarL = BABYLON.MeshBuilder.CreateSphere("pandaEarL", { diameter: 0.25 }, scene);
pandaEarL.position = new BABYLON.Vector3(-0.25, 1.4, 0); // Relative position
pandaEarL.material = pandaBlackMat;
pandaEarL.parent = panda;

const pandaEarR = BABYLON.MeshBuilder.CreateSphere("pandaEarR", { diameter: 0.25 }, scene);
pandaEarR.position = new BABYLON.Vector3(0.25, 1.4, 0); // Symmetrical
pandaEarR.material = pandaBlackMat;
pandaEarR.parent = panda;

// Boba Cup
const cup = BABYLON.MeshBuilder.CreateCylinder("bobaCup", { diameter: 0.2, height: 0.35 }, scene);
cup.material = cupMat;
cup.position = new BABYLON.Vector3(0.3, 0.6, 0.25); // Held slightly out
cup.parent = panda; // Attach to panda group

// Straw
const straw = BABYLON.MeshBuilder.CreateCylinder("bobaStraw", { diameter: 0.05, height: 0.4 }, scene);
straw.material = strawMat;
straw.position = new BABYLON.Vector3(0, 0.18, 0); // Relative to cup center
straw.parent = cup; // Attach straw to cup

// --- Panda Idle Animation ---
let pandaTime = 0;
scene.onBeforeRenderObservable.add(() => {
    // Use scene.deltaTime for smoother animation independent of frame rate
    const deltaTime = scene.getEngine().getDeltaTime() / 1000; // Delta time in seconds
    pandaTime += deltaTime * 2; // Adjust speed factor as needed

    // Apply animation to the parent node
    panda.position.y = PANDA_POS.y + Math.sin(pandaTime) * 0.05;
    panda.rotation.y = Math.sin(pandaTime * 0.5) * 0.1;
});

// --- Butterflies (Example Animated Elements) ---
function createButterfly(x, y, z, scale = 1, speed = 0.8, flutterSpeed = 1.5) {
    const butterfly = BABYLON.MeshBuilder.CreatePlane("butterfly", { size: 0.4 * scale }, scene);
    butterfly.position = new BABYLON.Vector3(x, y, z);
    butterfly.rotation.y = Math.PI; // Face forward initially

    // Share material
    let butterflyMat = scene.getMaterialByName("butterflyMat");
    if(!butterflyMat) {
        butterflyMat = new BABYLON.StandardMaterial("butterflyMat", scene);
        butterflyMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8); // Pink
        butterflyMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        butterflyMat.backFaceCulling = false;
    }
    butterfly.material = butterflyMat;
    butterfly.isPickable = false;

    let butterflyAnimTime = Math.random() * 10; // Random start offset
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        butterflyAnimTime += deltaTime;
        // More organic movement
        butterfly.position.x += Math.sin(butterflyAnimTime * speed) * 0.01 * speed;
        butterfly.position.y += Math.cos(butterflyAnimTime * speed * 1.2) * 0.005 * speed;
        butterfly.rotation.z = Math.sin(butterflyAnimTime * flutterSpeed * 5) * 0.2; // Wing flutter
    });

    createTrailEmitter(butterfly, scene, new BABYLON.Color4(1, 0.6, 0.8, 0.5));
}

createButterfly(-5, 4, -20, 1, 0.8, 1.5);
createButterfly(6, 6, -25, 1.2, 1.1, 1.8);

// --- Bees (Example Animated Elements) ---
function createBee(x, y, z, color = new BABYLON.Color3(1, 0.9, 0.3), speed = 1.0, buzzSpeed = 2.0) {
    const bee = BABYLON.MeshBuilder.CreateSphere("bee", { diameter: 0.3 }, scene);
    bee.position = new BABYLON.Vector3(x, y, z);

    // Share material per color if needed, or create unique
    const beeMat = new BABYLON.StandardMaterial("beeMat_" + color.toHexString(), scene);
    beeMat.diffuseColor = color;
    beeMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    bee.material = beeMat;
    bee.isPickable = false;

    let beeAnimTime = Math.random() * 10;
    scene.onBeforeRenderObservable.add(() => {
        const deltaTime = scene.getEngine().getDeltaTime() / 1000;
        beeAnimTime += deltaTime;
        // Buzzing movement
        bee.position.x += Math.sin(beeAnimTime * speed * 1.5) * 0.005 * speed;
        bee.position.y += Math.sin(beeAnimTime * buzzSpeed) * 0.01 * speed;
        bee.rotation.y += deltaTime * speed * 2; // Spin a bit
    });
     createTrailEmitter(bee, scene, new BABYLON.Color4(color.r, color.g, color.b, 0.6));
}

createBee(3, 3, -22, new BABYLON.Color3(1, 0.9, 0.3), 1.0, 2.0);
createBee(-4, 5, -24, new BABYLON.Color3(1, 0.8, 0.5), 1.5, 2.5);


// --- Jelly Ball ---
ball = BABYLON.MeshBuilder.CreateSphere("jellyBall", { diameter: BALL_DIAMETER }, scene);
ball.position = BALL_START_POS.clone(); // Start at defined position
const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
ballMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 1); // Soft jelly purple
ballMat.alpha = 0.9; // Translucent
ballMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Bit of shine
ball.material = ballMat;

// Add physics impostor for the ball
ball.physicsImpostor = new BABYLON.PhysicsImpostor(
    ball,
    BABYLON.PhysicsImpostor.SphereImpostor,
    { mass: BALL_MASS, friction: BALL_FRICTION, restitution: BALL_RESTITUTION },
    scene
);
// Prevent ball from rotating wildly due to physics minor imperfections
ball.physicsImpostor.setAngularVelocity(new BABYLON.Vector3(0, 0, 0));
// Optional: Increase linear damping if the ball rolls too long
// ball.physicsImpostor.setLinearDamping(0.1);
// Optional: Increase angular damping if it spins too much on collisions
// ball.physicsImpostor.setAngularDamping(0.5);


// Make the camera follow the ball mesh
camera.lockedTarget = ball;

// --- Drag Arrows ---
function createDragArrows() {
    // Create arrow shapes (simple triangles for now)
    const arrowShape = [
        new BABYLON.Vector3(-0.25, 0, 0),
        new BABYLON.Vector3(0.25, 0, 0),
        new BABYLON.Vector3(0, 0.5, 0)
    ];

    dragArrowLeft = BABYLON.MeshBuilder.CreatePolygon("arrowLeft", { shape: arrowShape }, scene);
    dragArrowRight = BABYLON.MeshBuilder.CreatePolygon("arrowRight", { shape: arrowShape }, scene);

    const arrowMat = new BABYLON.StandardMaterial("arrowMat", scene);
    arrowMat.diffuseColor = new BABYLON.Color3(1, 0.3, 0.8); // Vibrant jelly pink
    arrowMat.emissiveColor = new BABYLON.Color3(0.5, 0.1, 0.4); // Slight glow
    arrowMat.disableLighting = true; // Not affected by light
    arrowMat.backFaceCulling = false;
    dragArrowLeft.material = arrowMat;
    dragArrowRight.material = arrowMat;

    // Parent arrows to the ball so they move with it initially
    dragArrowLeft.parent = ball;
    dragArrowRight.parent = ball;

    // Position arrows relative to the ball
    dragArrowLeft.position = new BABYLON.Vector3(-0.5, 0, 0.5); // Left and slightly forward
    dragArrowRight.position = new BABYLON.Vector3(0.5, 0, 0.5); // Right and slightly forward
    dragArrowLeft.rotation.y = -Math.PI / 2;
    dragArrowRight.rotation.y = Math.PI / 2;

    // Arrows start invisible
    dragArrowLeft.isVisible = false;
    dragArrowRight.isVisible = false;
    dragArrowLeft.isPickable = false; // Don't allow picking the arrows
    dragArrowRight.isPickable = false;
}
createDragArrows(); // Create arrows after the ball exists


// === Interaction Logic ===

const pointerDragBehavior = new BABYLON.PointerDragBehavior({ dragAxis: new BABYLON.Vector3(1, 0, 0) });
pointerDragBehavior.useObjectOrientationForDragging = false; // Drag along world axis

pointerDragBehavior.onDragStartObservable.add((event) => {
    if (hasLaunched || !ball || event.pickedMesh !== ball) return; // Only drag the ball before launch
    isDragging = true;
    boopSound.play().catch(e => console.log("Audio play failed:", e)); // Play sound
    dragArrowLeft.isVisible = true; // Show arrows on drag start
    dragArrowRight.isVisible = true;
    // Temporarily disable physics updates while dragging for direct control
    // ball.physicsImpostor.sleep(); // Or set mass to 0 temporarily
});

pointerDragBehavior.onDragObservable.add((event) => {
    if (!isDragging || hasLaunched || !ball) return;
    // Clamp the ball's position within the lane boundaries (approx)
    const allowedXMin = -(LANE_WIDTH / 2 - BALL_DIAMETER / 2 - 0.1); // A little buffer
    const allowedXMax = (LANE_WIDTH / 2 - BALL_DIAMETER / 2 - 0.1);
    ball.position.x = BABYLON.Scalar.Clamp(ball.position.x, allowedXMin, allowedXMax);
    // Keep the ball from moving in Y/Z during drag
    ball.position.y = BALL_START_POS.y;
    ball.position.z = BALL_START_POS.z;
    // Ensure physics body position matches mesh during drag
    ball.physicsImpostor.setLinearVelocity(BABYLON.Vector3.Zero());
    ball.physicsImpostor.setAngularVelocity(BABYLON.Vector3.Zero());
    ball.physicsImpostor.syncImpostorWithPosition();

});

pointerDragBehavior.onDragEndObservable.add((event) => {
    if (!isDragging || hasLaunched || !ball) return;
    isDragging = false;
    hasLaunched = true;
    dragArrowLeft.isVisible = false; // Hide arrows on launch
    dragArrowRight.isVisible = false;
    // Unparent arrows so they don't follow the launched ball
    dragArrowLeft.parent = null;
    dragArrowRight.parent = null;

    swishSound.play().catch(e => console.log("Audio play failed:", e)); // Play sound

    // Re-enable physics and apply force
    // ball.physicsImpostor.wakeUp(); // If sleep was used
    ball.physicsImpostor.applyImpulse(
        new BABYLON.Vector3(0, 0, -LAUNCH_IMPULSE_FORCE), // Apply force straight down the lane
        ball.getAbsolutePosition() // Apply impulse at the ball's center
    );

    // Detach drag behavior after launch
    ball.removeBehavior(pointerDragBehavior);

    // TEMP: Game progress tracker - move later
    incrementGamesPlayed();
});

// Attach the drag behavior to the ball mesh
if (ball) { // Ensure ball exists before adding behavior
    ball.addBehavior(pointerDragBehavior);
}


// === TEMPORARY: Track game progress for unlocks ===
// ⚠️ Move this later into real "game finished" logic (e.g., after pins settle)
function incrementGamesPlayed() {
    try {
        const updatedGames = (parseInt(localStorage.getItem("gamesPlayed")) || 0) + 1;
        localStorage.setItem("gamesPlayed", updatedGames);
        console.log("Games Played:", updatedGames); // For debugging
    } catch (e) {
        console.error("Could not access localStorage:", e); // Handle private browsing etc.
    }
}
// Note: We moved the call to incrementGamesPlayed() into the pointer up/launch logic


// === Render Loop ===
engine.runRenderLoop(() => {
    scene.render();
});

// === Handle Browser Resize ===
window.addEventListener("resize", () => {
    engine.resize();
});

// === TODO: Add Pins ===
// Placeholder for where pin creation logic will go


console.log("Scene setup complete. Physics enabled.");
