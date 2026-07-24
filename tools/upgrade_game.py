from pathlib import Path
import re

path = Path('game.js')
s = path.read_text()


def sub(pattern, replacement, *, flags=re.S, count=1, label='patch'):
    global s
    s2, n = re.subn(pattern, replacement, s, count=count, flags=flags)
    if n != count:
        raise SystemExit(f'{label}: expected {count} replacement(s), got {n}')
    s = s2


def replace(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exact snippet once, got {n}')
    s = s.replace(old, new, 1)

marker = "  {\n    kicker: 'CHAPTER TWO',\n    title: 'THE WELLNESS LAB',"
if marker not in s:
    raise SystemExit('story insertion marker missing')
zack_story = """  {
    kicker: 'CHAPTER TWO',
    title: 'THE STINKWORKS',
    subtitle: 'Something smells suspiciously like Zackbell.',
    objective: 'Clear the Stink Gang',
    target: 7,
    bounds: 24,
    intro: [
      ['ZACKBELL', 'Welcome to my alley, Cooper. Every breath makes me stronger.'],
      ['COOPER', 'I thought the sewer was leaking. It is somehow worse.'],
      ['ZACKBELL', 'Prepare for maximum stink.'],
      ['COOPER', 'Prepare for maximum ventilation.']
    ],
    outro: [
      ['ZACKBELL', 'Impossible... my legendary smell... defeated...'],
      ['COOPER', 'Soap exists, Zackbell. Look into it.'],
      ['NARRATOR', 'Behind Zackbell was a delivery docket from the Wellness Laboratory.']
    ]
  },
"""
s = s.replace(marker, zack_story + marker.replace("'CHAPTER TWO'", "'CHAPTER THREE'"), 1)

sub(
    r"    this\.renderer = new THREE\.WebGLRenderer\(\{ canvas: this\.canvas, antialias: true, powerPreference: 'high-performance' \}\);.*?    this\.composer\.addPass\(this\.bloom\);\n",
    """    const mobile = matchMedia('(pointer:coarse)').matches;
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    this.quality = localStorage.cooperQuality || (mobile || memory <= 4 || cores <= 4 ? 'LOW' : memory >= 8 && cores >= 8 ? 'HIGH' : 'MEDIUM');
    this.pixelRatio = this.quality === 'HIGH' ? Math.min(devicePixelRatio, 1.35) : this.quality === 'MEDIUM' ? Math.min(devicePixelRatio, 1.1) : Math.min(devicePixelRatio, .9);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality !== 'LOW', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.renderer.shadowMap.enabled = this.quality !== 'LOW';
    this.renderer.shadowMap.type = this.quality === 'HIGH' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.composer = null;
    if (this.quality === 'HIGH') {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * .65, innerHeight * .65), .25, .45, .92);
      this.composer.addPass(this.bloom);
    }
""",
    label='renderer quality'
)

replace(
    "    this.lastTime = performance.now();\n",
    "    this.lastTime = performance.now();\n    this.fpsTimer = 0; this.fpsFrames = 0; this.avgFps = 60; this.hudTimer = 0; this.recoil = 0;\n    this.tempPlayerPoint = new THREE.Vector3();\n",
    'performance state'
)
replace(
    "    this.materials = this.createMaterials();\n",
    "    this.materials = this.createMaterials();\n    this.particleGeometry = new THREE.TetrahedronGeometry(.08, 0);\n",
    'shared particle geometry'
)

sub(
    r"    const blaster = new THREE\.Group\(\);.*?    p\.add\(blaster\);\n",
    """    const blaster = new THREE.Group();
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x2d333b, roughness: .28, metalness: .82 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x747d87, roughness: .22, metalness: .9 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x101316, roughness: .92, metalness: .02 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x66d8ff, roughness: .08, metalness: .08, transmission: .25, transparent: true, opacity: .76 });
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(.36,.29,.92), gunmetal); receiver.position.z = -.42;
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(.3,.24,.76), this.materials.ink); handguard.position.z = -1.2;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,1.2,10), steel); barrel.rotation.x = Math.PI/2; barrel.position.z = -1.95;
    const brake = new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.28,10), gunmetal); brake.rotation.x = Math.PI/2; brake.position.z = -2.67;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(.38,.4,.66), rubber); stock.position.set(0,.02,.52); stock.rotation.x = -.1;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(.18,.48,.22), rubber); grip.position.set(0,-.34,-.08); grip.rotation.x = -.28;
    const mag = new THREE.Mesh(new THREE.BoxGeometry(.23,.5,.31), gunmetal); mag.position.set(0,-.39,-.5); mag.rotation.x = .16;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.25,.06,.82), steel); rail.position.set(0,.22,-.46);
    const optic = new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.42,12), gunmetal); optic.rotation.x = Math.PI/2; optic.position.set(0,.38,-.5);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.035,12), glass); lens.rotation.x = Math.PI/2; lens.position.set(0,.38,-.72);
    const cell = new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.44), this.materials.cyan); cell.position.set(.2,.02,-.44);
    this.muzzle = new THREE.Object3D(); this.muzzle.position.set(0,.01,-2.86);
    this.muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(.18,.52,8), new THREE.MeshBasicMaterial({ color: 0xffd56a, transparent: true, opacity: 0, depthWrite: false }));
    this.muzzleFlash.rotation.x = -Math.PI/2; this.muzzleFlash.position.set(0,.01,-2.96);
    blaster.add(receiver, handguard, barrel, brake, stock, grip, mag, rail, optic, lens, cell, this.muzzle, this.muzzleFlash);
    blaster.position.set(.62, 1.12, -.18); blaster.rotation.y = -.04;
    blaster.traverse((o) => { if (o.isMesh) o.castShadow = this.quality !== 'LOW'; });
    this.weapon = blaster;
    p.add(blaster);
""",
    label='rifle model'
)

sub(
    r"  resize\(\) \{\n    const w = innerWidth, h = innerHeight;.*?\n  \}\n\n  newGame",
    """  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (this.composer) this.composer.setSize(w, h);
  }

  newGame""",
    label='resize'
)

sub(
    r"  buildLevel\(index\) \{.*?\n  \}\n\n  ground\(",
    """  buildLevel(index) {
    const backgrounds = [0x91bed0, 0x59634d, 0x8bbd7a, 0x151d1b];
    this.scene.background = new THREE.Color(backgrounds[index]);
    this.scene.fog = new THREE.FogExp2(backgrounds[index], index === 3 ? .025 : .014);
    const hemi = new THREE.HemisphereLight(index === 3 ? 0x6da492 : 0xc8edff, index === 3 ? 0x16221c : 0x50543b, index === 3 ? 1.25 : 1.85);
    const sun = new THREE.DirectionalLight(index === 3 ? 0xb5ffe2 : 0xfff0cf, index === 3 ? 1.8 : 2.45);
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

  ground(""",
    label='level routing'
)

stink_method = """
  buildStinkworks() {
    this.ground(this.materials.concrete, 64);
    const road = new THREE.MeshStandardMaterial({ color: 0x20252a, roughness: .94, metalness: .04 });
    this.box(0, .03, 0, 18, .06, 60, road);
    const stinkMaterial = new THREE.MeshBasicMaterial({ color: 0x82c85c, transparent: true, opacity: .28, depthWrite: false });
    for (const side of [-1, 1]) {
      for (let z = -24; z <= 24; z += 8) {
        this.box(side * 11, 2.7, z, 5, 5.4, 6, choice([this.materials.concrete, this.materials.darkBrown, this.materials.ink]));
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,4.6,10), this.materials.concrete);
        pipe.rotation.z = Math.PI / 2; pipe.position.set(side * 8.8, 2.1, z); this.world.add(pipe);
      }
    }
    for (let i = 0; i < (this.quality === 'LOW' ? 6 : 11); i++) {
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(rand(.7,1.35), 8, 6), stinkMaterial);
      cloud.scale.y = rand(.4,.7); cloud.position.set(rand(-9,9), rand(.5,2.4), rand(-24,24)); cloud.userData.drift = rand(.18,.38); this.world.add(cloud);
    }
    this.box(0, 3, -23, 16, 6, 3, this.materials.darkBrown);
    this.box(0, 5.3, -21.45, 9, 1, .15, this.materials.lime);
  }

"""
replace("  buildLab() {\n", stink_method + "  buildLab() {\n", 'stinkworks arena')

sub(
    r"    for \(let i = 0; i < 18; i\+\+\) \{.*?    \}\n  \}\n\n  buildStinkworks",
    """    const lampCount = this.quality === 'LOW' ? 6 : 10;
    for (let i = 0; i < lampCount; i++) {
      const z = -24 + i * (48 / Math.max(1, lampCount - 1));
      const x = i % 2 ? -7.5 : 7.5;
      this.box(x, 1.2, z, .12, 2.4, .12, this.materials.ink);
      this.box(x, 2.45, z, .35, .16, .35, this.materials.lime);
      if (this.quality === 'HIGH' && i % 2 === 0) {
        const lamp = new THREE.PointLight(0xdfff39, 1.2, 7, 2); lamp.position.set(x, 2.5, z); this.world.add(lamp);
      }
    }
  }

  buildStinkworks""",
    label='street lights'
)

replace(
    "    this.ui.dialoguePortrait.textContent = speaker === 'COOPER' ? 'C' : speaker === 'KING POO' ? 'P' : speaker === 'DOCTOR APPLE' ? 'A' : speaker === 'MAYOR NUGGET' ? 'N' : '!';\n    this.ui.dialoguePortrait.style.background = speaker === 'COOPER' ? '#dfff39' : speaker === 'KING POO' ? '#78411f' : speaker === 'DOCTOR APPLE' ? '#ed4c47' : '#66d8ff';\n",
    "    this.ui.dialoguePortrait.textContent = speaker === 'COOPER' ? 'C' : speaker === 'KING POO' ? 'P' : speaker === 'DOCTOR APPLE' ? 'A' : speaker === 'ZACKBELL' ? 'Z' : speaker === 'MAYOR NUGGET' ? 'N' : '!';\n    this.ui.dialoguePortrait.style.background = speaker === 'COOPER' ? '#dfff39' : speaker === 'KING POO' ? '#78411f' : speaker === 'DOCTOR APPLE' ? '#ed4c47' : speaker === 'ZACKBELL' ? '#82c85c' : '#66d8ff';\n",
    'zack dialogue portrait'
)

zack_model = """
  createZackbellMesh() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xd3a47c, roughness: .72 });
    const hoodie = new THREE.MeshStandardMaterial({ color: 0x3f8247, roughness: .83 });
    const gas = new THREE.MeshBasicMaterial({ color: 0x82c85c, transparent: true, opacity: .3, depthWrite: false });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.78, 1.35, 8, 14), hoodie); torso.position.y = 1.45; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.76, 16, 12), skin); head.position.y = 3.2; g.add(head);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(.82,.14,8,20), this.materials.darkBrown); hood.rotation.x = Math.PI/2; hood.position.y = 3.18; g.add(hood);
    for (const x of [-.24,.24]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.075,8,6), this.materials.ink); eye.position.set(x,3.28,-.68); g.add(eye); }
    const respirator = new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.38,10), this.materials.concrete); respirator.rotation.x = Math.PI/2; respirator.position.set(0,3,-.72); g.add(respirator);
    for (const x of [-.42,.42]) { const filter = new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.2,10), this.materials.ink); filter.rotation.x = Math.PI/2; filter.position.set(x,2.98,-.65); g.add(filter); }
    for (const x of [-.43,.43]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.2,.75,6,10), this.materials.ink); leg.position.set(x,.48,0); g.add(leg); }
    for (let i=0;i<5;i++) { const cloud = new THREE.Mesh(new THREE.SphereGeometry(.55,8,6), gas); cloud.scale.y=.55; cloud.userData.stinkOrbit=i*TAU/5; g.add(cloud); }
    g.traverse((o)=>{ if(o.isMesh) o.castShadow=this.quality!=='LOW'; });
    return g;
  }

"""
replace("  createPooMesh(boss = false) {\n", zack_model + "  createPooMesh(boss = false) {\n", 'zack model')

sub(
    r"  spawnEnemy\(type, position = null, boss = false\) \{.*?\n  \}\n\n  spawnPickup",
    """  spawnEnemy(type, position = null, boss = false) {
    let mesh, stats;
    if (type === 'zackbell') { mesh = this.createZackbellMesh(); stats = { hp: 900, speed: 2.45, damage: 18, radius: 1.9, ranged: true }; }
    else if (type === 'apple') { mesh = this.createFruitMesh('apple', boss); stats = boss ? { hp: 760, speed: 2.5, damage: 18, radius: 1.9, ranged: true } : { hp: 42, speed: 3.5, damage: 10, radius: .72 }; }
    else if (type === 'grape') { mesh = this.createFruitMesh('grape'); stats = { hp: 32, speed: 2.7, damage: 9, radius: .7, ranged: true }; }
    else if (type === 'orange') { mesh = this.createFruitMesh('orange'); stats = { hp: 75, speed: 2.1, damage: 15, radius: .88 }; mesh.scale.setScalar(1.2); }
    else { mesh = this.createPooMesh(boss); stats = boss ? { hp: 1150, speed: 2.25, damage: 22, radius: 2.25, ranged: true } : { hp: 55, speed: 3, damage: 13, radius: .8, ranged: Math.random() < .42 }; }
    const bound = STORY[this.chapter].bounds - 4;
    if (!position) { const angle = rand(0, TAU), d = rand(13, bound); position = new THREE.Vector3(Math.cos(angle) * d, 0, Math.sin(angle) * d); }
    mesh.position.copy(position);
    const enemy = { mesh, type, boss, hp: stats.hp, maxHp: stats.hp, speed: stats.speed, damage: stats.damage, radius: stats.radius, ranged: stats.ranged, attack: rand(.3,1.1), phase: 1, strafe: Math.random()<.5?-1:1, dead:false, teleport:0 };
    mesh.userData.entity = enemy; mesh.traverse((o) => { if (o.isMesh) o.userData.entity = enemy; });
    this.actorLayer.add(mesh); this.enemies.push(enemy); this.shootables.push(mesh);
    if (boss) {
      this.boss = enemy; this.ui.bossHud.hidden = false;
      this.ui.bossName.textContent = type === 'zackbell' ? 'ZACKBELL WHO STINKS' : type === 'apple' ? 'DOCTOR APPLE' : 'KING POO';
      this.ui.bossSubtitle.textContent = type === 'zackbell' ? 'THE STINK KING' : type === 'apple' ? 'CHIEF WELLNESS OFFICER' : 'FINAL BOSS';
      this.ui.bossPhase.textContent = 'PHASE 1'; this.sound(85, .7, 'sawtooth', .075);
    }
    return enemy;
  }

  spawnPickup""",
    label='enemy spawn'
)

sub(
    r"  spawnWaveEnemy\(\) \{.*?\n  \}\n\n  startBoss",
    """  spawnWaveEnemy() {
    if (this.boss) return;
    if (this.chapter === 0) this.spawnEnemy(choice(['apple','apple','grape','orange']));
    else if (this.chapter === 1) this.spawnEnemy(choice(['poo','apple','grape','poo']));
    else if (this.chapter === 2) this.spawnEnemy(choice(['apple','grape','orange','orange']));
    else this.spawnEnemy(choice(['poo','poo','apple','grape']));
  }

  startBoss""",
    label='wave routing'
)

sub(
    r"  startBoss\(type\) \{.*?\n  \}\n\n  update\(dt, now\)",
    """  startBoss(type) {
    if (this.bossStarted) return;
    this.bossStarted = true; this.state = 'dialogue';
    const lines = type === 'zackbell' ? [
      ['ZACKBELL', 'You survived my gang, but nobody survives the Stink Storm.'],
      ['COOPER', 'Your storm smells like a wet shoe.'],
      ['ZACKBELL', 'PHASE ONE: NO DEODORANT!']
    ] : type === 'apple' ? [
      ['DOCTOR APPLE', 'You broke all three reactors. Do you know how many wellness grants those cost?'],
      ['COOPER', 'No. I cannot count past pizza.'],
      ['DOCTOR APPLE', 'Then face my final form: APPLE A DAY MODE.']
    ] : [
      ['KING POO', 'Enough minions. I will ruin your appetite personally.'],
      ['COOPER', 'Joke is on you. Nothing has ever ruined my appetite.'],
      ['KING POO', 'Then prepare for the Royal Flush.']
    ];
    this.showDialogue(lines, () => {
      this.state = 'playing'; this.spawnEnemy(type, new THREE.Vector3(0, 0, -15), true);
      this.toast('BOSS FIGHT', type === 'zackbell' ? 'ZACKBELL THE STINK KING' : type === 'apple' ? 'DOCTOR APPLE' : 'KING POO'); this.updateObjective();
    });
  }

  update(dt, now)""",
    label='boss dialogue'
)

replace(
    "    this.dashTime = Math.max(0, this.dashTime - dt);\n\n    this.updatePlayer(dt);\n",
    "    this.dashTime = Math.max(0, this.dashTime - dt);\n    this.recoil = Math.max(0, this.recoil - dt * 8);\n    if (this.weapon) { this.weapon.position.z = -.18 + this.recoil * .18; this.weapon.rotation.x = -this.recoil * .12; }\n    if (this.muzzleFlash) this.muzzleFlash.material.opacity = Math.max(0, this.muzzleFlash.material.opacity - dt * 22);\n\n    this.updatePlayer(dt);\n",
    'recoil update'
)
replace(
    "    this.updateFx(dt);\n    this.updateHud();\n",
    "    this.updateFx(dt);\n    this.hudTimer -= dt; if (this.hudTimer <= 0) { this.hudTimer = .08; this.updateHud(); }\n",
    'hud throttle'
)

sub(
    r"  updateBoss\(enemy, dt, dist, dir\) \{.*?\n  \}\n\n  enemyShoot",
    """  updateBoss(enemy, dt, dist, dir) {
    const ratio = enemy.hp / enemy.maxHp;
    const nextPhase = ratio < .34 ? 3 : ratio < .68 ? 2 : 1;
    if (nextPhase !== enemy.phase) {
      enemy.phase = nextPhase; this.ui.bossPhase.textContent = `PHASE ${nextPhase}`;
      const title = enemy.type === 'zackbell' ? (nextPhase === 2 ? 'STINK STORM' : 'TOXIC MELTDOWN') : enemy.type === 'apple' ? (nextPhase === 2 ? 'CORE MELTDOWN' : 'DOCTOR MODE') : (nextPhase === 2 ? 'ROYAL FLUSH' : 'SEWER RAGE');
      this.toast(`PHASE ${nextPhase}`, title);
      this.burst(enemy.mesh.position, enemy.type === 'zackbell' ? 0x82c85c : enemy.type === 'apple' ? 0xff514c : 0x78411f, 22, 1.25);
      for (let i = 0; i < 1 + nextPhase; i++) this.spawnEnemy(enemy.type === 'zackbell' ? choice(['poo','grape']) : enemy.type === 'apple' ? choice(['grape','orange']) : 'poo');
      enemy.attack = .35;
    }
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(enemy.strafe);
    if (enemy.type === 'zackbell') {
      enemy.mesh.position.addScaledVector(tangent, enemy.speed * (.55 + enemy.phase * .12) * dt);
      enemy.mesh.position.addScaledVector(dir, (dist > 10 ? 1 : -.35) * enemy.speed * .22 * dt);
      enemy.teleport -= dt;
      enemy.mesh.traverse((o) => { if (o.userData.stinkOrbit !== undefined) { o.userData.stinkOrbit += dt * (1 + enemy.phase * .2); o.position.x = Math.cos(o.userData.stinkOrbit) * 1.6; o.position.z = Math.sin(o.userData.stinkOrbit) * 1.6; o.position.y = 1.4 + Math.sin(o.userData.stinkOrbit * 2) * .45; } });
      if (enemy.phase === 3 && enemy.teleport <= 0) { enemy.mesh.position.set(rand(-13,13), 0, rand(-13,13)); enemy.teleport = 3.2; this.burst(enemy.mesh.position,0x82c85c,18,1); }
      if (enemy.attack <= 0) {
        if (enemy.phase === 1) this.enemyShoot(enemy, dir, 0x82c85c, 1.05);
        else if (enemy.phase === 2) for (let a=-2;a<=2;a++) this.enemyShoot(enemy,dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a*.16),0x9fd75c,1.15);
        else for (let a=0;a<10;a++) this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/10),0,-Math.cos(a*TAU/10)),0x75b84d,1.35);
        enemy.attack = enemy.phase === 3 ? .72 : 1.05;
      }
    } else if (enemy.type === 'apple') {
      enemy.mesh.position.addScaledVector(tangent, enemy.speed * (.55 + enemy.phase*.15) * dt);
      enemy.mesh.position.addScaledVector(dir, (dist > 12 ? 1 : -1) * enemy.speed * .25 * dt);
      if (enemy.attack <= 0) {
        if (enemy.phase === 1) this.enemyShoot(enemy, dir, 0xff514c, 1);
        else if (enemy.phase === 2) for (let a=-1;a<=1;a++) this.enemyShoot(enemy,dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a*.18),0xff514c,1.2);
        else for (let a=0;a<8;a++) this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/8),0,-Math.cos(a*TAU/8)),0xff9d38,1.45);
        enemy.attack = enemy.phase === 3 ? .75 : 1.15;
      }
    } else {
      enemy.mesh.position.addScaledVector(dir, (dist > 9 ? 1 : -.4) * enemy.speed * (1 + enemy.phase*.1) * dt);
      if (enemy.attack <= 0) {
        if (enemy.phase === 1) this.enemyShoot(enemy, dir, 0x7a431f, 1.2);
        else if (enemy.phase === 2) for (let a=-2;a<=2;a++) this.enemyShoot(enemy,dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0),a*.14),0x9b5a2c,1.3);
        else { for (let a=0;a<12;a++) this.enemyShoot(enemy,new THREE.Vector3(Math.sin(a*TAU/12),0,-Math.cos(a*TAU/12)),0xd17a31,1.55); this.shake = .22; }
        enemy.attack = enemy.phase === 3 ? .68 : 1.05;
      }
    }
  }

  enemyShoot""",
    label='boss AI'
)

sub(
    r"  enemyShoot\(enemy, direction, color, speedMul = 1\) \{.*?\n  \}\n\n  updateProjectiles\(dt\) \{.*?\n  \}\n",
    """  enemyShoot(enemy, direction, color, speedMul = 1) {
    if (this.enemyProjectiles.length > (this.quality === 'LOW' ? 22 : 34)) return;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(enemy.boss ? .24 : .15, 8, 6), new THREE.MeshBasicMaterial({ color }));
    mesh.position.copy(enemy.mesh.position).add(new THREE.Vector3(0, enemy.boss ? 1.7 : .8, 0));
    const velocity = direction.clone().normalize().multiplyScalar((enemy.boss ? 9.5 : 7.3) * speedMul);
    const reason = enemy.type === 'zackbell' ? 'STINK ATTACK' : enemy.type === 'poo' ? 'POO PROJECTILE' : 'PROJECTILE IMPACT';
    this.enemyProjectiles.push({ mesh, velocity, life: 5, damage: enemy.damage * (enemy.boss ? .72 : .62), radius: enemy.boss ? .34 : .22, reason });
    this.fxLayer.add(mesh);
  }

  updateProjectiles(dt) {
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i]; p.mesh.position.addScaledVector(p.velocity, dt); p.life -= dt;
      this.tempPlayerPoint.copy(this.player.position); this.tempPlayerPoint.y += 1;
      if (p.mesh.position.distanceToSquared(this.tempPlayerPoint) < (p.radius + .68) ** 2) { this.damagePlayer(p.damage, p.reason); p.life = 0; }
      if (p.life <= 0) { this.fxLayer.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.enemyProjectiles.splice(i,1); }
    }
  }
""",
    label='projectile optimization'
)

replace(
    "    this.sound(this.power.candy > 0 ? 520 : 390,.045,'square',.026);\n    this.shake = Math.max(this.shake,.025);\n",
    "    this.sound(this.power.candy > 0 ? 520 : 390,.045,'square',.026);\n    this.recoil = 1; if (this.muzzleFlash) this.muzzleFlash.material.opacity = 1;\n    this.shake = Math.max(this.shake,.025);\n",
    'weapon recoil'
)

s = s.replace("enemy.type==='poo'?0x78411f:enemy.type==='apple'?0xff514c:0x9a68db", "enemy.type==='zackbell'?0x82c85c:enemy.type==='poo'?0x78411f:enemy.type==='apple'?0xff514c:0x9a68db")
s = s.replace("enemy.type==='poo'?0x78411f:0xff6d65", "enemy.type==='zackbell'?0x82c85c:enemy.type==='poo'?0x78411f:0xff6d65")

sub(
    r"  checkObjective\(\) \{.*?\n  \}\n\n  updateObjective\(\) \{.*?\n  \}\n",
    """  checkObjective() {
    if (this.chapter === 0 && this.levelKills >= STORY[0].target) this.completeChapter();
    else if (this.chapter === 1 && this.levelKills >= STORY[1].target && !this.bossStarted) this.startBoss('zackbell');
    else if (this.chapter === 2 && this.targets.length === 0 && !this.bossStarted) this.startBoss('apple');
    else if (this.chapter === 3 && this.levelKills >= STORY[3].target && !this.bossStarted) this.startBoss('poo');
    this.updateObjective();
  }

  updateObjective() {
    const chapter = STORY[this.chapter];
    if (this.boss) {
      const bossName = this.boss.type === 'zackbell' ? 'Zackbell' : this.boss.type === 'apple' ? 'Doctor Apple' : 'King Poo';
      this.ui.objectiveTitle.textContent = `Defeat ${bossName}`;
      this.ui.objectiveProgress.textContent = `PHASE ${this.boss.phase}`;
    } else if (this.chapter === 2) {
      this.ui.objectiveTitle.textContent = chapter.objective;
      this.ui.objectiveProgress.textContent = `${chapter.target - this.targets.length} / ${chapter.target}`;
    } else {
      this.ui.objectiveTitle.textContent = chapter.objective;
      this.ui.objectiveProgress.textContent = `${Math.min(this.levelKills,chapter.target)} / ${chapter.target}`;
    }
  }
""",
    label='objectives'
)

replace(
    "    this.ui.gameOverTitle.textContent=reason==='POO IMPACT'||reason.includes('POO')?'COOPER GOT POOED':'COOPER GOT VITAMINED';\n    this.ui.gameOverCopy.textContent=reason.includes('POO')?'The royal sewer forces have achieved an extremely embarrassing victory.':'This outcome was medically responsible and therefore unacceptable.';\n",
    "    this.ui.gameOverTitle.textContent=reason.includes('STINK')?'COOPER GOT STINKED':reason==='POO IMPACT'||reason.includes('POO')?'COOPER GOT POOED':'COOPER GOT VITAMINED';\n    this.ui.gameOverCopy.textContent=reason.includes('STINK')?'Zackbell has achieved a smell-based victory. Open every window immediately.':reason.includes('POO')?'The royal sewer forces have achieved an extremely embarrassing victory.':'This outcome was medically responsible and therefore unacceptable.';\n",
    'stink game over'
)

sub(
    r"  tracer\(from,to\) \{.*?\n  \}\n\n  burst\(position,color,count=8,size=\.4\) \{.*?\n  \}\n",
    """  tracer(from,to) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from,to]);
    const line = new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xdfff39,transparent:true,opacity:.9}));
    this.fxLayer.add(line); this.fx.push({mesh:line,life:.045,max:.045,type:'fade',disposeGeometry:true});
  }

  burst(position,color,count=8,size=.4) {
    const limit = this.quality === 'LOW' ? Math.min(count,5) : count;
    for(let i=0;i<limit && this.fx.length<120;i++){
      const mesh=new THREE.Mesh(this.particleGeometry,new THREE.MeshBasicMaterial({color,transparent:true}));
      mesh.scale.setScalar(rand(.35,1.1)*size); mesh.position.copy(position); this.fxLayer.add(mesh);
      const velocity=new THREE.Vector3(rand(-1,1),rand(.1,1.4),rand(-1,1)).normalize().multiplyScalar(rand(2,7)*size);
      this.fx.push({mesh,velocity,life:rand(.25,.6),max:.6,type:'particle'});
    }
  }
""",
    label='fx optimization'
)
replace(
    "      if(f.life<=0){this.fxLayer.remove(f.mesh);if(f.mesh.geometry)f.mesh.geometry.dispose();if(f.mesh.material)f.mesh.material.dispose?.();this.fx.splice(i,1)}\n",
    "      if(f.life<=0){this.fxLayer.remove(f.mesh);if(f.disposeGeometry&&f.mesh.geometry)f.mesh.geometry.dispose();if(f.mesh.material)f.mesh.material.dispose?.();this.fx.splice(i,1)}\n",
    'shared geometry disposal'
)

sub(
    r"  renderIdleScene\(dt\) \{",
    """  adaptPerformance(dt) {
    this.fpsTimer += dt; this.fpsFrames++;
    if (this.fpsTimer < 2) return;
    this.avgFps = this.fpsFrames / this.fpsTimer; this.fpsFrames = 0; this.fpsTimer = 0;
    const maxRatio = this.quality === 'HIGH' ? 1.35 : this.quality === 'MEDIUM' ? 1.1 : .9;
    if (this.avgFps < 42 && this.pixelRatio > .7) { this.pixelRatio = Math.max(.7,this.pixelRatio-.1); this.renderer.setPixelRatio(this.pixelRatio); this.resize(); }
    else if (this.avgFps > 57 && this.pixelRatio < maxRatio) { this.pixelRatio = Math.min(maxRatio,this.pixelRatio+.05); this.renderer.setPixelRatio(this.pixelRatio); this.resize(); }
  }

  renderIdleScene(dt) {""",
    label='adaptive performance method'
)
replace(
    "    this.update(dt,now);this.renderIdleScene(dt);\n    this.composer.render();requestAnimationFrame((t)=>this.loop(t));\n",
    "    this.update(dt,now);this.renderIdleScene(dt);this.adaptPerformance(dt);\n    if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);requestAnimationFrame((t)=>this.loop(t));\n",
    'render loop'
)

path.write_text(s)

html_path = Path('index.html')
html = html_path.read_text()
html = html.replace(
    'Snacktown has outlawed junk food. Cooper is the only person reckless enough to fight back.',
    'Fight through four story chapters, defeat Zackbell Who Stinks, destroy Doctor Apple, and end King Poo’s empire.'
)
html = html.replace(
    'King Poo is defeated. The fruit army has retreated. Cooper has learned absolutely nothing.',
    'Zackbell has been ventilated, King Poo is defeated, and Cooper has learned absolutely nothing.'
)
html_path.write_text(html)

Path('README.md').write_text('''# Cooper Eats Poo: The Forbidden Five

A ridiculous optimized full-screen Three.js story shooter hosted at **coopereatspoo.online**.

## Story

Snacktown has outlawed burgers, pizza and candy. Cooper fights through the Fruit Patrol, enters the Stinkworks to defeat **Zackbell Who Stinks**, destroys the Wellness Laboratory, defeats Doctor Apple, and reaches the Sewer Throne for a multi-phase final fight against King Poo.

## Features

- Four complete story chapters with dialogue and cinematic chapter cards
- Three multi-phase bosses: Zackbell Who Stinks, Doctor Apple and King Poo
- A rebuilt PBR rifle with metal receiver, barrel, muzzle brake, stock, magazine, optic, recoil and muzzle flash
- Third-person movement, mouse aiming, shooting, dashing and mobile controls
- Adaptive resolution that lowers render scale when frame rate drops
- Automatic Low, Medium or High graphics selection based on device hardware
- Bloom only on High quality, smaller shadow maps and fewer dynamic lights
- Shared particle geometry, capped effects and throttled HUD updates
- Checkpoint saving with Continue support
- Burger healing, pizza spread-shot and candy rapid-fire powerups

## Controls

- `WASD` or arrow keys: move
- Mouse: aim
- Left click or `Space`: fire
- `Shift`: dash
- `E`: use a stored burger medkit
- `Escape`: pause

Touch controls appear automatically on mobile devices.

## Hosting

The site deploys from `main` through the GitHub Pages workflow in `.github/workflows/pages.yml`.

Custom domain: `coopereatspoo.online`
''')

print('Patched game.js, index.html and README.md successfully')
