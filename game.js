import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const clamp = THREE.MathUtils.clamp;
const rand = (a, b) => a + Math.random() * (b - a);
const choice = (items) => items[(Math.random() * items.length) | 0];
const TAU = Math.PI * 2;

const STORY = [
  {
    kicker: 'CHAPTER ONE',
    title: 'SNACKTOWN FALLS',
    subtitle: 'The fruit has crossed the line.',
    objective: 'Defeat the Fruit Patrol',
    target: 10,
    bounds: 22,
    intro: [
      ['NARRATOR', 'At 8:03 AM, Snacktown outlawed burgers, pizza and candy. Society immediately collapsed.'],
      ['COOPER', 'They can take our freedom. They can take our vegetables. But they are not taking my lunch.'],
      ['MAYOR NUGGET', 'Cooper, the Fruit Patrol has occupied the town square. Please do something irresponsible.'],
      ['COOPER', 'Finally. A job I am qualified for.']
    ],
    outro: [
      ['MAYOR NUGGET', 'The square is clear, but Doctor Apple escaped to the Wellness Laboratory.'],
      ['COOPER', 'A laboratory? That sounds dangerously educational.'],
      ['NARRATOR', 'Cooper followed the trail of fibre into the forbidden orchard.']
    ]
  },
  {
    kicker: 'CHAPTER TWO',
    title: 'THE WELLNESS LAB',
    subtitle: 'Destroy the machines making everything healthy.',
    objective: 'Destroy the Vitamin Reactors',
    target: 3,
    bounds: 25,
    intro: [
      ['DOCTOR APPLE', 'Welcome, Cooper. Soon every meal will contain a balanced serving of nutrients.'],
      ['COOPER', 'That is the most evil sentence I have ever heard.'],
      ['DOCTOR APPLE', 'My Vitamin Reactors are already converting the town. You cannot stop progress.'],
      ['COOPER', 'I have a junk blaster and no understanding of consequences. Watch me.']
    ],
    outro: [
      ['DOCTOR APPLE', 'Impossible... defeated by saturated fat...'],
      ['COOPER', 'And poor decision-making. Do not forget that.'],
      ['MAYOR NUGGET', 'Bad news. Doctor Apple was only working for someone worse.'],
      ['NARRATOR', 'Beneath Snacktown, the Sewer Throne began to shake.']
    ]
  },
  {
    kicker: 'FINAL CHAPTER',
    title: 'THE SEWER THRONE',
    subtitle: 'King Poo has been waiting.',
    objective: 'Survive the Sewer Guard',
    target: 12,
    bounds: 23,
    intro: [
      ['KING POO', 'Cooper. You have eaten your way through my entire operation.'],
      ['COOPER', 'I did not eat the fruit. I want that officially recorded.'],
      ['KING POO', 'When I am finished, every snack in Snacktown will be suspiciously brown.'],
      ['COOPER', 'This ends now. Mostly because the website needs a final boss.']
    ],
    outro: [
      ['KING POO', 'No... my perfectly disgusting empire...'],
      ['COOPER', 'Flush twice next time.'],
      ['NARRATOR', 'Snacktown was saved. Junk food returned. No lessons were learned.']
    ]
  }
];

