const originalUrl = new URL('./game.js?v=20260724-camera-fix', import.meta.url);
let source = await fetch(originalUrl, { cache: 'no-store' }).then((response) => {
  if (!response.ok) throw new Error(`Could not load game.js: ${response.status}`);
  return response.text();
});

const patch = (from, to, label) => {
  if (!source.includes(from)) throw new Error(`Patch target missing: ${label}`);
  source = source.replace(from, to);
};

patch(
  "this.maxPixelRatio = this.quality === 'HIGH' ? 1.35 : this.quality === 'MEDIUM' ? 1.1 : .85;",
  "this.maxPixelRatio = this.quality === 'HIGH' ? 1.15 : this.quality === 'MEDIUM' ? .92 : .72;",
  'render resolution'
);
patch(
  "this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality !== 'LOW', powerPreference: 'high-performance' });",
  "this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.quality === 'HIGH', powerPreference: 'high-performance', precision: 'mediump', stencil: false });",
  'renderer options'
);
patch(
  "this.renderer.shadowMap.enabled = this.quality !== 'LOW';",
  "this.renderer.shadowMap.enabled = this.quality === 'HIGH';",
  'shadow mode'
);
patch(
  "this.renderer.shadowMap.type = this.quality === 'HIGH' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;",
  "this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;",
  'shadow type'
);
patch(
  "    this.tmpC = new THREE.Vector3();\n",
  "    this.tmpC = new THREE.Vector3();\n    this.cameraLook = new THREE.Vector3();\n    this.cameraLookTarget = new THREE.Vector3();\n    this.cameraInitialized = false;\n    this.aimPoint = new THREE.Vector2();\n    this.muzzleWorld = new THREE.Vector3();\n",
  'camera state'
);
patch(
  "this.pitch = clamp(this.pitch - e.movementY * .0018, -.52, .34);",
  "this.pitch = clamp(this.pitch - e.movementY * .0018, -.35, .28);",
  'desktop camera limits'
);
patch(
  "this.pitch = clamp(this.pitch - (e.clientY - lastY) * .006, -.52, .34);",
  "this.pitch = clamp(this.pitch - (e.clientY - lastY) * .006, -.35, .28);",
  'touch camera limits'
);
patch(
  "    this.pitch = -.12;\n    this.buildLevel(index);",
  "    this.pitch = -.08;\n    this.cameraInitialized = false;\n    this.buildLevel(index);",
  'chapter camera reset'
);
patch(
  "  announce(chapter,done){this.root.classList.add('cinematic');this.ui.announcementKicker.textContent=chapter.kicker;this.ui.announcementTitle.textContent=chapter.title;this.ui.announcementSubtitle.textContent=chapter.subtitle;this.ui.announcement.hidden=false;setTimeout(()=>{this.ui.announcement.hidden=true;done();},1800);}",
  "  announce(chapter,done){this.root.classList.add('cinematic');this.ui.announcement.classList.remove('toast-mode');this.ui.announcementKicker.textContent=chapter.kicker;this.ui.announcementTitle.textContent=chapter.title;this.ui.announcementSubtitle.textContent=chapter.subtitle;this.ui.announcement.hidden=false;setTimeout(()=>{this.ui.announcement.hidden=true;done();},1650);}",
  'chapter announcement'
);
patch(
  "  toast(kicker,title){this.ui.announcementKicker.textContent=kicker;this.ui.announcementTitle.textContent=title;this.ui.announcementSubtitle.textContent='';this.ui.announcement.hidden=false;setTimeout(()=>this.ui.announcement.hidden=true,1050);}",
  "  toast(kicker,title){this.ui.announcement.classList.add('toast-mode');this.ui.announcementKicker.textContent=kicker;this.ui.announcementTitle.textContent=title;this.ui.announcementSubtitle.textContent='';this.ui.announcement.hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>{this.ui.announcement.hidden=true;this.ui.announcement.classList.remove('toast-mode');},900);}",
  'combat notification'
);
patch(
  "    const groundY=type==='zackbell'?.08:type==='apple'?(boss?3.25:.76):type==='orange'?.9:type==='grape'?.7:type==='poo'?(boss?.95:.52):.7;\n    mesh.position.copy(position);mesh.position.y=position.y+groundY;",
  "    mesh.updateMatrixWorld(true);\n    const localBounds=new THREE.Box3().setFromObject(mesh);\n    const groundY=type==='zackbell'?.12:-localBounds.min.y+.08;\n    mesh.position.copy(position);mesh.position.y=position.y+groundY;",
  'enemy ground calculation'
);
patch(
`  updateCamera(dt){
    const forward=this.tmpA.set(Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const desired=this.tmpB.copy(this.player.position).addScaledVector(forward,-7.4);desired.y+=3.7;
    if(this.shake>0){desired.x+=rand(-this.shake,this.shake);desired.y+=rand(-this.shake,this.shake);desired.z+=rand(-this.shake,this.shake);this.shake=Math.max(0,this.shake-dt*2.8);}
    this.camera.position.lerp(desired,1-Math.pow(.001,dt));this.camera.rotation.order='YXZ';this.camera.rotation.y=this.yaw;this.camera.rotation.x=this.pitch;this.camera.rotation.z=0;
  }`,
`  updateCamera(dt){
    const forward=this.tmpA.set(Math.sin(this.yaw),0,-Math.cos(this.yaw));
    const right=this.tmpB.set(Math.cos(this.yaw),0,Math.sin(this.yaw));
    const desired=this.tmpC.copy(this.player.position).addScaledVector(forward,-6.6).addScaledVector(right,1.35);
    desired.y+=2.85;
    this.cameraLookTarget.copy(this.player.position).addScaledVector(forward,14);
    this.cameraLookTarget.y=this.player.position.y+1.35+Math.tan(this.pitch)*10;
    if(this.shake>0){desired.x+=rand(-this.shake,this.shake);desired.y+=rand(-this.shake,this.shake);desired.z+=rand(-this.shake,this.shake);this.shake=Math.max(0,this.shake-dt*2.8);}
    if(!this.cameraInitialized){this.camera.position.copy(desired);this.cameraLook.copy(this.cameraLookTarget);this.cameraInitialized=true;}
    const positionSmooth=1-Math.exp(-dt*10.5),lookSmooth=1-Math.exp(-dt*14);
    this.camera.position.lerp(desired,positionSmooth);
    this.cameraLook.lerp(this.cameraLookTarget,lookSmooth);
    const targetFov=this.dashTime>0?68:62;
    if(Math.abs(this.camera.fov-targetFov)>.03){this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,targetFov,1-Math.exp(-dt*8));this.camera.updateProjectionMatrix();}
    this.camera.lookAt(this.cameraLook);
  }`,
  'shoulder camera'
);
patch(
`  updateEnemies(dt){
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
  }`,
`  updateEnemies(dt){
    const time=performance.now()*.004;
    for(let i=0;i<this.enemies.length;i++){
      const enemy=this.enemies[i];
      if(enemy.dead)continue;
      const p=enemy.mesh.position;
      const dir=this.tmpA.copy(this.player.position).sub(p);dir.y=0;const dist=Math.max(.001,dir.length());dir.multiplyScalar(1/dist);enemy.attack-=dt;
      if(enemy.boss)this.updateBoss(enemy,dt,dist,dir);
      else if(enemy.ranged&&dist>5.5){
        const tangent=this.tmpB.set(-dir.z,0,dir.x).multiplyScalar(enemy.strafe);p.addScaledVector(tangent,enemy.speed*.55*dt);p.addScaledVector(dir,enemy.speed*.15*dt);
        if(enemy.attack<=0){const shotDir=this.tmpC.copy(this.player.position);shotDir.y+=1;shotDir.sub(p).normalize();this.enemyShoot(enemy,shotDir.clone(),enemy.type==='grape'?0x9c6cff:0x82502e);enemy.attack=rand(1.3,2.2);}
      }else{p.addScaledVector(dir,enemy.speed*dt);if(dist<enemy.radius+.9&&enemy.attack<=0){this.damagePlayer(enemy.damage,enemy.type==='poo'?'POO IMPACT':'VITAMIN CONTAMINATION');enemy.attack=.95;p.addScaledVector(dir,-1.1);}}
      enemy.mesh.rotation.y=Math.atan2(dir.x,dir.z)+Math.PI;enemy.mesh.position.y=enemy.groundY+Math.sin(time+i)*.035;
    }
  }`,
  'horizontal enemy movement'
);
patch(
  "    const tangent=this.tmpB.set(-dir.z,0,dir.x).multiplyScalar(enemy.strafe);\n    if(enemy.type==='zackbell'){",
  "    const tangent=this.tmpB.set(-dir.z,0,dir.x).multiplyScalar(enemy.strafe);\n    const aimed=this.tmpC.copy(this.player.position);aimed.y+=1;aimed.sub(enemy.mesh.position).normalize();\n    if(enemy.type==='zackbell'){",
  'boss vertical aim'
);
source = source
  .replaceAll("this.enemyShoot(enemy,dir.clone(),0x82c85c", "this.enemyShoot(enemy,aimed.clone(),0x82c85c")
  .replaceAll("this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.16)", "this.enemyShoot(enemy,aimed.clone().applyAxisAngle(Y_AXIS,a*.16)")
  .replaceAll("this.enemyShoot(enemy,dir.clone(),0xff514c", "this.enemyShoot(enemy,aimed.clone(),0xff514c")
  .replaceAll("this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.18)", "this.enemyShoot(enemy,aimed.clone().applyAxisAngle(Y_AXIS,a*.18)")
  .replaceAll("this.enemyShoot(enemy,dir.clone(),0x7a431f", "this.enemyShoot(enemy,aimed.clone(),0x7a431f")
  .replaceAll("this.enemyShoot(enemy,dir.clone().applyAxisAngle(Y_AXIS,a*.14)", "this.enemyShoot(enemy,aimed.clone().applyAxisAngle(Y_AXIS,a*.14)");
