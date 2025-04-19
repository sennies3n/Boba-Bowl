// Get the canvas element
const canvas = document.getElementById("renderCanvas");

// Create the Babylon engine
const engine = new BABYLON.Engine(canvas, true);

// Create the scene
const scene = new BABYLON.Scene(engine);

// Create a simple camera that orbits around the scene
const camera = new BABYLON.ArcRotateCamera("Camera", 
  Math.PI / 2, Math.PI / 3, 20, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);

// Add a soft light
const light = new BABYLON.HemisphericLight("light", 
  new BABYLON.Vector3(1, 1, 0), scene);
light.intensity = 0.9;

// === SKY BACKDROP ===
const sky = BABYLON.MeshBuilder.CreatePlane("sky", { width: 100, height: 60 }, scene);
sky.position = new BABYLON.Vector3(0, 20, -30); // Pushed behind lane
sky.material = new BABYLON.StandardMaterial("skyMat", scene);
sky.material.backFaceCulling = false;
sky.material.diffuseTexture = new BABYLON.DynamicTexture("skyTexture", { width: 1, height: 2 }, scene, false);
sky.material.diffuseTexture.hasAlpha = false;
sky.material.emissiveColor = BABYLON.Color3.White();

// Create vertical gradient
const skyCtx = sky.material.diffuseTexture.getContext();
const gradient = skyCtx.createLinearGradient(0, 0, 0, 2);
gradient.addColorStop(0, "#aee2ff"); // top: pastel sky blue
gradient.addColorStop(1, "#d8ffe7"); // bottom: minty grass tone
skyCtx.fillStyle = gradient;
skyCtx.fillRect(0, 0, 1, 2);
sky.material.diffuseTexture.update();

// === SUN ===
const sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 4 }, scene);
sun.position = new BABYLON.Vector3(-15, 18, -29.9);
sun.material = new BABYLON.StandardMaterial("sunMat", scene);
sun.material.emissiveColor = new BABYLON.Color3(1, 0.9, 0.4); // warm golden
sun.material.diffuseColor = new BABYLON.Color3(1, 0.9, 0.4);

// === CLOUDS ===
function createCloud(x, y, z, scale = 1) {
  const cloud = BABYLON.MeshBuilder.CreatePlane("cloud", { size: 6 * scale }, scene);
  cloud.position = new BABYLON.Vector3(x, y, z);
  cloud.rotation.y = Math.PI;
  cloud.material = new BABYLON.StandardMaterial("cloudMat", scene);
  cloud.material.diffuseTexture = new BABYLON.Texture("https://i.imgur.com/qXbIq1T.png", scene); // soft white cloud
  cloud.material.opacityTexture = cloud.material.diffuseTexture;
  cloud.material.backFaceCulling = false;
  return cloud;
}

// === GROUND ===
const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 100, height: 60 }, scene);
const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
groundMat.diffuseColor = new BABYLON.Color3.FromHexString("#d8ffe7"); // soft minty grass
ground.material = groundMat;

// === TREE ===
const treeTrunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { diameter: 0.4, height: 3 }, scene);
treeTrunk.position = new BABYLON.Vector3(8, 1.5, -25);
const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1); // brown
treeTrunk.material = trunkMat;

const treeTop = BABYLON.MeshBuilder.CreateSphere("treeTop", { diameter: 3 }, scene);
treeTop.position = new BABYLON.Vector3(8, 3.8, -25);
const topMat = new BABYLON.StandardMaterial("topMat", scene);
topMat.diffuseColor = new BABYLON.Color3(0.6, 0.9, 0.6); // soft green
treeTop.material = topMat;

// === HOUSE ===
const houseBase = BABYLON.MeshBuilder.CreateBox("houseBase", { width: 3, height: 2, depth: 2 }, scene);
houseBase.position = new BABYLON.Vector3(-10, 1, -25);
const houseMat = new BABYLON.StandardMaterial("houseMat", scene);
houseMat.diffuseColor = new BABYLON.Color3(1, 0.85, 0.6); // light orange
houseBase.material = houseMat;

const roof = BABYLON.MeshBuilder.CreateCylinder("roof", { diameter: 3.2, height: 1.5, tessellation: 3 }, scene);
roof.rotation.z = Math.PI;
roof.position = new BABYLON.Vector3(-10, 2.5, -25);
const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
roofMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5); // reddish-pink
roof.material = roofMat;

