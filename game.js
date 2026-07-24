import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const TAU = Math.PI * 2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const STORY = [
  {
    kicker: 'CHAPTER ONE', title: 'SNACKTOWN FALLS', subtitle: 'The fruit has crossed the line.',
    objective: 'Defeat the Fruit Patrol', target: 8, bounds: 22,
    intro: [
      ['NARRATOR', 'At 8:03 AM, Snacktown outlawed burgers, pizza and candy. Society immediately collapsed.'],
      ['MAYOR NUGGET', 'Cooper, the Fruit Patrol has occupied the town square. Please do something irresponsible.'],
      ['COOPER', 'Finally. A job I am qualified for.']
    ],
    outro: [
      ['MAYOR NUGGET', 'The square is clear, but something terrible is drifting in from the industrial district.'],
      ['COOPER', 'Is that smoke?'],
      ['NARRATOR', 'It was not smoke. It was Zackbell.']
    ]
  },
  {
    kicker: 'CHAPTER TWO', title: 'THE STINKWORKS', subtitle: 'Zackbell has not discovered deodorant.',
    objective: 'Clear the Stink Gang', target: 7, bounds: 24,
    intro: [
      ['ZACKBELL', 'Welcome to my district, Cooper. Every breath makes me stronger.'],
      ['COOPER', 'I thought the sewer was leaking. This is somehow worse.'],
      ['ZACKBELL', 'Prepare for maximum stink.'],
      ['COOPER', 'Prepare for maximum ventilation.']
    ],
    outro: [
      ['ZACKBELL', 'Impossible... my legendary smell... defeated...'],
      ['COOPER', 'Soap exists, Zackbell. Look into it.'],
      ['NARRATOR', 'Behind Zackbell was a delivery docket from the Wellness Laboratory.']
    ]
  },
  {
    kicker: 'CHAPTER THREE', title: 'THE WELLNESS LAB', subtitle: 'Destroy the machines making everything healthy.',
    objective: 'Destroy the Vitamin Reactors', target: 3, bounds: 25,
    intro: [
      ['DOCTOR APPLE', 'Welcome, Cooper. Soon every meal will contain a balanced serving of nutrients.'],
      ['COOPER', 'That is the most evil sentence I have ever heard.'],
      ['DOCTOR APPLE', 'My reactors are already converting the town. You cannot stop progress.'],
      ['COOPER', 'I have a rifle and no understanding of consequences. Watch me.']
    ],
    outro: [
      ['DOCTOR APPLE', 'Impossible... defeated by saturated fat...'],
      ['COOPER', 'And poor decision-making. Do not forget that.'],
      ['NARRATOR', 'Beneath Snacktown, the Sewer Throne began to shake.']
    ]
  },
  {
    kicker: 'FINAL CHAPTER', title: 'THE SEWER THRONE', subtitle: 'King Poo has been waiting.',
    objective: 'Survive the Sewer Guard', target: 10, bounds: 23,
    intro: [
      ['KING POO', 'Cooper. You have eaten your way through my entire operation.'],
      ['COOPER', 'I did not eat the fruit. I want that officially recorded.'],
      ['KING POO', 'Every snack in Snacktown will become suspiciously brown.'],
      ['COOPER', 'This ends now. Mostly because the website needs a final boss.']
    ],
    outro: [
      ['KING POO', 'No... my perfectly disgusting empire...'],
      ['COOPER', 'Flush twice next time.'],
      ['NARRATOR', 'Snacktown was saved. Zackbell was ventilated. No lessons were learned.']
    ]
  }
];