patch(
  "    const caps=[5,6,7,7],cap=this.quality==='LOW'?Math.max(4,caps[this.chapter]-1):caps[this.chapter];",
  "    const caps=[5,6,7,7],cap=this.quality==='LOW'?Math.max(3,caps[this.chapter]-2):this.quality==='MEDIUM'?Math.max(4,caps[this.chapter]-1):caps[this.chapter];",
  'enemy population'
);
patch(
  "    if(this.projectiles.length>(this.quality==='LOW'?22:34))return;",
  "    if(this.projectiles.length>(this.quality==='LOW'?14:this.quality==='MEDIUM'?22:30))return;",
  'projectile population'
);
patch(
  "    this.raycaster.setFromCamera(new THREE.Vector2(offsetX,0),this.camera);const hits=this.raycaster.intersectObjects(this.shootables,true);",
  "    this.aimPoint.set(offsetX,0);this.raycaster.setFromCamera(this.aimPoint,this.camera);const hits=this.raycaster.intersectObjects(this.shootables,true);",
  'raycast allocation'
);
patch(
  "    const origin=new THREE.Vector3();this.muzzle.getWorldPosition(origin);this.tracer(origin,hitPoint);",
  "    const origin=this.muzzleWorld;this.muzzle.getWorldPosition(origin);this.tracer(origin,hitPoint);",
  'muzzle allocation'
);

