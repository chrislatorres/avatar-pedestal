import * as THREE from 'three';
import {scene, renderer, camera, runtime, world, physics, ui, app, appManager} from 'app';

// test
// MIRROR
import {Reflector} from './Reflector.js';

const localVector = new THREE.Vector3();
const localMatrix = new THREE.Matrix4();

const mirrorWidth = 2;
const mirrorHeight = 2;
const mirrorDepth = 0.1;
const mirrorMesh = (() => {
  const geometry = new THREE.PlaneBufferGeometry(mirrorWidth, mirrorHeight)
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1, 0));
  const mesh = new Reflector(geometry, {
    clipBias: 0.003,
    textureWidth: 2048 * window.devicePixelRatio,
    textureHeight: 2048 * window.devicePixelRatio,
    color: 0x889999,
    addColor: 0x300000,
    recursion: 1,
    transparent: true,
  });
  mesh.position.set(0, 0, 0);

  const borderMesh = new THREE.Mesh(
    new THREE.BoxBufferGeometry(mirrorWidth + mirrorDepth, mirrorHeight + mirrorDepth, mirrorDepth)
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1, -mirrorDepth/2 - 0.01)),
    new THREE.MeshPhongMaterial({
      color: 0x000000,
    })
  );
  mesh.add(borderMesh);

  mesh.onBeforeRender2 = () => {
    app.onBeforeRender();
  };
  mesh.onAfterRender2 = () => {
    app.onAfterRender();
  };

  return mesh;
})();
app.object.add(mirrorMesh);

const physicsId = physics.addBoxGeometry(mirrorMesh.position, mirrorMesh.quaternion, new THREE.Vector3(mirrorWidth, mirrorHeight, mirrorDepth).multiplyScalar(0.5), false);


// AVATARS
(async () => {
  const u = 'pod.glb';
  const fileUrl = app.files['./' + u];
  const res = await fetch(fileUrl);
  const file = await res.blob();
  file.name = u;
  const mesh = await runtime.loadFile(file, {
    optimize: false,
  });
  app.object.add(mesh);
  
  const textMesh = ui.makeTextMesh('Stand And Click For Avatars', undefined, 0.2, 'center', 'middle');
  textMesh.color = 0xCCCCCC;
  textMesh.position.y = 2.25;
  app.object.add(textMesh);

  let close;
  const _getClose = () => {
    const transforms = physics.getRigTransforms();
    const position = transforms[0].position.clone()
      .applyMatrix4(localMatrix.copy(app.object.matrixWorld).invert());

    const distance = position.distanceTo(mesh.position);
    if (distance < 2) {
      return mesh;
    } else {
      return null;
    }
  };

  let currentAvatar;
  let lock = false;
  window.addEventListener('click', async (e) => {
    if (!lock && close) {
      lock = true;

      const quaternion = app.object.quaternion.clone().setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), Math.PI / 2 );
      const position = app.object.position.clone();
      console.log("position2", position);


      const avatars = ["teal.vrm", "suit.vrm"];

      try {
        if (currentAvatar) {
          console.log("currentAvatar removing", currentAvatar);
          await world.removeObject(currentAvatar);
        }
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        const u = app.files['./' + randomAvatar];
        await world.addObject(u, app.appId, position, quaternion); // XXX

        const objects = world.getObjects();
        objects.forEach(obj => {
          if (obj.contentId === u)  {
            currentAvatar = obj.instanceId;
            lock = false;
          }
        });
      } catch(err) {
        console.warn(err);
        lock = false;
      }
    }
  });

  let lastTimestamp = performance.now();
  renderer.setAnimationLoop((timestamp, frame) => {
    timestamp = timestamp || performance.now();
    const timeDiff = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    const now = Date.now();

    close = _getClose();
/*
    mesh.scale.setScalar(mesh === close ? 2 : 1);
    textMesh.scale.setScalar(mesh === close ? 2 : 1);
    mirrorMesh.scale.setScalar(mesh === close ? 2 : 1);
*/
  });
})();
