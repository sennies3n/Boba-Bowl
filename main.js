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