const style = document.createElement('style');
style.textContent = `
.announcement.toast-mode{inset:auto 14px auto auto;top:48px;width:min(300px,calc(100% - 28px));display:block;text-align:right;padding:10px 12px;background:rgba(9,11,15,.72);border:1px solid rgba(255,255,255,.18);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.4);backdrop-filter:blur(7px);text-shadow:none}
.announcement.toast-mode small{font-size:7px;letter-spacing:.16em}.announcement.toast-mode h2{font-size:18px;line-height:1;margin:4px 0 0;letter-spacing:-.025em}.announcement.toast-mode p{display:none}
.game-root:not(.cinematic) .chapter-chip{opacity:.5}.objective-card{opacity:.78}.hud-left{opacity:.86}.boss-hud{opacity:.9}
@media (pointer:coarse),(max-width:760px){.announcement.toast-mode{top:36px;right:8px;width:190px;padding:7px 9px}.announcement.toast-mode h2{font-size:13px}.objective-card{opacity:.7}.hud-left{opacity:.8}}
`;
document.head.append(style);

const patchedUrl = URL.createObjectURL(new Blob([source + '\n//# sourceURL=game-runtime-patched.js'], { type: 'text/javascript' }));
try {
  await import(patchedUrl);
} finally {
  URL.revokeObjectURL(patchedUrl);
}
