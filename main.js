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

// Start the render loop
engine.runRenderLoop(() => {
  scene.render();
});

// Handle window resize
window.addEventListener("resize", () => {
  engine.resize();
});
