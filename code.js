Code.js

// Ensure the script runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Get the canvas element
  const canvas = document.getElementById("renderCanvas");
  if (!canvas) {
    console.error("Canvas element with ID 'renderCanvas' not found!");
    return; // Stop execution if canvas isn't found
  }

  // Create the Babylon engine
  // Use adaptToDeviceRatio: true for better rendering on high DPI displays
  const engine = new BABYLON.Engine(canvas, true, { adaptToDeviceRatio: true });

  // Create the scene
  const scene = new BABYLON.Scene(engine);
  // Optional: Add a scene background color for debugging if needed
  // scene.clearColor = new BABYLON.Color4(0.8, 0.8, 0.8, 1); // Light gray

  // === PANDA SKIN DEFINITIONS ===
  // ✨ Define this BEFORE it's used below ✨
  const pandaSkins = [
    { // Default Skin (Index 0)
      name: "Classic Panda",
      bodyColor: BABYLON.Color3.White(),
      headColor: BABYLON.Color3.White(),
      earColor: new BABYLON.Color3(0.2, 0.2, 0.2), // soft black
    },
    { // Skin 1 (Unlocked after 5 games)
      name: "Lavender Dream",
      bodyColor: new BABYLON.Color3(0.9, 0.8, 1), // pastel purple
      headColor: new BABYLON.Color3(0.9, 0.8, 1),
      earColor: new BABYLON.Color3(0.5, 0.4, 0.6), // darker purple
    },
    { // Skin 2 (Unlocked after 10 games)
      name: "Golden Sun",
      bodyColor: new BABYLON.Color3(1, 0.9, 0.4), // golden yellow
      headColor: new BABYLON.Color3(1, 0.9, 0.4),
      earColor: new BABYLON.Color3(0.6, 0.5, 0.1), // brown-ish
    },
    // Add more skins here...
  ];

  // === TEMPORARY: Track game progress for unlocks ===
  // ⚠️ Move this later into real "game finished" logic
  // Use scene.onReadyObservable for actions after the scene is ready
  scene.onReadyObservable.addOnce(() => { // Use addOnce so it only runs once per page load
    try {
      const currentGames = parseInt(localStorage.getItem("gamesPlayed")) || 0;
      // Only increment if this scene load represents a *new* game session start,
      // adjust this logic based on your actual game flow.
      // For now, we'll increment every time the scene loads.
      const updatedGames = currentGames + 1;
      localStorage.setItem("gamesPlayed", updatedGames);
      console.log(`Games played count updated to: ${updatedGames}`); // Add logging
    } catch (e) {
      console.warn("Could not access localStorage. Skins might not unlock.", e);
    }
  });

  // Create a simple camera that orbits around the scene
  const camera = new BABYLON.ArcRotateCamera("Camera",
    Math.PI / 2, // Initial angle horizontal (beta) - Looking straight ahead
    Math.PI / 2.5, // Initial angle vertical (alpha) - Slightly looking down
    35, // Initial distance (radius) - Further out to see more context
    new BABYLON.Vector3(0, 3, -10), // Target point - Focused slightly above ground near panda start
    scene);
  camera.attachControl(canvas, true);
  // Set limits for better control
  camera.lowerRadiusLimit = 10; // Prevent zooming too close
  camera.upperRadiusLimit = 100; // Prevent zooming too far out
  camera.upperBetaLimit = Math.PI / 2; // Prevent camera going below ground level

  // Add a soft ambient light
  const light = new BABYLON.HemisphericLight("hemiLight",
    new BABYLON.Vector3(0, 1, 0), // Light from above
    scene);
  light.intensity = 0.8;
  light.diffuse = new BABYLON.Color3(1, 1, 1);
  light.specular = new BABYLON.Color3(0.5, 0.5, 0.5);
  light.groundColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Soft ground reflection

  // Add a directional light for shadows and highlights (optional, can impact performance)
  // const shadowLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-0.5, -1, 0.3), scene);
  // shadowLight.intensity = 0.5;
  // Add shadow generator here if needed

  // === MATERIALS (OPTIMIZATION: Define reusable materials once) ===
  // Use Object.freeze for materials that won't change properties after creation
  const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.diffuseTexture = new BABYLON.DynamicTexture("skyTexture", { width: 2, height: 128 }, scene, false); // Higher res gradient
  skyMat.diffuseTexture.hasAlpha = false;
  skyMat.specularColor = BABYLON.Color3.Black(); // No shininess for the sky
  skyMat.emissiveColor = BABYLON.Color3.White(); // Make sky bright regardless of light

  const sunMat = new BABYLON.StandardMaterial("sunMat", scene);
  sunMat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.4); // warm golden
  sunMat.diffuseColor = BABYLON.Color3.Black(); // Sun should glow, not be lit
  Object.freeze(sunMat); // Sun material properties won't change

  const cloudMat = new BABYLON.StandardMaterial("cloudMat", scene);
  const cloudTexture = new BABYLON.Texture("https://i.imgur.com/qXbIq1T.png", scene, true, true); // Mipmaps=true, invertY=true (standard)
  cloudTexture.hasAlpha = true;
  cloudMat.diffuseTexture = cloudTexture;
  // Use diffuse texture's alpha channel for transparency
  cloudMat.useAlphaFromDiffuseTexture = true;
  cloudMat.backFaceCulling = false;
  // Set blend mode for better transparency rendering
  cloudMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  cloudMat.specularColor = BABYLON.Color3.Black(); // Clouds aren't typically shiny
  // Note: Can't easily freeze this if opacity/alpha might be animated later

  const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = BABYLON.Color3.FromHexString("#b6e8c5"); // Adjusted minty grass
  groundMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce shininess
  Object.freeze(groundMat); // Ground material won't change

  const trunkMat = new BABYLON.StandardMaterial("trunkMat", scene);
  trunkMat.diffuseColor = new BABYLON.Color3(0.45, 0.25, 0.1); // Slightly adjusted brown
  trunkMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  Object.freeze(trunkMat);

  const topMat = new BABYLON.StandardMaterial("topMat", scene);
  topMat.diffuseColor = new BABYLON.Color3(0.5, 0.8, 0.5); // Adjusted soft green
  topMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  Object.freeze(topMat);

  const houseMat = new BABYLON.StandardMaterial("houseMat", scene);
  houseMat.diffuseColor = new BABYLON.Color3(0.95, 0.8, 0.55); // Adjusted light orange/beige
  houseMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  Object.freeze(houseMat);

  const roofMat = new BABYLON.StandardMaterial("roofMat", scene);
  roofMat.diffuseColor = new BABYLON.Color3(0.9, 0.45, 0.45); // Adjusted reddish-pink
  roofMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  Object.freeze(roofMat);

  // Panda materials will be colored later based on skin
  const pandaBodyMat = new BABYLON.StandardMaterial("pandaBodyMat", scene);
  pandaBodyMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Less shiny
  const pandaHeadMat = new BABYLON.StandardMaterial("pandaHeadMat", scene);
  pandaHeadMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
  const pandaEarMat = new BABYLON.StandardMaterial("pandaEarMat", scene);
  pandaEarMat.specularColor = BABYLON.Color3(0.05, 0.05, 0.05); // Even less shiny

  const cupMat = new BABYLON.StandardMaterial("cupMat", scene);
  cupMat.diffuseColor = new BABYLON.Color3(0.9, 0.8, 1); // pastel purple
  cupMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3); // A bit shiny
  Object.freeze(cupMat);

  const strawMat = new BABYLON.StandardMaterial("strawMat", scene);
  strawMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8); // soft pink straw
  strawMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  Object.freeze(strawMat);

  // Shared materials for butterflies and bees
  const butterflyMat = new BABYLON.StandardMaterial("butterflyMat", scene);
  butterflyMat.diffuseColor = new BABYLON.Color3(1, 0.6, 0.8); // soft pink
  butterflyMat.backFaceCulling = false;
  butterflyMat.specularColor = BABYLON.Color3.Black(); // Not shiny
  // Consider emissive color if they should glow slightly
  // butterflyMat.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.15);

  const beeYellowMat = new BABYLON.StandardMaterial("beeYellowMat", scene);
  beeYellowMat.diffuseColor = new BABYLON.Color3(1, 0.9, 0.3); // Default yellow
  beeYellowMat.specularColor = new BABYLON.Color3(0.3, 0.3, 0.1); // Slightly shiny
  // beeYellowMat.emissiveColor = new BABYLON.Color3(0.2, 0.18, 0.05);
  Object.freeze(beeYellowMat);

  const beeOrangeMat = new BABYLON.StandardMaterial("beeOrangeMat", scene);
  beeOrangeMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.5); // Orange variant
  beeOrangeMat.specularColor = new BABYLON.Color3(0.3, 0.2, 0.1);
  // beeOrangeMat.emissiveColor = new BABYLON.Color3(0.2, 0.16, 0.1);
  Object.freeze(beeOrangeMat);

  const laneMat = new BABYLON.StandardMaterial("laneMat", scene);
  laneMat.diffuseColor = new BABYLON.Color3(0.95, 0.89, 1); // pastel lilac
  laneMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Moderately shiny
  Object.freeze(laneMat);

  const leftBumperMat = new BABYLON.StandardMaterial("leftBumperMat", scene);
  leftBumperMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.9); // soft pink
  leftBumperMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  Object.freeze(leftBumperMat);

  const rightBumperMat = new BABYLON.StandardMaterial("rightBumperMat", scene);
  rightBumperMat.diffuseColor = new BABYLON.Color3(0.85, 0.95, 1); // pastel blue
  rightBumperMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
  Object.freeze(rightBumperMat);

  // === SKY BACKDROP ===
  const sky = BABYLON.MeshBuilder.CreatePlane("sky", { width: 200, height: 100 }, scene); // Made larger
  sky.position = new BABYLON.Vector3(0, 35, -50); // Pushed further back and higher
  sky.rotation.x = Math.PI / 16; // Slight tilt back
  sky.material = skyMat; // Assign pre-defined material

  // Create vertical gradient (higher resolution)
  const skyCtx = skyMat.diffuseTexture.getContext();
  const gradient = skyCtx.createLinearGradient(0, 0, 0, 128); // Match texture height
  gradient.addColorStop(0, "#aee2ff"); // top: pastel sky blue
  gradient.addColorStop(0.8, "#d8ffe7"); // Transition higher up
  gradient.addColorStop(1, "#b6e8c5"); // bottom: matches ground
  skyCtx.fillStyle = gradient;
  skyCtx.fillRect(0, 0, 2, 128); // Match texture dimensions
  skyMat.diffuseTexture.update();
  sky.isPickable = false; // Optimization: sky doesn't need click/pointer events

  // === SUN ===
  const sun = BABYLON.MeshBuilder.CreateDisc("sun", { radius: 8, tessellation: 32 }, scene); // Slightly larger, smoother
  sun.position = new BABYLON.Vector3(-40, 40, -49.9); // Adjusted position relative to sky
  sun.material = sunMat; // Assign pre-defined material
  sun.isPickable = false;
  sun.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // Always face camera

  // === CLOUDS (Using shared material & billboard mode) ===
  function createCloud(x, y, z, scale = 1) {
    const cloud = BABYLON.MeshBuilder.CreatePlane(`cloud_${x}_${y}`, { size: 8 * scale }, scene); // Unique name
    cloud.position = new BABYLON.Vector3(x, y, z);
    // Make clouds always face the camera
    cloud.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    cloud.material = cloudMat; // Assign shared cloud material
    cloud.isPickable = false; // Optimization
    return cloud;
  }

  // Create a few clouds across the sky
  createCloud(30, 35, -49.8, 1.2);
  createCloud(-25, 40, -49.8, 0.9);
  createCloud(0, 45, -49.8, 1.5);
  createCloud(55, 32, -49.8, 1.0);
  createCloud(-40, 30, -49.8, 1.1);

  // === GROUND ===
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 200, height: 100 }, scene); // Match sky size
  ground.position.y = -0.1; // Ensure it's slightly below elements sitting on 0
  ground.material = groundMat; // Assign pre-defined material
  ground.isPickable = false; // Optimization

  // === DECORATIONS (TREE, HOUSE) ===
  // Grouping decorations under a parent node can help organization
  const decorations = new BABYLON.TransformNode("decorations", scene);
  decorations.position.z = -25; // Place decorations further back

  const treeTrunk = BABYLON.MeshBuilder.CreateCylinder("treeTrunk", { diameter: 0.5, height: 3.5, tessellation: 12 }, scene);
  treeTrunk.position = new BABYLON.Vector3(10, 1.75, 0); // Relative to parent
  treeTrunk.material = trunkMat;
  treeTrunk.parent = decorations;
  treeTrunk.isPickable = false;

  const treeTop = BABYLON.MeshBuilder.CreateSphere("treeTop", { diameter: 3.5, segments: 16 }, scene);
  treeTop.position = new BABYLON.Vector3(10, 4.5, 0); // Relative to parent
  treeTop.material = topMat;
  treeTop.parent = decorations;
  treeTop.isPickable = false;

  const houseBase = BABYLON.MeshBuilder.CreateBox("houseBase", { width: 3.5, height: 2.5, depth: 2.5 }, scene);
  houseBase.position = new BABYLON.Vector3(-12, 1.25, 0); // Relative to parent
  houseBase.material = houseMat;
  houseBase.parent = decorations;
  houseBase.isPickable = false;

  // Create a triangular prism roof using CreatePolyhedron
  const roof = BABYLON.MeshBuilder.CreatePolyhedron("roof", { type: 7, size: 1.1 }, scene); // type 7 is triangular prism
  roof.scaling = new BABYLON.Vector3(1.6, 1.0, 1.5); // Scale to fit house base width/depth
  roof.rotation = new BABYLON.Vector3(0, Math.PI / 2, 0); // Rotate to align with house
  roof.position = new BABYLON.Vector3(-12, 2.9, 0); // Position above base, relative to parent
  roof.material = roofMat;
  roof.parent = decorations;
  roof.isPickable = false;


  // === PANDA ===
  // Using smaller segment counts for performance if high detail isn't needed
  const pandaBody = BABYLON.MeshBuilder.CreateSphere("pandaBody", { diameter: 1, segments: 16 }, scene);
  pandaBody.position = new BABYLON.Vector3(0, 0.5, 0); // Position relative to parent
  pandaBody.material = pandaBodyMat; // Assign specific panda material

  const pandaHead = BABYLON.MeshBuilder.CreateSphere("pandaHead", { diameter: 0.6, segments: 16 }, scene);
  pandaHead.position = new BABYLON.Vector3(0, 1.1, 0.05); // Slightly forward, relative to parent
  pandaHead.material = pandaHeadMat; // Assign specific panda material

  const pandaEarL = BABYLON.MeshBuilder.CreateSphere("pandaEarL", { diameter: 0.25, segments: 8 }, scene);
  pandaEarL.position = new BABYLON.Vector3(-0.25, 1.45, -0.05); // Adjusted, relative to parent
  pandaEarL.material = pandaEarMat; // Assign specific panda material

  const pandaEarR = pandaEarL.clone("pandaEarR"); // Clone includes material reference
  pandaEarR.position.x = 0.25; // Position the clone correctly

  // === Apply Skin Colors ===
  // Do this *after* materials are created and assigned
  let gamesPlayed = 0;
  try {
      gamesPlayed = parseInt(localStorage.getItem("gamesPlayed")) || 0;
  } catch (e) {
      console.warn("Could not read gamesPlayed from localStorage.");
  }

  // Ensure unlockedSkinIndex is valid
  const skinUnlockThreshold = 5; // Games needed per skin unlock
  const unlockedSkinIndex = Math.min(
      Math.floor(gamesPlayed / skinUnlockThreshold),
      pandaSkins.length - 1 // Max index is length - 1
  );
  const selectedSkin = pandaSkins[unlockedSkinIndex] || pandaSkins[0]; // Fallback to default

  console.log(`Games Played: ${gamesPlayed}, Unlocked Skin Index: ${unlockedSkinIndex}, Using Skin: ${selectedSkin.name}`); // Add logging

  // Apply colors from the selected skin object
  pandaBodyMat.diffuseColor = selectedSkin.bodyColor;
  pandaHeadMat.diffuseColor = selectedSkin.headColor;
  pandaEarMat.diffuseColor = selectedSkin.earColor;

  // === Group panda parts ===
  // Use TransformNode for grouping without adding rendering overhead
  const panda = new BABYLON.TransformNode("pandaGroup", scene);
  pandaBody.parent = panda;
  pandaHead.parent = panda;
  pandaEarL.parent = panda;
  pandaEarR.parent = panda;

  // Move full panda into starting position on the lane
  panda.position = new BABYLON.Vector3(0, 0, -13); // Position near the start of the lane


  // === BOBA CUP ===
  // Group boba elements too
  const boba = new BABYLON.TransformNode("bobaGroup", scene);
  boba.parent = panda; // Attach to panda group
  boba.position = new BABYLON.Vector3(0.35, 0.6, 0.3); // Position relative to panda center
  boba.rotation = new BABYLON.Vector3(0, -Math.PI / 6, Math.PI / 12); // Tilt slightly

  const cup = BABYLON.MeshBuilder.CreateCylinder("bobaCup", { diameter: 0.2, height: 0.35, tessellation: 12 }, scene);
  cup.material = cupMat; // Assign pre-defined material
  cup.parent = boba; // Attach to boba group
  cup.position = BABYLON.Vector3.Zero(); // Position is handled by parent 'boba' node
  cup.isPickable = false;

  // Straw
  const straw = BABYLON.MeshBuilder.CreateCylinder("bobaStraw", { diameter: 0.05, height: 0.45, tessellation: 6 }, scene);
  straw.material = strawMat; // Assign pre-defined material
  straw.parent = boba; // Attach to boba group
  // Position straw relative to the boba group's center (which is the cup's center)
  straw.position = new BABYLON.Vector3(0, 0.15, 0); // Y offset from cup center
  straw.isPickable = false;

  // === PANDA IDLE ANIMATION ===
  let time = 0; // Use a variable scoped outside the render loop for continuous animation
  scene.onBeforeRenderObservable.add(() => {
    // Use engine.getDeltaTime for smoother, frame-rate independent animation
    const deltaTime = engine.getDeltaTime() / 1000.0; // Delta time in seconds
    time += deltaTime; // Accumulate time

    // Check if panda exists before trying to animate it
    if (panda && panda.position && panda.rotation) {
        const bounceSpeed = 2.5;
        const swaySpeed = 1.5;
        const bounceAmount = 0.04;
        const swayAmount = 0.08;
        const basePandaY = 0; // Base Y position on the ground plane

        // Smooth sinusoidal motion
        panda.position.y = basePandaY + (Math.sin(time * bounceSpeed) * bounceAmount);
        panda.rotation.y = Math.sin(time * swaySpeed) * swayAmount;
    }
  });

  // === SPARKLY TRAILS (Function definition) ===
  // Cache particle systems to avoid recreating them constantly if objects are added/removed
  const particleSystems = [];
  function createTrailEmitter(sourceMesh, particleColor = new BABYLON.Color4(1, 1, 1, 0.6)) {
      // Use sourceMesh.name for uniqueness if needed, or a generic name
      const systemName = `sparkleTrail_${sourceMesh.id}`; // Use unique ID
      const particleSystem = new BABYLON.ParticleSystem(systemName, 200, scene);
      // Optimization: Use a shared texture if possible
      particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);

      particleSystem.emitter = sourceMesh; // Emitter is the mesh itself
      // Emit from the center of the mesh
      particleSystem.minEmitBox = new BABYLON.Vector3(0, 0, 0);
      particleSystem.maxEmitBox = new BABYLON.Vector3(0, 0, 0);

      // Colors
      particleSystem.color1 = particleColor;
      particleSystem.color2 = particleColor.scale(0.8); // Slightly darker shade
      particleSystem.colorDead = new BABYLON.Color4(particleColor.r, particleColor.g, particleColor.b, 0.0); // Fade out alpha

      // Size
      particleSystem.minSize = 0.04;
      particleSystem.maxSize = 0.08;

      // Life time
      particleSystem.minLifeTime = 0.2;
      particleSystem.maxLifeTime = 0.5;

      // Emission rate
      particleSystem.emitRate = 25;

      // Blend mode - Additive looks good for sparkles
      particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

      // Speed / Spread
      particleSystem.minEmitPower = 0.1;
      particleSystem.maxEmitPower = 0.3;
      particleSystem.updateSpeed = 0.015; // Controls how fast particles update

      // Gravity (optional, subtle effect)
      particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);

      // Start the particle system
      particleSystem.start();
      particleSystems.push(particleSystem); // Keep track for potential disposal
      return particleSystem;
  }

  // === BUTTERFLIES (Using shared material & improved animation) ===
  const butterflies = []; // Keep track for potential management
  function createButterfly(x, y, z, scale = 1, speedFactor = 1) {
    const butterfly = BABYLON.MeshBuilder.CreatePlane(`butterfly_${butterflies.length}`, { size: 0.5 * scale }, scene); // Unique name
    butterfly.position = new BABYLON.Vector3(x, y, z);
    butterfly.material = butterflyMat; // Assign shared material
    // Billboard mode allows rotation but keeps it upright facing camera on Y axis
    butterfly.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    butterfly.isPickable = false;

    // Animation specific parameters stored with the mesh
    butterfly.metadata = {
        initialPos: butterfly.position.clone(),
        animOffset: Math.random() * Math.PI * 2, // Random start phase
        speedFactor: speedFactor
    };

    butterflies.push(butterfly);
    createTrailEmitter(butterfly, new BABYLON.Color4(1, 0.6, 0.8, 0.6)); // Pink trail
    return butterfly;
  }

  // Create some butterflies
  createButterfly(-6, 4, -20, 1, 0.8);
  createButterfly(7, 6, -25, 1.2, 1.1);
  createButterfly(-2, 5, -28, 0.9, 1.0);

  // === BEES (Using shared materials & improved animation) ===
  const bees = []; // Keep track for potential management
  function createBee(x, y, z, useOrangeMat = false, speedFactor = 1) {
      const bee = BABYLON.MeshBuilder.CreateSphere(`bee_${bees.length}`, { diameter: 0.35, segments: 10 }, scene); // Unique name
      bee.position = new BABYLON.Vector3(x, y, z);
      bee.material = useOrangeMat ? beeOrangeMat : beeYellowMat; // Assign shared material
      bee.isPickable = false;

      // Animation specific parameters
      bee.metadata = {
          initialPos: bee.position.clone(),
          animOffset: Math.random() * Math.PI * 2, // Random start phase
          speedFactor: speedFactor
      };

      bees.push(bee);
      createTrailEmitter(bee, useOrangeMat ? new BABYLON.Color4(1, 0.9, 0.6, 0.7) : new BABYLON.Color4(1, 1, 0.6, 0.7)); // Yellow/Orange trail
      return bee;
  }

  // Create some bees
  createBee(4, 3, -22, false, 1.0);
  createBee(-5, 5, -24, true, 1.2);
  createBee(0, 4, -26, false, 0.9);


  // === SHARED ANIMATION LOOP FOR BUTTERFLIES & BEES ===
  scene.onBeforeRenderObservable.add(() => {
    const animTime = performance.now() * 0.001; // Consistent time source in seconds

    butterflies.forEach(butterfly => {
        if (!butterfly.metadata) return; // Guard clause
        const md = butterfly.metadata;
        const currentAnimTime = animTime * md.speedFactor + md.animOffset;
        // Fluttery vertical movement
        butterfly.position.y = md.initialPos.y + Math.sin(currentAnimTime * 5) * 0.2;
        // Gentle horizontal drift
        butterfly.position.x = md.initialPos.x + Math.cos(currentAnimTime * 0.8) * 0.8;
        // Gentle depth drift
        butterfly.position.z = md.initialPos.z + Math.sin(currentAnimTime * 0.6) * 0.5;
    });

    bees.forEach(bee => {
        if (!bee.metadata) return; // Guard clause
        const md = bee.metadata;
        const currentAnimTime = animTime * md.speedFactor + md.animOffset;
        // Buzzy vertical movement
        bee.position.y = md.initialPos.y + Math.sin(currentAnimTime * 8) * 0.15;
        // Circular horizontal movement
        bee.position.x = md.initialPos.x + Math.cos(currentAnimTime * 1.5) * 1.0;
        bee.position.z = md.initialPos.z + Math.sin(currentAnimTime * 1.5) * 0.7; // Slightly elliptical path
        // Simple rotation
        bee.rotation.y += 0.05 * md.speedFactor;
    });
  });

  // === BOWLING LANE ===
  const laneWidth = 3.5;
  const laneDepth = 30;
  const bumperWidth = 0.3;
  const bumperHeight = 0.4;

  const lane = BABYLON.MeshBuilder.CreateBox("lane", {
    width: laneWidth,
    height: 0.2,
    depth: laneDepth
  }, scene);
  lane.position = new BABYLON.Vector3(0, 0.1, 0); // Center at origin, slightly above ground
  lane.material = laneMat; // Assign pre-defined material
  lane.isPickable = false;

  // Create left bumper
  const leftBumper = BABYLON.MeshBuilder.CreateBox("leftBumper", {
    width: bumperWidth,
    height: bumperHeight,
    depth: laneDepth
  }, scene);
  // Position relative to lane edge
  leftBumper.position = new BABYLON.Vector3(-(laneWidth / 2 + bumperWidth / 2), bumperHeight / 2 + 0.1, 0);
  leftBumper.material = leftBumperMat; // Assign pre-defined material
  leftBumper.isPickable = false;

  // Create right bumper using clone for efficiency
  const rightBumper = leftBumper.clone("rightBumper");
  rightBumper.position.x = (laneWidth / 2 + bumperWidth / 2); // Position on the other side
  // Assign a *different* material instance (cloning only copies reference initially)
  // If you want them to share the exact same material object (and thus color changes affect both), skip this.
  // If you want them to potentially have different properties later, create or assign a separate material.
  // In this case, we defined separate materials earlier, so we assign the correct one.
  rightBumper.material = rightBumperMat;
  rightBumper.isPickable = false;


  // Start the render loop
  engine.runRenderLoop(() => {
    scene.render();
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    engine.resize();
  });

  // === Scene Debugger (Optional) ===
  // Press Shift+Ctrl+Alt+I to toggle
  // window.addEventListener("keydown", (ev) => {
  //     if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'I') {
  //         if (scene.debugLayer.isVisible()) {
  //             scene.debugLayer.hide();
  //         } else {
  //             scene.debugLayer.show();
  //         }
  //     }
  // });


}); // End of DOMContentLoaded listener