class CooperGame {
  constructor() {
    this.canvas = document.querySelector('#gameCanvas');
    this.root = document.querySelector('#gameRoot');
    this.ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.08, 180);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.48, 0.65, 0.86);
    this.composer.addPass(this.bloom);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.world = new THREE.Group();
    this.actorLayer = new THREE.Group();
    this.fxLayer = new THREE.Group();
    this.scene.add(this.world, this.actorLayer, this.fxLayer);

    this.keys = {};
    this.enemies = [];
    this.targets = [];
    this.pickups = [];
    this.enemyProjectiles = [];
    this.fx = [];
    this.shootables = [];
    this.state = 'title';
    this.chapter = 0;
    this.levelKills = 0;
    this.score = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.heat = 0;
    this.overheated = false;
    this.lastShot = 0;
    this.fireHeld = false;
    this.waveTimer = 0;
    this.boss = null;
    this.bossStarted = false;
    this.yaw = 0;
    this.pitch = -0.12;
    this.shake = 0;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.power = { burger: 0, pizza: 0, candy: 0 };
    this.dialogueQueue = [];
    this.dialogueDone = null;
    this.mobileMove = new THREE.Vector2();
    this.mobileAim = false;
    this.audio = null;
    this.lastTime = performance.now();

    this.materials = this.createMaterials();
    this.buildPlayer();
    this.bindEvents();
    this.updateContinueButton();
    this.backToTitle();
    this.fakeLoad();
    requestAnimationFrame((t) => this.loop(t));
  }

  createMaterials() {
    const toon = (color, roughness = 0.72, metalness = 0.05, emissive = 0x000000) => new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.35 : 0 });
    return {
      ink: toon(0x111216), cream: toon(0xf5e9c9), yellow: toon(0xffc857), lime: toon(0xdfff39, .55, .1, 0x273300),
      red: toon(0xed4c47), green: toon(0x59a84f), purple: toon(0x8f5bd5), orange: toon(0xf18b3a),
      brown: toon(0x77401f), darkBrown: toon(0x3f2114), pink: toon(0xff6da8, .45, .12, 0x360018), cyan: toon(0x66d8ff, .35, .2, 0x063344),
      concrete: toon(0x4d535c), lab: toon(0xd8e2e0), sewer: toon(0x28362d), gold: toon(0xe0b84c, .35, .65), white: toon(0xffffff)
    };
  }

  fakeLoad() {
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + rand(8, 18));
      this.ui.loadingFill.style.width = `${progress}%`;
      if (progress > 35) this.ui.loadingText.textContent = 'CALIBRATING JUNK BLASTER...';
      if (progress > 70) this.ui.loadingText.textContent = 'HIDING THE VEGETABLES...';
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => this.ui.loadingScreen.classList.add('hidden'), 250);
      }
    }, 120);
  }

  buildPlayer() {
    const p = new THREE.Group();
    p.position.set(0, 0, 7);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.62, .9, 8, 16), this.materials.yellow);
    body.position.y = 1.08;
    body.castShadow = true;
    p.add(body);

    const face = new THREE.Group();
    const eyeGeo = new THREE.SphereGeometry(.065, 10, 8);
    for (const x of [-.22, .22]) {
      const eye = new THREE.Mesh(eyeGeo, this.materials.ink);
      eye.position.set(x, 1.34, -.58);
      face.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.19, .045, 8, 20, Math.PI), this.materials.ink);
    mouth.rotation.set(Math.PI / 2, 0, Math.PI);
    mouth.position.set(0, 1.12, -.61);
    face.add(mouth);
    p.add(face);

    const legGeo = new THREE.CapsuleGeometry(.12, .55, 5, 8);
    for (const x of [-.3, .3]) {
      const leg = new THREE.Mesh(legGeo, this.materials.ink);
      leg.position.set(x, .35, 0);
      leg.castShadow = true;
      p.add(leg);
    }

    const blaster = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(.28, .25, 1.05), this.materials.ink);
    barrel.position.z = -.52;
    const core = new THREE.Mesh(new THREE.BoxGeometry(.33, .31, .48), this.materials.pink);
    core.position.z = -.12;
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -1.08);
    blaster.add(barrel, core, this.muzzle);
    blaster.position.set(.62, 1.12, -.18);
    blaster.rotation.y = -.06;
    p.add(blaster);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.8, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .015;
    p.add(shadow);

    this.player = p;
    this.actorLayer.add(p);
  }

  bindEvents() {
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (this.state === 'dialogue' && (e.code === 'Space' || e.code === 'Enter')) this.advanceDialogue();
      else if (e.code === 'Escape' && this.state === 'playing') this.pause();
      else if (e.code === 'KeyE' && this.state === 'playing') this.useBurger();
      else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.state === 'playing') this.dash();
      else if (e.code === 'Space' && this.state === 'playing') this.fireHeld = true;
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Space') this.fireHeld = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && this.state === 'playing') {
        this.yaw -= e.movementX * .0021;
        this.pitch = clamp(this.pitch - e.movementY * .0018, -.52, .34);
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.state !== 'playing') return;
      if (document.pointerLockElement !== this.canvas && matchMedia('(pointer:fine)').matches) this.canvas.requestPointerLock();
      else this.fireHeld = true;
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.fireHeld = false; });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && matchMedia('(pointer:fine)').matches) this.pause();
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.ui.newGameButton.onclick = () => this.newGame();
    this.ui.continueButton.onclick = () => this.continueGame();
    this.ui.pauseButton.onclick = () => this.pause();
    this.ui.resumeButton.onclick = () => this.resume();
    this.ui.restartChapterButton.onclick = () => this.enterChapter(this.chapter, true);
    this.ui.quitButton.onclick = () => this.backToTitle();
    this.ui.retryButton.onclick = () => this.enterChapter(this.chapter, true);
    this.ui.gameOverQuit.onclick = () => this.backToTitle();
    this.ui.playAgainButton.onclick = () => this.newGame();
    this.ui.dialogue.onclick = () => this.advanceDialogue();

    this.bindMobile();
    this.resize();
  }

  bindMobile() {
    const zone = this.ui.moveZone;
    let moveId = null;
    const updateStick = (e) => {
      const r = zone.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      const len = Math.max(1, Math.hypot(x, y));
      const max = r.width * .31;
      const scale = Math.min(1, max / len);
      const sx = x * scale, sy = y * scale;
      this.ui.moveStick.style.transform = `translate(${sx}px,${sy}px)`;
      this.mobileMove.set(clamp(x / max, -1, 1), clamp(-y / max, -1, 1));
    };
    zone.addEventListener('pointerdown', (e) => { moveId = e.pointerId; zone.setPointerCapture(moveId); updateStick(e); });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === moveId) updateStick(e); });
    const stopMove = (e) => { if (e.pointerId !== moveId) return; moveId = null; this.mobileMove.set(0, 0); this.ui.moveStick.style.transform = ''; };
    zone.addEventListener('pointerup', stopMove); zone.addEventListener('pointercancel', stopMove);
    this.ui.mobileFire.addEventListener('pointerdown', (e) => { e.preventDefault(); this.fireHeld = true; });
    this.ui.mobileFire.addEventListener('pointerup', () => this.fireHeld = false);
    this.ui.mobileFire.addEventListener('pointercancel', () => this.fireHeld = false);
    this.ui.mobileDash.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dash(); });

    let aimId = null, lastX = 0, lastY = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.state !== 'playing') return;
      aimId = e.pointerId; lastX = e.clientX; lastY = e.clientY; this.canvas.setPointerCapture(aimId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== aimId) return;
      this.yaw -= (e.clientX - lastX) * .008;
      this.pitch = clamp(this.pitch - (e.clientY - lastY) * .006, -.52, .34);
      lastX = e.clientX; lastY = e.clientY;
    });
    const endAim = (e) => { if (e.pointerId === aimId) aimId = null; };
    this.canvas.addEventListener('pointerup', endAim); this.canvas.addEventListener('pointercancel', endAim);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }

  newGame() {
    localStorage.removeItem('cooperStorySave');
    this.score = 0;
    this.enterChapter(0, true);
  }

  continueGame() {
    const save = this.readSave();
    this.score = save?.score || 0;
    this.enterChapter(clamp(save?.chapter || 0, 0, STORY.length - 1), true);
  }

  readSave() {
    try { return JSON.parse(localStorage.getItem('cooperStorySave')); } catch { return null; }
  }

  writeSave(chapter) {
    localStorage.setItem('cooperStorySave', JSON.stringify({ chapter, score: this.score }));
    this.updateContinueButton();
  }

  updateContinueButton() {
    const save = this.readSave();
    this.ui.continueButton.disabled = !save;
    this.ui.continueButton.textContent = save ? `CONTINUE CHAPTER ${(save.chapter || 0) + 1}` : 'NO SAVE YET';
  }

  backToTitle() {
    if (document.pointerLockElement) document.exitPointerLock();
    this.state = 'title';
    this.hideAllScreens();
    this.ui.titleScreen.classList.add('active');
    this.ui.crosshair.style.display = 'none';
    this.ui.hudTop.style.display = 'none';
    this.ui.hudLeft.style.display = 'none';
    this.ui.objectiveCard.style.display = 'none';
    this.ui.bossHud.hidden = true;
    this.clearLevel();
  }

  enterChapter(index, restart = false) {
    if (document.pointerLockElement) document.exitPointerLock();
    this.chapter = index;
    this.state = 'transition';
    this.hideAllScreens();
    this.ui.hudTop.style.display = '';
    this.ui.hudLeft.style.display = '';
    this.ui.objectiveCard.style.display = '';
    this.ui.crosshair.style.display = '';
    this.ui.chapterKicker.textContent = STORY[index].kicker;
    this.ui.chapterTitle.textContent = STORY[index].title;
    this.health = this.maxHealth;
    this.heat = 0;
    this.overheated = false;
    this.power = { burger: restart ? 1 : this.power.burger, pizza: 0, candy: 0 };
    this.levelKills = 0;
    this.waveTimer = 1.2;
    this.boss = null;
    this.bossStarted = false;
    this.clearLevel();
    this.player.position.set(0, 0, 7);
    this.yaw = 0;
    this.pitch = -.12;
    this.buildLevel(index);
    this.updateHud();
    this.announce(STORY[index], () => this.showDialogue(STORY[index].intro, () => this.startChapterPlay()));
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  }

  clearLevel() {
    for (const group of [this.world, this.actorLayer, this.fxLayer]) {
      [...group.children].forEach((child) => { if (child !== this.player) group.remove(child); });
    }
    if (!this.actorLayer.children.includes(this.player)) this.actorLayer.add(this.player);
    this.enemies = [];
    this.targets = [];
    this.pickups = [];
    this.enemyProjectiles = [];
    this.fx = [];
    this.shootables = [];
    this.scene.fog = null;
    this.ui.bossHud.hidden = true;
  }

  buildLevel(index) {
    this.scene.background = new THREE.Color(index === 0 ? 0x91bed0 : index === 1 ? 0x8bbd7a : 0x151d1b);
    this.scene.fog = new THREE.FogExp2(index === 0 ? 0x91bed0 : index === 1 ? 0x8bbd7a : 0x111815, index === 2 ? .025 : .014);
    const hemi = new THREE.HemisphereLight(index === 2 ? 0x6da492 : 0xc8edff, index === 2 ? 0x16221c : 0x50543b, index === 2 ? 1.4 : 2.2);
    const sun = new THREE.DirectionalLight(index === 2 ? 0xb5ffe2 : 0xfff0cf, index === 2 ? 2.1 : 3.1);
    sun.position.set(-12, 19, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
    sun.shadow.camera.right = sun.shadow.camera.top = 30;
    this.world.add(hemi, sun);

    if (index === 0) this.buildSnacktown();
    else if (index === 1) this.buildLab();
    else this.buildSewer();
  }

  ground(material, size = 58) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.world.add(mesh);
    return mesh;
  }

  box(x, y, z, sx, sy, sz, mat, parent = this.world) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }

  buildSnacktown() {
    this.ground(this.materials.concrete, 64);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: .95 });
    this.box(0, .02, 0, 14, .04, 60, roadMat);
    for (let z = -26; z <= 26; z += 5) this.box(0, .05, z, .18, .03, 2.2, this.materials.yellow);
    for (const side of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const h = rand(4.5, 9.5);
        const b = this.box(side * rand(15, 20), h / 2, i * 8 + rand(-1, 1), rand(5, 8), h, rand(5, 7), choice([this.materials.cream, this.materials.brown, this.materials.concrete]));
        for (let wy = 1.4; wy < h - 1; wy += 1.6) for (let wx = -1.5; wx <= 1.5; wx += 1.5) {
          const windowMesh = this.box(b.position.x - side * (b.geometry.parameters.width / 2 + .01), wy, b.position.z + wx, .05, .55, .7, this.materials.cyan);
          windowMesh.material = this.materials.cyan;
        }
      }
    }
    const statue = new THREE.Group();
    this.box(0, .7, -7, 3.2, 1.4, 3.2, this.materials.cream, statue);
    const burger = this.createBurgerMesh(2.4); burger.position.y = 2.4; burger.rotation.y = .5; statue.add(burger); this.world.add(statue);
    for (let i = 0; i < 18; i++) {
      const lamp = new THREE.PointLight(0xdfff39, 3, 9, 2);
      lamp.position.set(i % 2 ? -7.5 : 7.5, 2.5, -24 + i * 3);
      this.world.add(lamp);
      this.box(lamp.position.x, 1.2, lamp.position.z, .12, 2.4, .12, this.materials.ink);
    }
  }

  buildLab() {
    this.ground(this.materials.green, 66);
    for (let i = 0; i < 28; i++) {
      const x = rand(-30, 30), z = rand(-30, 30);
      if (Math.abs(x) < 9 && Math.abs(z) < 12) continue;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.25, .35, 2.2, 8), this.materials.brown); trunk.position.y = 1.1; trunk.castShadow = true;
      tree.add(trunk);
      for (let n = 0; n < 3; n++) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.15, 1.6), 1), this.materials.green); crown.position.set(rand(-.5,.5), 2.3 + rand(-.1,.5), rand(-.4,.4)); crown.castShadow = true; tree.add(crown);
      }
      tree.position.set(x, 0, z); this.world.add(tree);
    }
    this.box(0, .08, 0, 20, .16, 30, this.materials.lab);
    for (const x of [-8.8, 8.8]) this.box(x, 2.6, 0, .5, 5.2, 31, this.materials.ink);
    for (let z = -12; z <= 12; z += 4) {
      const strip = this.box(0, .16, z, 18, .08, .16, this.materials.cyan);
      strip.material = this.materials.cyan;
    }
    const reactorPositions = [new THREE.Vector3(-6, 0, -7), new THREE.Vector3(6, 0, -7), new THREE.Vector3(0, 0, 7)];
    reactorPositions.forEach((p, i) => this.spawnReactor(p, i));
    const lab = this.box(0, 4, -19, 22, 8, 8, this.materials.cream);
    lab.material = this.materials.lab;
    const sign = this.box(0, 5, -14.95, 9, 1.5, .2, this.materials.pink);
    sign.material = this.materials.pink;
  }

  buildSewer() {
    this.ground(this.materials.sewer, 58);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(12, 52), new THREE.MeshStandardMaterial({ color: 0x356e59, roughness: .25, metalness: .25, transparent: true, opacity: .78 }));
    water.rotation.x = -Math.PI / 2; water.position.y = .06; water.receiveShadow = true; this.world.add(water);
    for (const x of [-9, 9]) {
      this.box(x, 2.8, 0, 1.2, 5.6, 55, this.materials.concrete);
      for (let z = -24; z <= 24; z += 6) {
        const pipe = new THREE.Mesh(new THREE.TorusGeometry(1.2, .18, 8, 20, Math.PI), this.materials.brown);
        pipe.rotation.set(0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0);
        pipe.position.set(x + (x < 0 ? 1 : -1), 2.8, z);
        this.world.add(pipe);
      }
    }
    for (let z = -24; z <= 24; z += 5) {
      const bridge = this.box(0, .23, z, 18, .24, 1.7, this.materials.concrete);
      bridge.receiveShadow = true;
      const light = new THREE.PointLight(z % 10 === 0 ? 0xff6da8 : 0xdfff39, 4, 10, 2);
      light.position.set(z % 10 === 0 ? -6 : 6, 2.4, z);
      this.world.add(light);
    }
    const throne = new THREE.Group();
    this.box(0, 1, -18, 7, 2, 5, this.materials.darkBrown, throne);
    this.box(0, 3.7, -20, 7, 5.5, 1.2, this.materials.darkBrown, throne);
    for (const x of [-3.2, 3.2]) this.box(x, 3.7, -20, 1.1, 6.4, 1.1, this.materials.gold, throne);
    this.world.add(throne);
  }

  startChapterPlay() {
    this.state = 'playing';
    this.root.classList.remove('cinematic');
    this.waveTimer = .4;
    this.updateObjective();
    this.toast('MISSION START', STORY[this.chapter].objective);
  }

  announce(chapter, done) {
    this.root.classList.add('cinematic');
    this.ui.announcementKicker.textContent = chapter.kicker;
    this.ui.announcementTitle.textContent = chapter.title;
    this.ui.announcementSubtitle.textContent = chapter.subtitle;
    this.ui.announcement.hidden = false;
    setTimeout(() => { this.ui.announcement.hidden = true; done(); }, 2300);
  }

  showDialogue(lines, done) {
    this.state = 'dialogue';
    this.root.classList.add('cinematic');
    this.dialogueQueue = lines.slice();
    this.dialogueDone = done;
    this.ui.dialogue.hidden = false;
    this.advanceDialogue();
  }

  advanceDialogue() {
    if (this.state !== 'dialogue') return;
    if (!this.dialogueQueue.length) {
      this.ui.dialogue.hidden = true;
      this.root.classList.remove('cinematic');
      const cb = this.dialogueDone; this.dialogueDone = null;
      if (cb) cb();
      return;
    }
    const [speaker, text] = this.dialogueQueue.shift();
    this.ui.dialogueSpeaker.textContent = speaker;
    this.ui.dialogueText.textContent = text;
    this.ui.dialoguePortrait.textContent = speaker === 'COOPER' ? 'C' : speaker === 'KING POO' ? 'P' : speaker === 'DOCTOR APPLE' ? 'A' : speaker === 'MAYOR NUGGET' ? 'N' : '!';
    this.ui.dialoguePortrait.style.background = speaker === 'COOPER' ? '#dfff39' : speaker === 'KING POO' ? '#78411f' : speaker === 'DOCTOR APPLE' ? '#ed4c47' : '#66d8ff';
    this.ui.dialoguePortrait.style.color = speaker === 'KING POO' ? '#fff' : '#111';
    this.sound(320 + Math.random() * 100, .045, 'square', .018);
  }

  toast(kicker, title) {
    this.ui.announcementKicker.textContent = kicker;
    this.ui.announcementTitle.textContent = title;
    this.ui.announcementSubtitle.textContent = '';
    this.ui.announcement.hidden = false;
    setTimeout(() => this.ui.announcement.hidden = true, 1250);
  }

  spawnReactor(position, index) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, .7, 12), this.materials.ink); base.position.y = .35;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(.72, .72, 3.2, 16), this.materials.cyan); core.position.y = 2.15;
    const cage = new THREE.Mesh(new THREE.TorusGeometry(.95, .11, 8, 24), this.materials.pink); cage.position.y = 2.2; cage.rotation.x = Math.PI / 2;
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.2, 12), this.materials.ink); top.position.y = 4.15;
    group.add(base, core, cage, top); group.position.copy(position); group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.userData.entity = group; } });
    group.kind = 'target'; group.userData.kind = 'target'; group.userData.targetType = 'reactor'; group.userData.hp = group.userData.maxHp = 150; group.userData.radius = 1.4; group.userData.index = index;
    this.actorLayer.add(group); this.targets.push(group); this.shootables.push(group);
    const light = new THREE.PointLight(0x66d8ff, 5, 8, 2); light.position.y = 2.3; group.add(light);
  }

  createBurgerMesh(scale = 1) {
    const g = new THREE.Group();
    const bunTop = new THREE.Mesh(new THREE.SphereGeometry(.65 * scale, 20, 12, 0, TAU, 0, Math.PI / 2), this.materials.yellow); bunTop.scale.y = .65; bunTop.position.y = .22 * scale;
    const patty = new THREE.Mesh(new THREE.CylinderGeometry(.64 * scale, .64 * scale, .2 * scale, 18), this.materials.brown);
    const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(.68 * scale, .68 * scale, .1 * scale, 18), this.materials.green); lettuce.position.y = .13 * scale;
    const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(.62 * scale, .62 * scale, .22 * scale, 18), this.materials.yellow); bunBottom.position.y = -.23 * scale;
    g.add(bunTop, patty, lettuce, bunBottom); return g;
  }

  createPizzaMesh(scale = 1) {
    const g = new THREE.Group();
    const slice = new THREE.Mesh(new THREE.ConeGeometry(.72 * scale, 1.2 * scale, 3), this.materials.yellow); slice.rotation.x = Math.PI / 2; slice.rotation.z = Math.PI / 2;
    const crust = new THREE.Mesh(new THREE.CylinderGeometry(.18 * scale, .18 * scale, 1.25 * scale, 12), this.materials.orange); crust.rotation.z = Math.PI / 2; crust.position.set(.48 * scale, 0, 0);
    g.add(slice, crust); return g;
  }

  createCandyMesh(scale = 1) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(.75 * scale, .55 * scale, .32 * scale), this.materials.pink); core.geometry.translate(0, 0, 0);
    for (const x of [-.58, .58]) {
      const wrap = new THREE.Mesh(new THREE.ConeGeometry(.34 * scale, .45 * scale, 4), this.materials.cyan); wrap.rotation.z = x < 0 ? -Math.PI / 2 : Math.PI / 2; wrap.position.x = x * scale; g.add(wrap);
    }
    g.add(core); return g;
  }

  createFruitMesh(type, boss = false) {
    const g = new THREE.Group();
    const s = boss ? 1.65 : 1;
    const colorMat = type === 'apple' ? this.materials.red : type === 'orange' ? this.materials.orange : this.materials.purple;
    if (type === 'grape') {
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3 - y; x++) {
        const grape = new THREE.Mesh(new THREE.SphereGeometry(.28 * s, 12, 10), colorMat); grape.position.set((x - (2 - y) / 2) * .42 * s, (1 - y) * .38 * s, 0); g.add(grape);
      }
    } else {
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(.72 * s, 22, 16), colorMat); fruit.scale.y = type === 'apple' ? .9 : 1; g.add(fruit);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.07 * s, .09 * s, .42 * s, 8), this.materials.brown); stem.position.y = .72 * s; stem.rotation.z = -.2; g.add(stem);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.23 * s, 10, 6), this.materials.green); leaf.scale.set(1.4, .35, .7); leaf.position.set(.23 * s, .83 * s, 0); leaf.rotation.z = -.4; g.add(leaf);
    const eyeGeo = new THREE.SphereGeometry(.07 * s, 8, 6);
    for (const x of [-.22, .22]) { const e = new THREE.Mesh(eyeGeo, this.materials.ink); e.position.set(x * s, .1 * s, -.66 * s); g.add(e); }
    if (boss) {
      const glasses = new THREE.Group();
      for (const x of [-.25, .25]) { const lens = new THREE.Mesh(new THREE.TorusGeometry(.19, .035, 6, 18), this.materials.ink); lens.position.set(x, .1, -.98); lens.rotation.x = Math.PI / 2; glasses.add(lens); }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.04), this.materials.ink); bridge.position.set(0,.1,-.98); glasses.add(bridge); glasses.scale.setScalar(s); g.add(glasses);
      const coat = new THREE.Mesh(new THREE.CylinderGeometry(.65*s,.9*s,1.6*s,16), this.materials.white); coat.position.y = -1.2*s; g.add(coat);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  createPooMesh(boss = false) {
    const g = new THREE.Group();
    const s = boss ? 1.8 : 1;
    const layers = [[0,.0,.72],[0,.55,.58],[0,1.02,.4],[0,1.37,.24]];
    for (const [x,y,r] of layers) { const m = new THREE.Mesh(new THREE.SphereGeometry(r*s,18,12), this.materials.brown); m.scale.y=.7; m.position.set(x,y*s,0); m.castShadow=true; g.add(m); }
    for (const x of [-.22,.22]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.07*s,8,6), this.materials.ink); e.position.set(x*s,.65*s,-.55*s); g.add(e); }
    if (boss) {
      const crown = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.55*s,.55*s,.22*s,12),this.materials.gold); crown.add(base);
      for (let i=0;i<5;i++){const point=new THREE.Mesh(new THREE.ConeGeometry(.16*s,.55*s,5),this.materials.gold);point.position.set((i-2)*.24*s,.32*s,0);crown.add(point)}
      crown.position.y=1.95*s; crown.rotation.z=.08; g.add(crown);
    }
    return g;
  }

  spawnEnemy(type, position = null, boss = false) {
    let mesh, stats;
    if (type === 'apple') { mesh = this.createFruitMesh('apple', boss); stats = boss ? { hp: 720, speed: 2.6, damage: 18, radius: 1.9 } : { hp: 42, speed: 3.5, damage: 10, radius: .72 }; }
    else if (type === 'grape') { mesh = this.createFruitMesh('grape'); stats = { hp: 32, speed: 2.7, damage: 9, radius: .7, ranged: true }; }
    else if (type === 'orange') { mesh = this.createFruitMesh('orange'); stats = { hp: 75, speed: 2.1, damage: 15, radius: .88 }; mesh.scale.setScalar(1.2); }
    else { mesh = this.createPooMesh(boss); stats = boss ? { hp: 1100, speed: 2.35, damage: 22, radius: 2.25 } : { hp: 55, speed: 3, damage: 13, radius: .8, ranged: Math.random() < .45 }; }
    const bound = STORY[this.chapter].bounds - 4;
    if (!position) {
      const angle = rand(0, TAU), d = rand(13, bound);
      position = new THREE.Vector3(Math.cos(angle) * d, 0, Math.sin(angle) * d);
    }
    mesh.position.copy(position);
    mesh.userData.kind = 'enemy';
    const enemy = { mesh, type, boss, hp: stats.hp, maxHp: stats.hp, speed: stats.speed, damage: stats.damage, radius: stats.radius, ranged: stats.ranged, attack: rand(.3,1.1), phase: 1, phaseTriggered: 0, strafe: Math.random()<.5?-1:1, dead:false };
    mesh.userData.entity = enemy;
    mesh.traverse((o) => { if (o.isMesh) o.userData.entity = enemy; });
    this.actorLayer.add(mesh);
    this.enemies.push(enemy);
    this.shootables.push(mesh);
    if (boss) {
      this.boss = enemy;
      this.ui.bossHud.hidden = false;
      this.ui.bossName.textContent = type === 'apple' ? 'DOCTOR APPLE' : 'KING POO';
      this.ui.bossSubtitle.textContent = type === 'apple' ? 'CHIEF WELLNESS OFFICER' : 'FINAL BOSS';
      this.ui.bossPhase.textContent = 'PHASE 1';
      this.sound(85, .7, 'sawtooth', .08);
    }
    return enemy;
  }

  spawnPickup(type, position) {
    const mesh = type === 'burger' ? this.createBurgerMesh(.75) : type === 'pizza' ? this.createPizzaMesh(.75) : this.createCandyMesh(.75);
    mesh.position.copy(position); mesh.position.y = .8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.9,.05,8,24), this.materials.lime); ring.rotation.x = Math.PI/2; mesh.add(ring);
    const pickup = { mesh, type, life: 22 };
    this.pickups.push(pickup); this.actorLayer.add(mesh);
  }

  spawnWaveEnemy() {
    if (this.boss) return;
    if (this.chapter === 0) this.spawnEnemy(choice(['apple','apple','grape','orange']));
    else if (this.chapter === 1) this.spawnEnemy(choice(['apple','grape','orange','orange']));
    else this.spawnEnemy(choice(['poo','poo','apple','grape']));
  }

  startBoss(type) {
    if (this.bossStarted) return;
    this.bossStarted = true;
    this.state = 'dialogue';
    const isApple = type === 'apple';
    const lines = isApple ? [
      ['DOCTOR APPLE', 'You broke all three reactors. Do you know how many wellness grants those cost?'],
      ['COOPER', 'No. I cannot count past pizza.'],
      ['DOCTOR APPLE', 'Then face my final form: APPLE A DAY MODE.']
    ] : [
      ['KING POO', 'Enough minions. I will ruin your appetite personally.'],
      ['COOPER', 'Joke is on you. Nothing has ever ruined my appetite.'],
      ['KING POO', 'Then prepare for the Royal Flush.']
    ];
    this.showDialogue(lines, () => {
      this.state = 'playing';
      const pos = new THREE.Vector3(0, 0, -15);
      this.spawnEnemy(type, pos, true);
      this.toast('BOSS FIGHT', isApple ? 'DOCTOR APPLE' : 'KING POO');
      this.updateObjective();
    });
  }

  update(dt, now) {
    if (this.state !== 'playing') return;
    this.heat = Math.max(0, this.heat - dt * (this.overheated ? .34 : .22));
    if (this.overheated && this.heat < .28) this.overheated = false;
    this.power.pizza = Math.max(0, this.power.pizza - dt);
    this.power.candy = Math.max(0, this.power.candy - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTime = Math.max(0, this.dashTime - dt);

    this.updatePlayer(dt);
    this.updateCamera(dt);
    if (this.fireHeld) this.shoot(now);
    this.updateWaves(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateFx(dt);
    this.updateHud();
  }

  updatePlayer(dt) {
    const forwardInput = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) + this.mobileMove.y;
    const sideInput = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) + this.mobileMove.x;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const move = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput));
    if (move.lengthSq() > 1) move.normalize();
    const speed = this.dashTime > 0 ? 14 : 6.2;
    this.player.position.addScaledVector(move, speed * dt);
    const bound = STORY[this.chapter].bounds;
    this.player.position.x = clamp(this.player.position.x, -bound, bound);
    this.player.position.z = clamp(this.player.position.z, -bound, bound);
    this.player.rotation.y = this.yaw;
    const bob = move.lengthSq() > .02 ? Math.sin(performance.now()*.012) * .055 : 0;
    this.player.position.y = bob;
  }

  updateCamera(dt) {
    const horizontalForward = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const desired = this.player.position.clone().addScaledVector(horizontalForward, -7.4).add(new THREE.Vector3(0, 3.7, 0));
    if (this.shake > 0) {
      desired.x += rand(-this.shake, this.shake); desired.y += rand(-this.shake, this.shake); desired.z += rand(-this.shake, this.shake);
      this.shake = Math.max(0, this.shake - dt * 2.8);
    }
    this.camera.position.lerp(desired, 1 - Math.pow(.001, dt));
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  updateWaves(dt) {
    if (this.boss || this.state !== 'playing') return;
    this.waveTimer -= dt;
    const cap = this.chapter === 0 ? 5 : this.chapter === 1 ? 7 : 8;
    if (this.waveTimer <= 0 && this.enemies.length < cap) {
      this.spawnWaveEnemy();
      this.waveTimer = Math.max(.55, 2.25 - this.chapter * .35 - this.levelKills * .035);
    }
  }

  updateEnemies(dt) {
    for (const enemy of [...this.enemies]) {
      if (enemy.dead) continue;
      const p = enemy.mesh.position;
      const toPlayer = this.player.position.clone().sub(p);
      const dist = Math.max(.001, toPlayer.length());
      const dir = toPlayer.multiplyScalar(1 / dist);
      enemy.attack -= dt;

      if (enemy.boss) this.updateBoss(enemy, dt, dist, dir);
      else if (enemy.ranged && dist > 5.5) {
        const tangent = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(enemy.strafe);
        p.addScaledVector(tangent, enemy.speed * .55 * dt);
        p.addScaledVector(dir, enemy.speed * .15 * dt);
        if (enemy.attack <= 0) { this.enemyShoot(enemy, dir, enemy.type === 'grape' ? 0x9c6cff : 0x82502e); enemy.attack = rand(1.3, 2.2); }
      } else {
        p.addScaledVector(dir, enemy.speed * dt);
        if (dist < enemy.radius + .9 && enemy.attack <= 0) { this.damagePlayer(enemy.damage, enemy.type === 'poo' ? 'POO IMPACT' : 'VITAMIN CONTAMINATION'); enemy.attack = .95; p.addScaledVector(dir, -1.1); }
      }
      enemy.mesh.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
      enemy.mesh.position.y = Math.sin(performance.now()*.004 + this.enemies.indexOf(enemy)) * .08;
    }
  }

  updateBoss(enemy, dt, dist, dir) {
    const ratio = enemy.hp / enemy.maxHp;
    const nextPhase = ratio < .34 ? 3 : ratio < .68 ? 2 : 1;
    if (nextPhase !== enemy.phase) {
      enemy.phase = nextPhase;
      this.ui.bossPhase.textContent = `PHASE ${nextPhase}`;
      this.toast(`PHASE ${nextPhase}`, enemy.type === 'apple' ? (nextPhase === 2 ? 'CORE MELTDOWN' : 'DOCTOR MODE') : (nextPhase === 2 ? 'ROYAL FLUSH' : 'SEWER RAGE'));
      this.burst(enemy.mesh.position, enemy.type === 'apple' ? 0xff514c : 0x78411f, 26, 1.4);
      for (let i = 0; i < 2 + nextPhase; i++) this.spawnEnemy(enemy.type === 'apple' ? choice(['grape','orange']) : 'poo');
      enemy.attack = .4;
    }
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(enemy.strafe);
    if (enemy.type === 'apple') {
      enemy.mesh.position.addScaledVector(tangent, enemy.speed * (.55 + enemy.phase*.15) * dt);
      enemy.mesh.position.addScaledVector(dir, (dist > 12 ? 1 : -1) * enemy.speed * .25 * dt);
      if (enemy.attack <= 0) {
        if (enemy.phase === 1) this.enemyShoot(enemy, dir, 0xff514c, 1);
        else if (enemy.phase === 2) for (let a=-1;a<=1;a++) this.enemyShoot(enemy, dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a*.18),0xff514c,1.2);
        else for (let a=0;a<8;a++) this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/8),0,-Math.cos(a*TAU/8)),0xff9d38,1.45);
        enemy.attack = enemy.phase === 3 ? .75 : 1.15;
      }
    } else {
      enemy.mesh.position.addScaledVector(dir, (dist > 9 ? 1 : -.4) * enemy.speed * (1 + enemy.phase*.1) * dt);
      if (enemy.attack <= 0) {
        if (enemy.phase === 1) this.enemyShoot(enemy, dir, 0x7a431f, 1.2);
        else if (enemy.phase === 2) for (let a=-2;a<=2;a++) this.enemyShoot(enemy,dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a*.14),0x9b5a2c,1.3);
        else {
          for (let a=0;a<12;a++) this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/12),0,-Math.cos(a*TAU/12)),0xd17a31,1.55);
          this.shake = .22;
        }
        enemy.attack = enemy.phase === 3 ? .68 : 1.05;
      }
      if (dist < enemy.radius + 1 && enemy.attack <= .1) this.damagePlayer(enemy.damage, 'ROYAL POO IMPACT');
    }
  }

  enemyShoot(enemy, direction, color, speedMul = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(enemy.boss ? .26 : .16, 10, 8), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(enemy.mesh.position).add(new THREE.Vector3(0, enemy.boss ? 1.7 : .8, 0));
    const velocity = direction.clone().normalize().multiplyScalar((enemy.boss ? 10 : 7.5) * speedMul);
    this.enemyProjectiles.push({ mesh, velocity, life: 6, damage: enemy.damage * (enemy.boss ? .75 : .65), radius: enemy.boss ? .34 : .22 });
    this.fxLayer.add(mesh);
    this.sound(enemy.boss ? 105 : 145, .08, 'sawtooth', .025);
  }

  updateProjectiles(dt) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.mesh.position.addScaledVector(p.velocity, dt); p.life -= dt;
      if (p.mesh.position.distanceTo(this.player.position.clone().add(new THREE.Vector3(0,1,0))) < p.radius + .68) {
        this.damagePlayer(p.damage, 'PROJECTILE IMPACT'); p.life = 0;
      }
      if (p.life <= 0) { this.fxLayer.remove(p.mesh); this.enemyProjectiles.splice(i,1); }
    }
  }

  updatePickups(dt) {
    for (let i=this.pickups.length-1;i>=0;i--) {
      const p=this.pickups[i]; p.life-=dt; p.mesh.rotation.y+=dt*1.5; p.mesh.position.y=.75+Math.sin(performance.now()*.004+i)*.18;
      if (p.mesh.position.distanceTo(this.player.position)<1.45) { this.collectPickup(p); this.actorLayer.remove(p.mesh); this.pickups.splice(i,1); }
      else if (p.life<=0) { this.actorLayer.remove(p.mesh); this.pickups.splice(i,1); }
    }
  }

  collectPickup(p) {
    if (p.type === 'burger') { this.power.burger = Math.min(3, this.power.burger + 1); this.toast('PICKUP', 'BURGER MEDKIT'); }
    if (p.type === 'pizza') { this.power.pizza = 12; this.toast('POWERUP', 'PIZZA SPREAD SHOT'); }
    if (p.type === 'candy') { this.power.candy = 10; this.toast('POWERUP', 'CANDY RAPID FIRE'); }
    this.score += 75; this.sound(640,.12,'square',.04); this.burst(p.mesh.position, p.type==='burger'?0xffc857:p.type==='pizza'?0xffd34d:0xff6da8,14,.6);
  }

  useBurger() {
    if (this.power.burger <= 0 || this.health >= this.maxHealth) return;
    this.power.burger--; this.health = Math.min(this.maxHealth, this.health + 40); this.toast('HEALED', 'BURGER MEDKIT'); this.sound(520,.22,'sine',.045);
  }

  dash() {
    if (this.dashCooldown > 0 || this.state !== 'playing') return;
    this.dashCooldown = 1.35; this.dashTime = .23; this.sound(220,.12,'square',.035); this.shake = .08;
  }

  shoot(now) {
    const cooldown = this.power.candy > 0 ? 78 : 175;
    if (now - this.lastShot < cooldown || this.overheated) return;
    this.lastShot = now;
    this.heat = Math.min(1, this.heat + (this.power.candy > 0 ? .045 : .085));
    if (this.heat >= .99) { this.overheated = true; this.toast('BLASTER', 'OVERHEATED'); }
    const offsets = this.power.pizza > 0 ? [-.025,0,.025] : [0];
    offsets.forEach((x) => this.fireRay(x));
    this.sound(this.power.candy > 0 ? 520 : 390,.045,'square',.026);
    this.shake = Math.max(this.shake,.025);
  }

  fireRay(offsetX) {
    this.raycaster.setFromCamera(new THREE.Vector2(offsetX,0),this.camera);
    const intersections=this.raycaster.intersectObjects(this.shootables,true);
    let hitPoint=this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction,55);
    let entity=null;
    for(const hit of intersections){
      const found=this.findEntity(hit.object);
      if(found && ((found.kind==='target') || found.mesh)){entity=found;hitPoint=hit.point;break}
    }
    const origin=new THREE.Vector3(); this.muzzle.getWorldPosition(origin);
    this.tracer(origin,hitPoint);
    if(entity){
      const damage=this.power.pizza>0?24:34;
      if(entity.kind==='target')this.damageTarget(entity,damage,hitPoint);else this.damageEnemy(entity,damage,hitPoint);
      this.ui.crosshair.classList.add('hit'); setTimeout(()=>this.ui.crosshair.classList.remove('hit'),75);
    } else this.burst(hitPoint,0xdfff39,2,.12);
  }

  findEntity(object) {
    let node=object;
    while(node){if(node.userData?.entity)return node.userData.entity;node=node.parent}
    return null;
  }

  damageEnemy(enemy,amount,point) {
    if(enemy.dead)return;
    enemy.hp-=amount; this.score+=Math.round(amount);
    this.burst(point,enemy.type==='poo'?0x78411f:enemy.type==='apple'?0xff514c:0x9a68db,6,.28);
    if(enemy.boss){this.shake=.06;this.updateBossHud()}
    if(enemy.hp<=0)this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    enemy.dead=true;
    this.burst(enemy.mesh.position,enemy.type==='poo'?0x78411f:0xff6d65,22,enemy.boss?1.4:.75);
    this.sound(enemy.boss?70:190,enemy.boss?.65:.18,'sawtooth',enemy.boss?.09:.035);
    this.actorLayer.remove(enemy.mesh);
    this.enemies=this.enemies.filter(e=>e!==enemy);
    this.shootables=this.shootables.filter(m=>m!==enemy.mesh);
    this.score+=enemy.boss?5000:150;
    if(enemy.boss){
      this.boss=null; this.ui.bossHud.hidden=true;
      setTimeout(()=>this.completeChapter(),900);
    }else{
      this.levelKills++;
      if(Math.random()<.24)this.spawnPickup(choice(['burger','pizza','candy']),enemy.mesh.position.clone());
      this.checkObjective();
    }
  }

  damageTarget(target,amount,point) {
    target.userData.hp-=amount;
    this.burst(point,0x66d8ff,8,.3); this.shake=.04;
    if(target.userData.hp<=0){
      this.burst(target.position,0x66d8ff,32,1.1); this.sound(95,.55,'sawtooth',.075);
      this.actorLayer.remove(target);
      this.targets=this.targets.filter(t=>t!==target); this.shootables=this.shootables.filter(m=>m!==target);
      this.score+=700; this.checkObjective();
    }
  }

  checkObjective() {
    if(this.chapter===0 && this.levelKills>=STORY[0].target)this.completeChapter();
    else if(this.chapter===1 && this.targets.length===0 && !this.bossStarted)this.startBoss('apple');
    else if(this.chapter===2 && this.levelKills>=STORY[2].target && !this.bossStarted)this.startBoss('poo');
    this.updateObjective();
  }

  updateObjective() {
    const chapter=STORY[this.chapter];
    if(this.boss){
      this.ui.objectiveTitle.textContent=`Defeat ${this.boss.type==='apple'?'Doctor Apple':'King Poo'}`;
      this.ui.objectiveProgress.textContent=`PHASE ${this.boss.phase}`;
    }else if(this.chapter===1){
      this.ui.objectiveTitle.textContent=chapter.objective;
      this.ui.objectiveProgress.textContent=`${chapter.target-this.targets.length} / ${chapter.target}`;
    }else{
      this.ui.objectiveTitle.textContent=chapter.objective;
      this.ui.objectiveProgress.textContent=`${Math.min(this.levelKills,chapter.target)} / ${chapter.target}`;
    }
  }

  completeChapter() {
    if(this.state!=='playing')return;
    this.state='transition';
    this.fireHeld=false;
    if(document.pointerLockElement)document.exitPointerLock();
    this.writeSave(Math.min(this.chapter+1,STORY.length-1));
    this.showDialogue(STORY[this.chapter].outro,()=>{
      if(this.chapter<STORY.length-1)this.enterChapter(this.chapter+1,true);
      else this.showEnding();
    });
  }

  showEnding() {
    this.state='ending'; this.hideAllScreens(); this.ui.endingScreen.classList.add('active'); this.ui.finalStoryScore.textContent=String(this.score).padStart(6,'0'); localStorage.removeItem('cooperStorySave'); this.updateContinueButton();
  }

  damagePlayer(amount,reason) {
    if(this.dashTime>0||this.state!=='playing')return;
    this.health=Math.max(0,this.health-amount); this.shake=.22; this.ui.damageVignette.classList.add('flash'); setTimeout(()=>this.ui.damageVignette.classList.remove('flash'),120); this.sound(80,.25,'sawtooth',.065);
    if(this.health<=0)this.gameOver(reason);
  }

  gameOver(reason) {
    this.state='gameover'; this.fireHeld=false; if(document.pointerLockElement)document.exitPointerLock();
    this.ui.gameOverTitle.textContent=reason==='POO IMPACT'||reason.includes('POO')?'COOPER GOT POOED':'COOPER GOT VITAMINED';
    this.ui.gameOverCopy.textContent=reason.includes('POO')?'The royal sewer forces have achieved an extremely embarrassing victory.':'This outcome was medically responsible and therefore unacceptable.';
    this.hideAllScreens(); this.ui.gameOverScreen.classList.add('active');
  }

  pause() {
    if(this.state!=='playing')return;
    this.state='paused';this.fireHeld=false;if(document.pointerLockElement)document.exitPointerLock();this.hideAllScreens();this.ui.pauseScreen.classList.add('active');
  }

  resume() {
    if(this.state!=='paused')return;
    this.hideAllScreens();this.state='playing';
  }

  updateBossHud() {
    if(!this.boss)return;
    this.ui.bossFill.style.transform=`scaleX(${clamp(this.boss.hp/this.boss.maxHp,0,1)})`;
  }

  updateHud() {
    this.ui.healthText.textContent=Math.ceil(this.health);
    this.ui.healthFill.style.transform=`scaleX(${this.health/this.maxHealth})`;
    this.ui.heatFill.style.width=`${this.heat*100}%`;
    this.ui.heatText.textContent=this.overheated?'OVERHEATED':this.heat>.75?'HOT':'READY';
    this.ui.burgerCount.textContent=this.power.burger;
    this.ui.pizzaTimer.textContent=this.power.pizza>0?`${Math.ceil(this.power.pizza)}s`:'-';
    this.ui.candyTimer.textContent=this.power.candy>0?`${Math.ceil(this.power.candy)}s`:'-';
    document.querySelector('[data-power="burger"]').classList.toggle('active',this.power.burger>0);
    document.querySelector('[data-power="pizza"]').classList.toggle('active',this.power.pizza>0);
    document.querySelector('[data-power="candy"]').classList.toggle('active',this.power.candy>0);
    this.updateBossHud();
  }

  tracer(from,to) {
    const geometry=new THREE.BufferGeometry().setFromPoints([from,to]);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xdfff39,transparent:true,opacity:.95}));
    this.fxLayer.add(line);this.fx.push({mesh:line,life:.055,max:.055,type:'fade'});
    const flash=new THREE.PointLight(0xdfff39,5,4,2);flash.position.copy(from);this.fxLayer.add(flash);this.fx.push({mesh:flash,life:.045,max:.045,type:'fade'});
  }

  burst(position,color,count=8,size=.4) {
    for(let i=0;i<count;i++){
      const mesh=new THREE.Mesh(new THREE.TetrahedronGeometry(rand(.03,.1)*size*2,0),new THREE.MeshBasicMaterial({color,transparent:true}));
      mesh.position.copy(position);this.fxLayer.add(mesh);
      const velocity=new THREE.Vector3(rand(-1,1),rand(.1,1.4),rand(-1,1)).normalize().multiplyScalar(rand(2,7)*size);
      this.fx.push({mesh,velocity,life:rand(.25,.7),max:.7,type:'particle'});
    }
  }

  updateFx(dt) {
    for(let i=this.fx.length-1;i>=0;i--){
      const f=this.fx[i];f.life-=dt;
      if(f.type==='particle'){f.velocity.y-=5*dt;f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.rotation.x+=dt*8;f.mesh.material.opacity=clamp(f.life/f.max,0,1)}
      else if(f.mesh.material)f.mesh.material.opacity=clamp(f.life/f.max,0,1);
      if(f.life<=0){this.fxLayer.remove(f.mesh);if(f.mesh.geometry)f.mesh.geometry.dispose();if(f.mesh.material)f.mesh.material.dispose?.();this.fx.splice(i,1)}
    }
  }

  sound(freq,duration,type='sine',volume=.03) {
    try{
      this.audio ||= new (window.AudioContext||window.webkitAudioContext)();
      const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);g.gain.setValueAtTime(volume,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);
    }catch{}
  }

  renderIdleScene(dt) {
    if(this.state==='title'){
      this.player.rotation.y+=dt*.18;
      this.camera.position.lerp(new THREE.Vector3(7,4.2,10),.02);
      this.camera.lookAt(0,1,0);
    }
  }

  loop(now) {
    const dt=Math.min((now-this.lastTime)/1000,.034);this.lastTime=now;
    this.update(dt,now);this.renderIdleScene(dt);
    this.composer.render();requestAnimationFrame((t)=>this.loop(t));
  }
}

new CooperGame();