// === PANDA ===
const pandaBody = BABYLON.MeshBuilder.CreateSphere("pandaBody", { diameter: 1 }, scene);
pandaBody.position = new BABYLON.Vector3(0, 0.5, -10);
const pandaMat = new BABYLON.StandardMaterial("pandaMat", scene);
pandaMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // white body
pandaBody.material = pandaMat;

const pandaHead = BABYLON.MeshBuilder.CreateSphere("pandaHead", { diameter: 0.6 }, scene);
pandaHead.position = new BABYLON.Vector3(0, 1.2, -10);
const headMat = new BABYLON.StandardMaterial("headMat", scene);
headMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // white head
pandaHead.material = headMat;

const pandaEarL = BABYLON.MeshBuilder.CreateSphere("pandaEarL", { diameter: 0.2 }, scene);
pandaEarL.position = new BABYLON.Vector3(-0.25, 1.5, -10);
pandaEarL.material = new BABYLON.StandardMaterial("earMat", scene);
pandaEarL.material.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2); // soft black

const pandaEarR = pandaEarL.clone("pandaEarR");
pandaEarR.position.x = 0.25;

// === BUTTERFLIES ===
function createButterfly(x, y, z, scale = 1, speed = 0.005) {
  const butterfly = BABYLON.MeshBuilder.CreatePlane("butterfly", { size: 0.4 * scale }, scene);
  butterfly.position = new BABYLON.Vector3(x, y, z);
  butterfly.material = new BABYLON.StandardMaterial("butterflyMat", scene);
  butterfly.material.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8); // soft pink
  butterfly.material.backFaceCulling = false;

  scene.onBeforeRenderObservable.add(() => {
    butterfly.position.x += Math.sin(performance.now() * 0.001 * speed) * 0.01;
    butterfly.position.y += Math.cos(performance.now() * 0.001 * speed) * 0.005;
  });
}

createButterfly(-5, 4, -20, 1, 0.8);
createButterfly(6, 6, -25, 1.2, 1.1);

// === BEES ===
function createBee(x, y, z, color = new BABYLON.Color3(1, 0.9, 0.3), speed = 0.008) {
  const bee = BABYLON.MeshBuilder.CreateSphere("bee", { diameter: 0.3 }, scene);
  bee.position = new BABYLON.Vector3(x, y, z);
  const beeMat = new BABYLON.StandardMaterial("beeMat", scene);
  beeMat.diffuseColor = color;
  bee.material = beeMat;

  scene.onBeforeRenderObservable.add(() => {
    bee.position.y += Math.sin(performance.now() * 0.001 * speed) * 0.01;
    bee.rotation.y += 0.01;
  });
}

createBee(3, 3, -22);
createBee(-4, 5, -24, new BABYLON.Color3(1, 0.8, 0.5), 1.5);

// Create a few clouds across the sky
createCloud(10, 20, -29.8, 1);
createCloud(-8, 23, -29.8, 0.8);
createCloud(0, 26, -29.8, 1.2);

// Create the bowling lane
const lane = BABYLON.MeshBuilder.CreateBox("lane", {
  width: 3,
  height: 0.2,
  depth: 30
}, scene);
lane.position.y = 0.2; // Slightly below the ball
lane.material = new BABYLON.StandardMaterial("laneMat", scene);
lane.material.diffuseColor = new BABYLON.Color3(0.95, 0.89, 1); // pastel lilac

// Create left bumper
const leftBumper = BABYLON.MeshBuilder.CreateBox("leftBumper", {
  width: 0.3,
  height: 0.4,
  depth: 30
}, scene);
leftBumper.position.set(-1.65, 0.3, 0);
leftBumper.material = new BABYLON.StandardMaterial("leftBumperMat", scene);
leftBumper.material.diffuseColor = new BABYLON.Color3(1, 0.8, 0.9); // soft pink

// Create right bumper
const rightBumper = leftBumper.clone("rightBumper");
rightBumper.position.x = 1.65;
rightBumper.position.y = 0.3
rightBumper.material = new BABYLON.StandardMaterial("rightBumperMat", scene);
rightBumper.material.diffuseColor = new BABYLON.Color3(0.85, 0.95, 1); // pastel blue


// Start the render loop
engine.runRenderLoop(() => {
  scene.render();
});

// Handle window resize
window.addEventListener("resize", () => {
  engine.resize();
});
