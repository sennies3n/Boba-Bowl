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
lane.position.y = -0.1; // Slightly below the ball
lane.material = new BABYLON.StandardMaterial("laneMat", scene);
lane.material.diffuseColor = new BABYLON.Color3(0.95, 0.89, 1); // pastel lilac

// Create left bumper
const leftBumper = BABYLON.MeshBuilder.CreateBox("leftBumper", {
  width: 0.3,
  height: 0.4,
  depth: 30
}, scene);
leftBumper.position.set(-1.65, 0.1, 0);
leftBumper.material = new BABYLON.StandardMaterial("leftBumperMat", scene);
leftBumper.material.diffuseColor = new BABYLON.Color3(1, 0.8, 0.9); // soft pink

// Create right bumper
const rightBumper = leftBumper.clone("rightBumper");
rightBumper.position.x = 1.65;
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