class CooperGameV2 {
  constructor() {
    this.canvas = document.querySelector('#gameCanvas');
    this.root = document.querySelector('#gameRoot');
    this.ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));

    this.isTouch = matchMedia('(pointer:coarse)').matches;
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    this.quality = localStorage.cooperQuality || (this.isTouch || memory <= 4 || cores <= 4 ? 'LOW' : memory >= 8 && cores >= 8 ? 'HIGH' : 'MEDIUM');
    this.maxPixelRatio = this.quality === 'HIGH' ? 1.35 : this.quality === 'MEDIUM' ? 1.1 : .85;
    this.pixelRatio = Math.min(devicePixelRatio || 1, this.maxPixelRatio);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, .08, 160);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality !== 'LOW', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality !== 'LOW';
    this.renderer.shadowMap.type = this.quality === 'HIGH' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

    this.world = new THREE.Group();
    this.actors = new THREE.Group();
    this.effects = new THREE.Group();
    this.scene.add(this.world, this.actors, this.effects);

    this.raycaster = new THREE.Raycaster();
    this.materials = this.makeMaterials();
    this.geometry = this.makeSharedGeometry();
    this.projectileMaterials = new Map();

    this.state = 'title';
    this.chapter = 0;
    this.score = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.heat = 0;
    this.overheated = false;
    this.lastShot = 0;
    this.fireHeld = false;
    this.recoil = 0;
    this.shake = 0;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.power = { burger: 0, pizza: 0, candy: 0 };

    this.keys = {};
    this.mobileMove = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = -.12;
    this.enemies = [];
    this.targets = [];
    this.pickups = [];
    this.projectiles = [];
    this.fx = [];
    this.shootables = [];
    this.levelKills = 0;
    this.waveTimer = 0;
    this.boss = null;
    this.bossStarted = false;
    this.dialogueQueue = [];
    this.dialogueDone = null;

    this.lastTime = performance.now();
    this.hudTimer = 0;
    this.fpsTime = 0;
    this.fpsFrames = 0;
    this.avgFps = 60;
    this.tmpA = new THREE.Vector3();
    this.tmpB = new THREE.Vector3();
    this.tmpC = new THREE.Vector3();

    this.buildPlayer();
    this.bindEvents();
    this.resize();
    this.updateContinueButton();
    this.backToTitle();
    this.fakeLoad();
    requestAnimationFrame((t) => this.loop(t));
  }

  makeMaterials() {
    const pbr = (color, roughness = .72, metalness = .04, emissive = 0x000000, emissiveIntensity = .25) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity });
    return {
      ink: pbr(0x111419, .76, .08), cream: pbr(0xf0e3c4), yellow: pbr(0xffc857), lime: pbr(0xdfff39, .48, .12, 0x263300, .3),
      red: pbr(0xe94f48), green: pbr(0x4c9949), purple: pbr(0x8958c9), orange: pbr(0xe88738),
      brown: pbr(0x70401f), darkBrown: pbr(0x342018), pink: pbr(0xf95f9d, .42, .1, 0x25000f, .25), cyan: pbr(0x5ecbe7, .3, .18, 0x062e3a, .32),
      concrete: pbr(0x48505a, .92, .03), lab: pbr(0xd6dfdd, .58, .08), sewer: pbr(0x25352d, .9, .02), gold: pbr(0xd6ae42, .3, .72), white: pbr(0xffffff, .5, .02),
      gunmetal: pbr(0x2b3138, .26, .84), steel: pbr(0x737e88, .2, .9), rubber: pbr(0x0e1114, .92, .01), skin: pbr(0xd0a079, .74, .01)
    };
  }

  makeSharedGeometry() {
    return {
      projectile: new THREE.SphereGeometry(.16, 8, 6),
      bossProjectile: new THREE.SphereGeometry(.24, 8, 6),
      eye: new THREE.SphereGeometry(.07, 8, 6),
      cloud: new THREE.SphereGeometry(.55, 8, 6)
    };
  }

  fakeLoad() {
    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + rand(10, 22));
      this.ui.loadingFill.style.width = `${progress}%`;
      if (progress > 35) this.ui.loadingText.textContent = `SELECTING ${this.quality} GRAPHICS...`;
      if (progress > 72) this.ui.loadingText.textContent = 'VENTILATING ZACKBELL...';
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => this.ui.loadingScreen.classList.add('hidden'), 180);
      }
    }, 90);
  }

  buildPlayer() {
    const p = new THREE.Group();
    p.position.set(0, 0, 7);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.62, .9, 6, 12), this.materials.yellow);
    body.position.y = 1.08;
    body.castShadow = this.quality !== 'LOW';
    p.add(body);

    for (const x of [-.22, .22]) {
      const eye = new THREE.Mesh(this.geometry.eye, this.materials.ink);
      eye.position.set(x, 1.34, -.58);
      p.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.19, .045, 6, 16, Math.PI), this.materials.ink);
    mouth.rotation.set(Math.PI / 2, 0, Math.PI);
    mouth.position.set(0, 1.12, -.61);
    p.add(mouth);

    for (const x of [-.3, .3]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.12, .55, 4, 7), this.materials.ink);
      leg.position.set(x, .35, 0);
      leg.castShadow = this.quality !== 'LOW';
      p.add(leg);
    }

    this.weapon = this.createRifle();
    this.weapon.position.set(.62, 1.12, -.18);
    this.weapon.rotation.y = -.04;
    p.add(this.weapon);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(.8, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .012;
    p.add(shadow);

    this.player = p;
    this.actors.add(p);
  }

  createRifle() {
    const g = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.38, .3, .94), this.materials.gunmetal); receiver.position.z = -.43;
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(.3, .24, .78), this.materials.ink); handguard.position.z = -1.22;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.064, .064, 1.24, 10), this.materials.steel); barrel.rotation.x = Math.PI / 2; barrel.position.z = -2.02;
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .3, 10), this.materials.gunmetal); brake.rotation.x = Math.PI / 2; brake.position.z = -2.78;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.4, .42, .7), this.materials.rubber); stock.position.set(0, .01, .56); stock.rotation.x = -.1;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.18, .5, .22), this.materials.rubber); grip.position.set(0, -.35, -.08); grip.rotation.x = -.28;
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(.24, .52, .32), this.materials.gunmetal); magazine.position.set(0, -.4, -.52); magazine.rotation.x = .16;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.26, .06, .84), this.materials.steel); rail.position.set(0, .23, -.46);
    const optic = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .44, 12), this.materials.gunmetal); optic.rotation.x = Math.PI / 2; optic.position.set(0, .39, -.5);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x66d8ff, roughness: .06, metalness: .06, transmission: .2, transparent: true, opacity: .72 });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.145, .145, .035, 12), lensMat); lens.rotation.x = Math.PI / 2; lens.position.set(0, .39, -.73);
    const cell = new THREE.Mesh(new THREE.BoxGeometry(.13, .13, .45), this.materials.cyan); cell.position.set(.21, .02, -.44);
    this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0, .01, -2.95);
    this.muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(.18, .55, 8), new THREE.MeshBasicMaterial({ color: 0xffd56a, transparent: true, opacity: 0, depthWrite: false }));
    this.muzzleFlash.rotation.x = -Math.PI / 2; this.muzzleFlash.position.set(0, .01, -3.02);
    g.add(receiver, handguard, barrel, brake, stock, grip, magazine, rail, optic, lens, cell, this.muzzle, this.muzzleFlash);
    g.traverse((o) => { if (o.isMesh) o.castShadow = this.quality !== 'LOW'; });
    return g;
  }

  bindEvents() {
    addEventListener('resize', () => this.resize());
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      if (this.state === 'dialogue' && (e.code === 'Space' || e.code === 'Enter')) this.advanceDialogue();
      else if (e.code === 'Escape' && this.state === 'playing') this.pause();
      else if (e.code === 'KeyE' && this.state === 'playing') this.useBurger();
      else if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.state === 'playing') this.dash();
      else if (e.code === 'Space' && this.state === 'playing') this.fireHeld = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; if (e.code === 'Space') this.fireHeld = false; });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas && this.state === 'playing') {
        this.yaw -= e.movementX * .0021;
        this.pitch = clamp(this.pitch - e.movementY * .0018, -.52, .34);
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || this.state !== 'playing') return;
      if (document.pointerLockElement !== this.canvas && !this.isTouch) this.canvas.requestPointerLock();
      else this.fireHeld = true;
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.fireHeld = false; });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.state === 'playing' && !this.isTouch) this.pause();
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
      this.ui.moveStick.style.transform = `translate(${x * scale}px,${y * scale}px)`;
      this.mobileMove.set(clamp(x / max, -1, 1), clamp(-y / max, -1, 1));
    };
    zone.addEventListener('pointerdown', (e) => { moveId = e.pointerId; zone.setPointerCapture(moveId); updateStick(e); });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === moveId) updateStick(e); });
    const stopMove = (e) => { if (e.pointerId !== moveId) return; moveId = null; this.mobileMove.set(0,0); this.ui.moveStick.style.transform = ''; };
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
  }

  readSave() { try { return JSON.parse(localStorage.getItem('cooperStorySaveV2')); } catch { return null; } }
  writeSave(chapter) { localStorage.setItem('cooperStorySaveV2', JSON.stringify({ chapter, score: this.score })); this.updateContinueButton(); }
  updateContinueButton() {
    const save = this.readSave();
    this.ui.continueButton.disabled = !save;
    this.ui.continueButton.textContent = save ? `CONTINUE CHAPTER ${(save.chapter || 0) + 1}` : 'NO SAVE YET';
  }
  newGame() { localStorage.removeItem('cooperStorySaveV2'); this.score = 0; this.enterChapter(0, true); }
  continueGame() { const save = this.readSave(); this.score = save?.score || 0; this.enterChapter(clamp(save?.chapter || 0, 0, STORY.length - 1), true); }

  hideAllScreens() { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); }

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
    this.waveTimer = .8;
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

  clearLevel() {
    for (const group of [this.world, this.actors, this.effects]) {
      [...group.children].forEach((child) => { if (child !== this.player) group.remove(child); });
    }
    if (!this.actors.children.includes(this.player)) this.actors.add(this.player);
    this.enemies = []; this.targets = []; this.pickups = []; this.projectiles = []; this.fx = []; this.shootables = [];
    this.scene.fog = null;
    this.ui.bossHud.hidden = true;
  }

  buildLevel(index) {
    const colors = [0x91bed0, 0x59634d, 0x8bbd7a, 0x151d1b];
    this.scene.background = new THREE.Color(colors[index]);
    this.scene.fog = new THREE.FogExp2(colors[index], index === 3 ? .026 : .014);
    const hemi = new THREE.HemisphereLight(index === 3 ? 0x6da492 : 0xc8edff, index === 3 ? 0x16221c : 0x50543b, index === 3 ? 1.2 : 1.8);
    const sun = new THREE.DirectionalLight(index === 3 ? 0xb5ffe2 : 0xfff0cf, index === 3 ? 1.7 : 2.35);
    sun.position.set(-12, 19, 9);
    sun.castShadow = this.quality !== 'LOW';
    if (sun.castShadow) {
      const shadowSize = this.quality === 'HIGH' ? 1024 : 512;
      sun.shadow.mapSize.set(shadowSize, shadowSize);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
      sun.shadow.camera.right = sun.shadow.camera.top = 30;
      sun.shadow.bias = -.0015;
    }
    this.world.add(hemi, sun);
    if (index === 0) this.buildSnacktown();
    else if (index === 1) this.buildStinkworks();
    else if (index === 2) this.buildLab();
    else this.buildSewer();
  }

  ground(material, size = 58) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = this.quality !== 'LOW';
    this.world.add(mesh);
    return mesh;
  }

  box(x, y, z, sx, sy, sz, material, parent = this.world, shadows = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    m.position.set(x,y,z);
    m.castShadow = shadows && this.quality !== 'LOW';
    m.receiveShadow = shadows && this.quality !== 'LOW';
    parent.add(m);
    return m;
  }

  buildSnacktown() {
    this.ground(this.materials.concrete, 64);
    const road = new THREE.MeshStandardMaterial({ color: 0x23282e, roughness: .96 });
    this.box(0,.02,0,14,.04,60,road,this.world,false);
    for (let z=-26;z<=26;z+=5) this.box(0,.05,z,.18,.03,2.2,this.materials.yellow,this.world,false);
    for (const side of [-1,1]) {
      for (let i=-3;i<=3;i++) {
        const h = rand(4.5,8.5);
        this.box(side*rand(15,19),h/2,i*8+rand(-1,1),rand(5,7),h,rand(5,7),pick([this.materials.cream,this.materials.brown,this.materials.concrete]));
      }
    }
    const statue = new THREE.Group();
    this.box(0,.7,-7,3.2,1.4,3.2,this.materials.cream,statue);
    const burger = this.createBurger(.95); burger.position.y=2.2; burger.scale.setScalar(2.2); statue.add(burger); this.world.add(statue);
    const lampCount = this.quality === 'LOW' ? 6 : 10;
    for(let i=0;i<lampCount;i++) {
      const z=-24+i*(48/Math.max(1,lampCount-1)), x=i%2?-7.5:7.5;
      this.box(x,1.2,z,.12,2.4,.12,this.materials.ink);
      this.box(x,2.45,z,.35,.16,.35,this.materials.lime,this.world,false);
      if(this.quality==='HIGH'&&i%2===0){const l=new THREE.PointLight(0xdfff39,1.1,7,2);l.position.set(x,2.5,z);this.world.add(l);}
    }
  }

  buildStinkworks() {
    this.ground(this.materials.concrete,64);
    const road=new THREE.MeshStandardMaterial({color:0x20252a,roughness:.94,metalness:.04});
    this.box(0,.03,0,18,.06,60,road,this.world,false);
    for(const side of [-1,1]) for(let z=-24;z<=24;z+=8){
      this.box(side*11,2.7,z,5,5.4,6,pick([this.materials.concrete,this.materials.darkBrown,this.materials.ink]));
      const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,4.6,10),this.materials.concrete);pipe.rotation.z=Math.PI/2;pipe.position.set(side*8.8,2.1,z);this.world.add(pipe);
    }
    const gasMat=new THREE.MeshBasicMaterial({color:0x82c85c,transparent:true,opacity:.25,depthWrite:false});
    for(let i=0;i<(this.quality==='LOW'?6:11);i++){
      const cloud=new THREE.Mesh(this.geometry.cloud,gasMat);cloud.scale.set(rand(1,2.1),rand(.5,1),rand(1,2.1));cloud.position.set(rand(-9,9),rand(.5,2.4),rand(-24,24));cloud.userData.drift=rand(.12,.3);this.world.add(cloud);
    }
    this.box(0,3,-23,16,6,3,this.materials.darkBrown);
    this.box(0,5.3,-21.45,9,1,.15,this.materials.lime,this.world,false);
  }

  buildLab() {
    this.ground(this.materials.green,66);
    const treeCount=this.quality==='LOW'?12:22;
    for(let i=0;i<treeCount;i++){
      const x=rand(-30,30),z=rand(-30,30);if(Math.abs(x)<9&&Math.abs(z)<12)continue;
      const tree=new THREE.Group();
      const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.25,.35,2.2,7),this.materials.brown);trunk.position.y=1.1;tree.add(trunk);
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.2,1.7),0),this.materials.green);crown.position.y=2.5;tree.add(crown);tree.position.set(x,0,z);this.world.add(tree);
    }
    this.box(0,.08,0,20,.16,30,this.materials.lab);
    for(const x of [-8.8,8.8])this.box(x,2.6,0,.5,5.2,31,this.materials.ink);
    [-7,7].forEach((x,i)=>this.spawnReactor(new THREE.Vector3(x,0,-6),i));
    this.spawnReactor(new THREE.Vector3(0,0,7),2);
    this.box(0,4,-19,22,8,8,this.materials.lab);
    this.box(0,5,-14.95,9,1.4,.2,this.materials.pink,this.world,false);
  }

  buildSewer() {
    this.ground(this.materials.sewer,58);
    const water=new THREE.Mesh(new THREE.PlaneGeometry(12,52),new THREE.MeshStandardMaterial({color:0x356e59,roughness:.3,metalness:.18,transparent:true,opacity:.78}));
    water.rotation.x=-Math.PI/2;water.position.y=.06;this.world.add(water);
    for(const x of [-9,9]){
      this.box(x,2.8,0,1.2,5.6,55,this.materials.concrete);
      for(let z=-24;z<=24;z+=8){const pipe=new THREE.Mesh(new THREE.TorusGeometry(1.2,.18,7,16,Math.PI),this.materials.brown);pipe.rotation.set(0,x<0?Math.PI/2:-Math.PI/2,0);pipe.position.set(x+(x<0?1:-1),2.8,z);this.world.add(pipe);}
    }
    for(let z=-24;z<=24;z+=5)this.box(0,.23,z,18,.24,1.7,this.materials.concrete);
    const throne=new THREE.Group();
    this.box(0,1,-18,7,2,5,this.materials.darkBrown,throne);
    this.box(0,3.7,-20,7,5.5,1.2,this.materials.darkBrown,throne);
    for(const x of [-3.2,3.2])this.box(x,3.7,-20,1.1,6.4,1.1,this.materials.gold,throne);
    this.world.add(throne);
  }

  startChapterPlay(){this.state='playing';this.root.classList.remove('cinematic');this.waveTimer=.35;this.updateObjective();this.toast('MISSION START',STORY[this.chapter].objective);}
  announce(chapter,done){this.root.classList.add('cinematic');this.ui.announcementKicker.textContent=chapter.kicker;this.ui.announcementTitle.textContent=chapter.title;this.ui.announcementSubtitle.textContent=chapter.subtitle;this.ui.announcement.hidden=false;setTimeout(()=>{this.ui.announcement.hidden=true;done();},1800);}
  showDialogue(lines,done){this.state='dialogue';this.root.classList.add('cinematic');this.dialogueQueue=lines.slice();this.dialogueDone=done;this.ui.dialogue.hidden=false;this.advanceDialogue();}
  advanceDialogue(){
    if(this.state!=='dialogue')return;
    if(!this.dialogueQueue.length){this.ui.dialogue.hidden=true;this.root.classList.remove('cinematic');const cb=this.dialogueDone;this.dialogueDone=null;if(cb)cb();return;}
    const [speaker,text]=this.dialogueQueue.shift();
    this.ui.dialogueSpeaker.textContent=speaker;this.ui.dialogueText.textContent=text;
    this.ui.dialoguePortrait.textContent=speaker==='COOPER'?'C':speaker==='KING POO'?'P':speaker==='DOCTOR APPLE'?'A':speaker==='ZACKBELL'?'Z':speaker==='MAYOR NUGGET'?'N':'!';
    this.ui.dialoguePortrait.style.background=speaker==='COOPER'?'#dfff39':speaker==='KING POO'?'#78411f':speaker==='DOCTOR APPLE'?'#ed4c47':speaker==='ZACKBELL'?'#82c85c':'#66d8ff';
    this.ui.dialoguePortrait.style.color=speaker==='KING POO'?'#fff':'#111';
    this.sound(320+Math.random()*100,.04,'square',.016);
  }
  toast(kicker,title){this.ui.announcementKicker.textContent=kicker;this.ui.announcementTitle.textContent=title;this.ui.announcementSubtitle.textContent='';this.ui.announcement.hidden=false;setTimeout(()=>this.ui.announcement.hidden=true,1050);}

  createBurger(scale=1){
    const g=new THREE.Group();
    const top=new THREE.Mesh(new THREE.SphereGeometry(.65*scale,14,9,0,TAU,0,Math.PI/2),this.materials.yellow);top.scale.y=.65;top.position.y=.22*scale;
    const patty=new THREE.Mesh(new THREE.CylinderGeometry(.64*scale,.64*scale,.2*scale,14),this.materials.brown);
    const lettuce=new THREE.Mesh(new THREE.CylinderGeometry(.68*scale,.68*scale,.1*scale,14),this.materials.green);lettuce.position.y=.13*scale;
    const bottom=new THREE.Mesh(new THREE.CylinderGeometry(.62*scale,.62*scale,.22*scale,14),this.materials.yellow);bottom.position.y=-.23*scale;
    g.add(top,patty,lettuce,bottom);return g;
  }
  createPizza(scale=1){const g=new THREE.Group();const slice=new THREE.Mesh(new THREE.ConeGeometry(.72*scale,1.2*scale,3),this.materials.yellow);slice.rotation.x=Math.PI/2;slice.rotation.z=Math.PI/2;const crust=new THREE.Mesh(new THREE.CylinderGeometry(.18*scale,.18*scale,1.25*scale,10),this.materials.orange);crust.rotation.z=Math.PI/2;crust.position.set(.48*scale,0,0);g.add(slice,crust);return g;}
  createCandy(scale=1){const g=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(.75*scale,.55*scale,.32*scale),this.materials.pink);for(const x of [-.58,.58]){const wrap=new THREE.Mesh(new THREE.ConeGeometry(.34*scale,.45*scale,4),this.materials.cyan);wrap.rotation.z=x<0?-Math.PI/2:Math.PI/2;wrap.position.x=x*scale;g.add(wrap);}g.add(core);return g;}

  createFruit(type,boss=false){
    const g=new THREE.Group(),s=boss?1.65:1,mat=type==='apple'?this.materials.red:type==='orange'?this.materials.orange:this.materials.purple;
    if(type==='grape')for(let y=0;y<3;y++)for(let x=0;x<3-y;x++){const grape=new THREE.Mesh(new THREE.SphereGeometry(.28*s,9,7),mat);grape.position.set((x-(2-y)/2)*.42*s,(1-y)*.38*s,0);g.add(grape);}
    else{const fruit=new THREE.Mesh(new THREE.SphereGeometry(.72*s,14,10),mat);fruit.scale.y=type==='apple'?.9:1;g.add(fruit);}
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.07*s,.09*s,.42*s,7),this.materials.brown);stem.position.y=.72*s;stem.rotation.z=-.2;g.add(stem);
    for(const x of [-.22,.22]){const e=new THREE.Mesh(this.geometry.eye,this.materials.ink);e.scale.setScalar(s);e.position.set(x*s,.1*s,-.66*s);g.add(e);}
    if(boss){
      for(const x of [-.25,.25]){const lens=new THREE.Mesh(new THREE.TorusGeometry(.19,.035,5,14),this.materials.ink);lens.position.set(x,.1,-.98);lens.rotation.x=Math.PI/2;lens.scale.setScalar(s);g.add(lens);}
      const coat=new THREE.Mesh(new THREE.CylinderGeometry(.65*s,.9*s,1.6*s,12),this.materials.white);coat.position.y=-1.2*s;g.add(coat);
    }
    g.traverse((o)=>{if(o.isMesh)o.castShadow=this.quality!=='LOW';});return g;
  }

  createPoo(boss=false){
    const g=new THREE.Group(),s=boss?1.8:1;
    [[0,.0,.72],[0,.55,.58],[0,1.02,.4],[0,1.37,.24]].forEach(([x,y,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r*s,14,9),this.materials.brown);m.scale.y=.7;m.position.set(x,y*s,0);m.castShadow=this.quality!=='LOW';g.add(m);});
    for(const x of [-.22,.22]){const e=new THREE.Mesh(this.geometry.eye,this.materials.ink);e.scale.setScalar(s);e.position.set(x*s,.65*s,-.55*s);g.add(e);}
    if(boss){const crown=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(.55*s,.55*s,.22*s,10),this.materials.gold);crown.add(base);for(let i=0;i<5;i++){const point=new THREE.Mesh(new THREE.ConeGeometry(.16*s,.55*s,5),this.materials.gold);point.position.set((i-2)*.24*s,.32*s,0);crown.add(point);}crown.position.y=1.95*s;g.add(crown);}
    return g;
  }

  createZackbell(){
    const g=new THREE.Group();
    const hoodie=new THREE.MeshStandardMaterial({color:0x3f8247,roughness:.84});
    const gas=new THREE.MeshBasicMaterial({color:0x82c85c,transparent:true,opacity:.28,depthWrite:false});
    const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.78,1.35,7,12),hoodie);torso.position.y=1.45;g.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.76,14,10),this.materials.skin);head.position.y=3.2;g.add(head);
    const hood=new THREE.Mesh(new THREE.TorusGeometry(.82,.14,7,16),this.materials.darkBrown);hood.rotation.x=Math.PI/2;hood.position.y=3.18;g.add(hood);
    for(const x of [-.24,.24]){const eye=new THREE.Mesh(this.geometry.eye,this.materials.ink);eye.position.set(x,3.28,-.68);g.add(eye);}
    const mask=new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.38,9),this.materials.concrete);mask.rotation.x=Math.PI/2;mask.position.set(0,3,-.72);g.add(mask);
    for(const x of [-.42,.42]){const filter=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.2,9),this.materials.ink);filter.rotation.x=Math.PI/2;filter.position.set(x,2.98,-.65);g.add(filter);}
    for(const x of [-.43,.43]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.2,.75,5,8),this.materials.ink);leg.position.set(x,.48,0);g.add(leg);}
    for(let i=0;i<5;i++){const cloud=new THREE.Mesh(this.geometry.cloud,gas);cloud.userData.stinkOrbit=i*TAU/5;g.add(cloud);}
    g.traverse((o)=>{if(o.isMesh)o.castShadow=this.quality!=='LOW';});return g;
  }

  spawnReactor(position,index){
    const group=new THREE.Group();
    const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.5,.7,10),this.materials.ink);base.position.y=.35;
    const core=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,3.2,12),this.materials.cyan);core.position.y=2.15;
    const cage=new THREE.Mesh(new THREE.TorusGeometry(.95,.11,7,18),this.materials.pink);cage.position.y=2.2;cage.rotation.x=Math.PI/2;
    const top=new THREE.Mesh(new THREE.ConeGeometry(1.3,1.2,10),this.materials.ink);top.position.y=4.15;
    group.add(base,core,cage,top);group.position.copy(position);
    const target={kind:'target',mesh:group,type:'reactor',hp:150,maxHp:150,index};
    group.userData.entity=target;group.traverse((o)=>{if(o.isMesh){o.userData.entity=target;o.castShadow=this.quality!=='LOW';}});
    this.actors.add(group);this.targets.push(target);this.shootables.push(group);
  }

  spawnEnemy(type,position=null,boss=false){
    let mesh,stats;
    if(type==='zackbell'){mesh=this.createZackbell();stats={hp:900,speed:2.45,damage:18,radius:1.9,ranged:true};}
    else if(type==='apple'){mesh=this.createFruit('apple',boss);stats=boss?{hp:760,speed:2.5,damage:18,radius:1.9,ranged:true}:{hp:42,speed:3.5,damage:10,radius:.72};}
    else if(type==='grape'){mesh=this.createFruit('grape');stats={hp:32,speed:2.7,damage:9,radius:.7,ranged:true};}
    else if(type==='orange'){mesh=this.createFruit('orange');mesh.scale.setScalar(1.2);stats={hp:75,speed:2.1,damage:15,radius:.88};}
    else{mesh=this.createPoo(boss);stats=boss?{hp:1150,speed:2.25,damage:22,radius:2.25,ranged:true}:{hp:55,speed:3,damage:13,radius:.8,ranged:Math.random()<.42};}
    const bound=STORY[this.chapter].bounds-4;
    if(!position){const angle=rand(0,TAU),d=rand(13,bound);position=new THREE.Vector3(Math.cos(angle)*d,0,Math.sin(angle)*d);}
    const groundY=type==='zackbell'?.08:type==='apple'?(boss?3.25:.76):type==='orange'?.9:type==='grape'?.7:type==='poo'?(boss?.95:.52):.7;
    mesh.position.copy(position);mesh.position.y=position.y+groundY;
    const enemy={kind:'enemy',mesh,type,boss,hp:stats.hp,maxHp:stats.hp,speed:stats.speed,damage:stats.damage,radius:stats.radius,ranged:stats.ranged,attack:rand(.3,1.1),phase:1,strafe:Math.random()<.5?-1:1,dead:false,teleport:0,groundY};
    mesh.userData.entity=enemy;mesh.traverse((o)=>{if(o.isMesh)o.userData.entity=enemy;});
    this.actors.add(mesh);this.enemies.push(enemy);this.shootables.push(mesh);
    if(boss){
      this.boss=enemy;this.ui.bossHud.hidden=false;
      this.ui.bossName.textContent=type==='zackbell'?'ZACKBELL WHO STINKS':type==='apple'?'DOCTOR APPLE':'KING POO';
      this.ui.bossSubtitle.textContent=type==='zackbell'?'THE STINK KING':type==='apple'?'CHIEF WELLNESS OFFICER':'FINAL BOSS';
      this.ui.bossPhase.textContent='PHASE 1';this.sound(85,.65,'sawtooth',.07);
    }
    return enemy;
  }

  spawnPickup(type,position){const mesh=type==='burger'?this.createBurger(.75):type==='pizza'?this.createPizza(.75):this.createCandy(.75);mesh.position.copy(position);mesh.position.y=.8;const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.05,7,18),this.materials.lime);ring.rotation.x=Math.PI/2;mesh.add(ring);this.pickups.push({mesh,type,life:20});this.actors.add(mesh);}
  spawnWaveEnemy(){if(this.boss)return;if(this.chapter===0)this.spawnEnemy(pick(['apple','apple','grape','orange']));else if(this.chapter===1)this.spawnEnemy(pick(['poo','apple','grape','poo']));else if(this.chapter===2)this.spawnEnemy(pick(['apple','grape','orange','orange']));else this.spawnEnemy(pick(['poo','poo','apple','grape']));}

  startBoss(type){
    if(this.bossStarted)return;this.bossStarted=true;this.state='dialogue';
    const lines=type==='zackbell'?
      [['ZACKBELL','You survived my gang, but nobody survives the Stink Storm.'],['COOPER','Your storm smells like a wet shoe.'],['ZACKBELL','PHASE ONE: NO DEODORANT!']]:
      type==='apple'?
      [['DOCTOR APPLE','You broke all three reactors. Do you know how many wellness grants those cost?'],['COOPER','No. I cannot count past pizza.'],['DOCTOR APPLE','Then face APPLE A DAY MODE.']]:
      [['KING POO','Enough minions. I will ruin your appetite personally.'],['COOPER','Nothing has ever ruined my appetite.'],['KING POO','Then prepare for the Royal Flush.']];
    this.showDialogue(lines,()=>{this.state='playing';this.spawnEnemy(type,new THREE.Vector3(0,0,-15),true);this.toast('BOSS FIGHT',type==='zackbell'?'ZACKBELL THE STINK KING':type==='apple'?'DOCTOR APPLE':'KING POO');this.updateObjective();});
  }

  update(dt,now){
    if(this.state!=='playing')return;
    this.heat=Math.max(0,this.heat-dt*(this.overheated?.34:.22));if(this.overheated&&this.heat<.28)this.overheated=false;
    this.power.pizza=Math.max(0,this.power.pizza-dt);this.power.candy=Math.max(0,this.power.candy-dt);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);
    this.recoil=Math.max(0,this.recoil-dt*8);this.weapon.position.z=-.18+this.recoil*.18;this.weapon.rotation.x=-this.recoil*.12;this.muzzleFlash.material.opacity=Math.max(0,this.muzzleFlash.material.opacity-dt*22);
    this.updatePlayer(dt);this.updateCamera(dt);if(this.fireHeld)this.shoot(now);this.updateWaves(dt);this.updateEnemies(dt);this.updateProjectiles(dt);this.updatePickups(dt);this.updateFx(dt);
    this.hudTimer-=dt;if(this.hudTimer<=0){this.hudTimer=.08;this.updateHud();}
  }

  updatePlayer(dt){
    const forwardInput=(this.keys.KeyW||this.keys.ArrowUp?1:0)-(this.keys.KeyS||this.keys.ArrowDown?1:0)+this.mobileMove.y;
    const sideInput=(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0)+this.mobileMove.x;
    const forward=this.tmpA.set(Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const right=this.tmpB.set(Math.cos(this.yaw),0,Math.sin(this.yaw));
    const move=this.tmpC.copy(forward).multiplyScalar(forwardInput).addScaledVector(right,sideInput);if(move.lengthSq()>1)move.normalize();
    this.player.position.addScaledVector(move,(this.dashTime>0?14:6.2)*dt);
    const bound=STORY[this.chapter].bounds;this.player.position.x=clamp(this.player.position.x,-bound,bound);this.player.position.z=clamp(this.player.position.z,-bound,bound);this.player.rotation.y=this.yaw;
    this.player.position.y=move.lengthSq()>.02?Math.sin(performance.now()*.012)*.055:0;
  }

  updateCamera(dt){
    const forward=this.tmpA.set(Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const desired=this.tmpB.copy(this.player.position).addScaledVector(forward,-7.4);desired.y+=3.7;
    if(this.shake>0){desired.x+=rand(-this.shake,this.shake);desired.y+=rand(-this.shake,this.shake);desired.z+=rand(-this.shake,this.shake);this.shake=Math.max(0,this.shake-dt*2.8);}
    this.camera.position.lerp(desired,1-Math.pow(.001,dt));this.camera.rotation.order='YXZ';this.camera.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;this.camera.rotation.z=0;
  }

  updateWaves(dt){
    if(this.boss||this.state!=='playing')return;
    this.waveTimer-=dt;
    const caps=[5,6,7,7],cap=this.quality==='LOW'?Math.max(4,caps[this.chapter]-1):caps[this.chapter];
    if(this.waveTimer<=0&&this.enemies.length<cap){this.spawnWaveEnemy();this.waveTimer=Math.max(.6,2.2-this.chapter*.28-this.levelKills*.03);}
  }

  updateEnemies(dt){
    const time=performance.now()*.004;
    for(const enemy of [...this.enemies]){
      if(enemy.dead)continue;
      const p=enemy.mesh.position;
      const dir=this.tmpA.copy(this.player.position).sub(p);const dist=Math.max(.001,dir.length());dir.multiplyScalar(1/dist);enemy.attack-=dt;
      if(enemy.boss)this.updateBoss(enemy,dt,dist,dir);
      else if(enemy.ranged&&dist>5.5){const tangent=this.tmpB.set(-dir.z,0,dir.x).multiplyScalar(enemy.strafe);p.addScaledVector(tangent,enemy.speed*.55*dt);p.addScaledVector(dir,enemy.speed*.15*dt);if(enemy.attack<=0){this.enemyShoot(enemy,dir.clone(),enemy.type==='grape'?0x9c6cff:0x82502e);enemy.attack=rand(1.3,2.2);}}
      else{p.addScaledVector(dir,enemy.speed*dt);if(dist<enemy.radius+.9&&enemy.attack<=0){this.damagePlayer(enemy.damage,enemy.type==='poo'?'POO IMPACT':'VITAMIN CONTAMINATION');enemy.attack=.95;p.addScaledVector(dir,-1.1);}}
      enemy.mesh.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI;enemy.mesh.position.y=enemy.groundY+Math.sin(time+this.enemies.indexOf(enemy))*.045;
    }
  }

  updateBoss(enemy,dt,dist,dir){
    const ratio=enemy.hp/enemy.maxHp,nextPhase=ratio<.34?3:ratio<.68?2:1;
    if(nextPhase!==enemy.phase){
      enemy.phase=nextPhase;this.ui.bossPhase.textContent=`PHASE ${nextPhase}`;
      const title=enemy.type==='zackbell'?(nextPhase===2?'STINK STORM':'TOXIC MELTDOWN'):enemy.type==='apple'?(nextPhase===2?'CORE MELTDOWN':'DOCTOR MODE'):(nextPhase===2?'ROYAL FLUSH':'SEWER RAGE');
      this.toast(`PHASE ${nextPhase}`,title);this.burst(enemy.mesh.position,enemy.type==='zackbell'?0x82c85c:enemy.type==='apple'?0xff514c:0x78411f,22,1.25);
      for(let i=0;i<1+nextPhase;i++)this.spawnEnemy(enemy.type==='zackbell'?pick(['poo','grape']):enemy.type==='apple'?pick(['grape','orange']):'poo');enemy.attack=.35;
    }
    const tangent=this.tmpB.set(-dir.z,0,dir.x).multiplyScalar(enemy.strafe);
    if(enemy.type==='zackbell'){
      enemy.mesh.position.addScaledVector(tangent,enemy.speed*(.55+enemy.phase*.12)*dt);enemy.mesh.position.addScaledVector(dir,(dist>10?1:-.35)*enemy.speed*.22*dt);enemy.teleport-=dt;
      enemy.mesh.traverse((o)=>{if(o.userData.stinkOrbit!==undefined){o.userData.stinkOrbit+=dt*(1+enemy.phase*.2);o.position.x=Math.cos(o.userData.stinkOrbit)*1.6;o.position.z=Math.sin(o.userData.stinkOrbit)*1.6;o.position.y=1.4+Math.sin(o.userData.stinkOrbit*2)*.45;}});
      if(enemy.phase===3&&enemy.teleport<=0){enemy.mesh.position.set(rand(-13,13),enemy.groundY,rand(-13,13));enemy.teleport=3.2;this.burst(enemy.mesh.position,0x82c85c,18,1);}
      if(enemy.attack<=0){if(enemy.phase===1)this.enemyShoot(enemy,dir.clone(),0x82c85c,1.05);else if(enemy.phase===2)for(let a=-2;a<=2;a++)this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.16),0x9fd75c,1.15);else for(let a=0;a<10;a++)this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/10),0,-Math.cos(a*TAU/10)),0x75b84d,1.35);enemy.attack=enemy.phase===3?.72:1.05;}
    }else if(enemy.type==='apple'){
      enemy.mesh.position.addScaledVector(tangent,enemy.speed*(.55+enemy.phase*.15)*dt);enemy.mesh.position.addScaledVector(dir,(dist>12?1:-1)*enemy.speed*.25*dt);
      if(enemy.attack<=0){if(enemy.phase===1)this.enemyShoot(enemy,dir.clone(),0xff514c,1);else if(enemy.phase===2)for(let a=-1;a<=1;a++)this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.18),0xff514c,1.2);else for(let a=0;a<8;a++)this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/8),0,-Math.cos(a*TAU/8)),0xff9d38,1.45);enemy.attack=enemy.phase===3?.75:1.15;}
    }else{
      enemy.mesh.position.addScaledVector(dir,(dist>9?1:-.4)*enemy.speed*(1+enemy.phase*.1)*dt);
      if(enemy.attack<=0){if(enemy.phase===1)this.enemyShoot(enemy,dir.clone(),0x7a431f,1.2);else if(enemy.phase===2)for(let a=-2;a<=2;a++)this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.14),0x9b5a2c,1.3);else{for(let a=0;a<12;a++)this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/12),0,-Math.cos(a*TAU/12)),0xd17a31,1.55);this.shake=.22;}enemy.attack=enemy.phase===3?.68:1.05;}
    }
  }

  projectileMaterial(color){if(!this.projectileMaterials.has(color))this.projectileMaterials.set(color,new THREE.MeshBasicMaterial({color}));return this.projectileMaterials.get(color);}
  enemyShoot(enemy,direction,color,speedMul=1){
    if(this.projectiles.length>(this.quality==='LOW'?22:34))return;
    const mesh=new THREE.Mesh(enemy.boss?this.geometry.bossProjectile:this.geometry.projectile,this.projectileMaterial(color));mesh.position.copy(enemy.mesh.position);mesh.position.y+=enemy.boss?1.7:.8;
    const velocity=direction.normalize().multiplyScalar((enemy.boss?9.5:7.3)*speedMul),reason=enemy.type==='zackbell'?'STINK ATTACK':enemy.type==='poo'?'POO PROJECTILE':'PROJECTILE IMPACT';
    this.projectiles.push({mesh,velocity,life:5,damage:enemy.damage*(enemy.boss?.72:.62),radius:enemy.boss?.34:.22,reason});this.effects.add(mesh);
  }
  updateProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.mesh.position.addScaledVector(p.velocity,dt);p.life-=dt;this.tmpA.copy(this.player.position);this.tmpA.y+=1;if(p.mesh.position.distanceToSquared(this.tmpA)<(p.radius+.68)**2){this.damagePlayer(p.damage,p.reason);p.life=0;}if(p.life<=0){this.effects.remove(p.mesh);this.projectiles.splice(i,1);}}
  }

  updatePickups(dt){for(let i=this.pickups.length-1;i>=0;i--){const p=this.pickups[i];p.life-=dt;p.mesh.rotation.y+=dt*1.5;p.mesh.position.y=.75+Math.sin(performance.now()*.004+i)*.18;if(p.mesh.position.distanceToSquared(this.player.position)<2.1){this.collectPickup(p);this.actors.remove(p.mesh);this.pickups.splice(i,1);}else if(p.life<=0){this.actors.remove(p.mesh);this.pickups.splice(i,1);}}}
  collectPickup(p){if(p.type==='burger'){this.power.burger=Math.min(3,this.power.burger+1);this.toast('PICKUP','BURGER MEDKIT');}if(p.type==='pizza'){this.power.pizza=12;this.toast('POWERUP','PIZZA SPREAD SHOT');}if(p.type==='candy'){this.power.candy=10;this.toast('POWERUP','CANDY RAPID FIRE');}this.score+=75;this.sound(640,.12,'square',.04);this.burst(p.mesh.position,p.type==='burger'?0xffc857:p.type==='pizza'?0xffd34d:0xff6da8,12,.6);}
  useBurger(){if(this.power.burger<=0||this.health>=this.maxHealth)return;this.power.burger--;this.health=Math.min(this.maxHealth,this.health+40);this.toast('HEALED','BURGER MEDKIT');this.sound(520,.22,'sine',.04);}
  dash(){if(this.dashCooldown>0||this.state!=='playing')return;this.dashCooldown=1.35;this.dashTime=.23;this.sound(220,.12,'square',.03);this.shake=.08;}

  shoot(now){
    const cooldown=this.power.candy>0?78:175;if(now-this.lastShot<cooldown||this.overheated)return;this.lastShot=now;this.heat=Math.min(1,this.heat+(this.power.candy>0?.045:.085));if(this.heat>=.99){this.overheated=true;this.toast('RIFLE','OVERHEATED');}
    (this.power.pizza>0?[-.025,0,.025]:[0]).forEach((x)=>this.fireRay(x));this.sound(this.power.candy>0?520:390,.045,'square',.024);this.recoil=1;this.muzzleFlash.material.opacity=1;this.shake=Math.max(this.shake,.025);
  }
  fireRay(offsetX){
    this.raycaster.setFromCamera(new THREE.Vector2(offsetX,0),this.camera);const hits=this.raycaster.intersectObjects(this.shootables,true);let hitPoint=this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction,55),entity=null;
    for(const hit of hits){const found=this.findEntity(hit.object);if(found){entity=found;hitPoint=hit.point;break;}}
    const origin=new THREE.Vector3();this.muzzle.getWorldPosition(origin);this.tracer(origin,hitPoint);
    if(entity){const damage=this.power.pizza>0?24:34;if(entity.kind==='target')this.damageTarget(entity,damage,hitPoint);else this.damageEnemy(entity,damage,hitPoint);this.ui.crosshair.classList.add('hit');setTimeout(()=>this.ui.crosshair.classList.remove('hit'),70);}
  }
  findEntity(object){let node=object;while(node){if(node.userData?.entity)return node.userData.entity;node=node.parent;}return null;}
  damageEnemy(enemy,amount,point){if(enemy.dead)return;enemy.hp-=amount;this.score+=Math.round(amount);this.burst(point,enemy.type==='zackbell'?0x82c85c:enemy.type==='poo'?0x78411f:enemy.type==='apple'?0xff514c:0x9a68db,6,.28);if(enemy.boss){this.shake=.06;this.updateBossHud();}if(enemy.hp<=0)this.killEnemy(enemy);}
  killEnemy(enemy){
    enemy.dead=true;const deathPos=enemy.mesh.position.clone();this.burst(deathPos,enemy.type==='zackbell'?0x82c85c:enemy.type==='poo'?0x78411f:0xff6d65,enemy.boss?24:15,enemy.boss?1.35:.72);this.sound(enemy.boss?70:190,enemy.boss?.6:.16,'sawtooth',enemy.boss?.08:.03);
    this.actors.remove(enemy.mesh);this.enemies=this.enemies.filter((e)=>e!==enemy);this.shootables=this.shootables.filter((m)=>m!==enemy.mesh);this.score+=enemy.boss?5000:150;
    if(enemy.boss){this.boss=null;this.ui.bossHud.hidden=true;setTimeout(()=>this.completeChapter(),800);}else{this.levelKills++;if(Math.random()<.22)this.spawnPickup(pick(['burger','pizza','candy']),deathPos);this.checkObjective();}
  }
  damageTarget(target,amount,point){target.hp-=amount;this.burst(point,0x66d8ff,7,.3);this.shake=.04;if(target.hp<=0){this.burst(target.mesh.position,0x66d8ff,22,1);this.sound(95,.5,'sawtooth',.065);this.actors.remove(target.mesh);this.targets=this.targets.filter((t)=>t!==target);this.shootables=this.shootables.filter((m)=>m!==target.mesh);this.score+=700;this.checkObjective();}}

  checkObjective(){
    if(this.chapter===0&&this.levelKills>=STORY[0].target)this.completeChapter();
    else if(this.chapter===1&&this.levelKills>=STORY[1].target&&!this.bossStarted)this.startBoss('zackbell');
    else if(this.chapter===2&&this.targets.length===0&&!this.bossStarted)this.startBoss('apple');
    else if(this.chapter===3&&this.levelKills>=STORY[3].target&&!this.bossStarted)this.startBoss('poo');
    this.updateObjective();
  }
  updateObjective(){
    const chapter=STORY[this.chapter];
    if(this.boss){const name=this.boss.type==='zackbell'?'Zackbell':this.boss.type==='apple'?'Doctor Apple':'King Poo';this.ui.objectiveTitle.textContent=`Defeat ${name}`;this.ui.objectiveProgress.textContent=`PHASE ${this.boss.phase}`;}
    else if(this.chapter===2){this.ui.objectiveTitle.textContent=chapter.objective;this.ui.objectiveProgress.textContent=`${chapter.target-this.targets.length} / ${chapter.target}`;}
    else{this.ui.objectiveTitle.textContent=chapter.objective;this.ui.objectiveProgress.textContent=`${Math.min(this.levelKills,chapter.target)} / ${chapter.target}`;}
  }
  completeChapter(){if(this.state!=='playing')return;this.state='transition';this.fireHeld=false;if(document.pointerLockElement)document.exitPointerLock();this.writeSave(Math.min(this.chapter+1,STORY.length-1));this.showDialogue(STORY[this.chapter].outro,()=>{if(this.chapter<STORY.length-1)this.enterChapter(this.chapter+1,true);else this.showEnding();});}
  showEnding(){this.state='ending';this.hideAllScreens();this.ui.endingScreen.classList.add('active');this.ui.finalStoryScore.textContent=String(this.score).padStart(6,'0');localStorage.removeItem('cooperStorySaveV2');this.updateContinueButton();}

  damagePlayer(amount,reason){if(this.dashTime>0||this.state!=='playing')return;this.health=Math.max(0,this.health-amount);this.shake=.22;this.ui.damageVignette.classList.add('flash');setTimeout(()=>this.ui.damageVignette.classList.remove('flash'),120);this.sound(80,.22,'sawtooth',.06);if(this.health<=0)this.gameOver(reason);}
  gameOver(reason){this.state='gameover';this.fireHeld=false;if(document.pointerLockElement)document.exitPointerLock();this.ui.gameOverTitle.textContent=reason.includes('STINK')?'COOPER GOT STINKED':reason.includes('POO')?'COOPER GOT POOED':'COOPER GOT VITAMINED';this.ui.gameOverCopy.textContent=reason.includes('STINK')?'Zackbell achieved a smell-based victory. Open every window immediately.':reason.includes('POO')?'The royal sewer forces achieved an extremely embarrassing victory.':'This outcome was medically responsible and therefore unacceptable.';this.hideAllScreens();this.ui.gameOverScreen.classList.add('active');}
  pause(){if(this.state!=='playing')return;this.state='paused';this.fireHeld=false;if(document.pointerLockElement)document.exitPointerLock();this.hideAllScreens();this.ui.pauseScreen.classList.add('active');}
  resume(){if(this.state!=='paused')return;this.hideAllScreens();this.state='playing';}

  updateBossHud(){if(!this.boss)return;this.ui.bossFill.style.transform=`scaleX(${clamp(this.boss.hp/this.boss.maxHp,0,1)})`;}
  updateHud(){
    this.ui.healthText.textContent=Math.ceil(this.health);this.ui.healthFill.style.transform=`scaleX(${this.health/this.maxHealth})`;this.ui.heatFill.style.width=`${this.heat*100}%`;this.ui.heatText.textContent=this.overheated?'OVERHEATED':this.heat>.75?'HOT':'READY';
    this.ui.burgerCount.textContent=this.power.burger;this.ui.pizzaTimer.textContent=this.power.pizza>0?`${Math.ceil(this.power.pizza)}s`:'-';this.ui.candyTimer.textContent=this.power.candy>0?`${Math.ceil(this.power.candy)}s`:'-';
    document.querySelector('[data-power="burger"]').classList.toggle('active',this.power.burger>0);document.querySelector('[data-power="pizza"]').classList.toggle('active',this.power.pizza>0);document.querySelector('[data-power="candy"]').classList.toggle('active',this.power.candy>0);this.updateBossHud();
  }

  tracer(from,to){const geometry=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xdfff39,transparent:true,opacity:.9}));this.effects.add(line);this.fx.push({kind:'line',object:line,life:.045,max:.045});}
  burst(position,color,count=8,size=.4){
    const n=this.quality==='LOW'?Math.min(count,6):Math.min(count,24);if(!n)return;
    const positions=new Float32Array(n*3),velocities=[];
    for(let i=0;i<n;i++){positions[i*3]=position.x;positions[i*3+1]=position.y;positions[i*3+2]=position.z;velocities.push(new THREE.Vector3(rand(-1,1),rand(.1,1.4),rand(-1,1)).normalize().multiplyScalar(rand(2,7)*size));}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const material=new THREE.PointsMaterial({color,size:clamp(size*.14,.04,.2),transparent:true,opacity:1,depthWrite:false});const points=new THREE.Points(geometry,material);this.effects.add(points);this.fx.push({kind:'points',object:points,velocities,life:.55,max:.55});
  }
  updateFx(dt){
    for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;
      if(f.kind==='points'){const arr=f.object.geometry.attributes.position.array;for(let p=0;p<f.velocities.length;p++){const v=f.velocities[p];v.y-=5*dt;arr[p*3]+=v.x*dt;arr[p*3+1]+=v.y*dt;arr[p*3+2]+=v.z*dt;}f.object.geometry.attributes.position.needsUpdate=true;f.object.material.opacity=clamp(f.life/f.max,0,1);}
      else f.object.material.opacity=clamp(f.life/f.max,0,1);
      if(f.life<=0){this.effects.remove(f.object);f.object.geometry.dispose();f.object.material.dispose();this.fx.splice(i,1);}
    }
  }

  sound(freq,duration,type='sine',volume=.03){try{this.audio||=new(window.AudioContext||window.webkitAudioContext)();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,this.audio.currentTime);g.gain.setValueAtTime(volume,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+duration);o.connect(g).connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+duration);}catch{}}

  adaptPerformance(dt){
    this.fpsTime+=dt;this.fpsFrames++;if(this.fpsTime<2)return;
    this.avgFps=this.fpsFrames/this.fpsTime;this.fpsFrames=0;this.fpsTime=0;
    if(this.avgFps<42&&this.pixelRatio>.65){this.pixelRatio=Math.max(.65,this.pixelRatio-.1);this.renderer.setPixelRatio(this.pixelRatio);this.resize();}
    else if(this.avgFps>57&&this.pixelRatio<this.maxPixelRatio){this.pixelRatio=Math.min(this.maxPixelRatio,this.pixelRatio+.05);this.renderer.setPixelRatio(this.pixelRatio);this.resize();}
  }

  updateAmbient(dt){
    if(this.chapter===1){for(const child of this.world.children){if(child.userData.drift){child.position.x+=Math.sin(performance.now()*.0005+child.position.z)*child.userData.drift*dt;child.rotation.y+=dt*.08;}}}
  }
  renderIdle(dt){if(this.state==='title'){this.player.rotation.y+=dt*.18;this.camera.position.lerp(new THREE.Vector3(7,4.2,10),.02);this.camera.lookAt(0,1,0);}}
  loop(now){const dt=Math.min((now-this.lastTime)/1000,.034);this.lastTime=now;this.update(dt,now);this.updateAmbient(dt);this.renderIdle(dt);this.adaptPerformance(dt);this.renderer.render(this.scene,this.camera);requestAnimationFrame((t)=>this.loop(t));}
}

new CooperGameV2();
