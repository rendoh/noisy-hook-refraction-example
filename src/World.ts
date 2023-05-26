import GUI from 'lil-gui';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import backfaceFragmentShader from './backfaceFragment.glsl';
import backfaceVertexShader from './backfaceVertex.glsl';
import { clock } from './core/clock';
import { sizes } from './core/sizes';
import duckGltf from './duck.glb?url';
import glassNormalMap from './normal.jpg?url';

const gui = new GUI();

const config = {
  uNoiseStrength: 2.5,
  normalMap: true,
  thickness: 100,
  uPatternSize: 50000,
};

const glassNormalMapTexture = new THREE.TextureLoader().load(glassNormalMap);
const noisyGlassMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0.15,
  transmission: 1,
  color: 0xffffff,
  normalMap: glassNormalMapTexture,
});
const uniforms = {
  uTime: { value: clock.elapsed / 1000 },
  uNoiseStrength: { value: config.uNoiseStrength },
};

gui.add(config, 'uNoiseStrength', 0, 10, 0.1).onChange((value: number) => {
  uniforms.uNoiseStrength.value = value;
});

gui.add(config, 'uPatternSize', 500, 50000, 1);

gui.add(config, 'normalMap').onChange((value: boolean) => {
  noisyGlassMaterial.normalMap = value ? glassNormalMapTexture : null;
  noisyGlassMaterial.needsUpdate = true;
});

gui.add(config, 'thickness', 0, 200, 1).onChange((value: number) => {
  noisyGlassMaterial.thickness = value;
});

clock.addEventListener('tick', () => {
  uniforms.uTime.value = clock.elapsed / 1000;
});

noisyGlassMaterial.thickness = config.thickness;

noisyGlassMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = uniforms.uTime;
  shader.uniforms.uNoiseStrength = uniforms.uNoiseStrength;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `
    uniform float uTime;
    uniform float uNoiseStrength;
    #include <common>
    `,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <transmission_fragment>',
    THREE.ShaderChunk.transmission_fragment.replace(
      'vec3 pos = vWorldPosition;',
      `
        vec3 pos = vWorldPosition;
        pos.x = pos.x + rand(pos.xy) * uNoiseStrength;
        pos.y = pos.y + rand(pos.yx) * uNoiseStrength;
      `,
    ),
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <output_fragment>',
    `
    outgoingLight *= 2.;
    #include <output_fragment>
    `,
  );
};

class Duck {
  private loader = new GLTFLoader();
  public scene = new THREE.Scene();
  private gltf?: GLTF;
  private disposed = false;
  constructor() {
    this.init();
  }

  private async init() {
    this.gltf = await this.loader.loadAsync(duckGltf);
    if (this.disposed) {
      this.dispose();
      return;
    }

    const duck = this.gltf.scene.children[0].children[0] as THREE.Mesh;
    duck.rotateY(-Math.PI / 2);
    duck.translateY(-200);
    duck.scale.setScalar(2.5);
    (duck.material as THREE.MeshStandardMaterial).map?.dispose();
    (duck.material as THREE.MeshStandardMaterial).dispose();
    duck.material = noisyGlassMaterial;
    this.scene.add(duck);
  }

  public dispose() {
    this.disposed = true;
    this.gltf?.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        obj.material.dispose();
      }
    });
  }
}

export class World {
  public scene = new THREE.Scene();
  private box: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial>;
  private plane: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private duck = new Duck();

  constructor() {
    const planeGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const planeMaterial = new THREE.ShaderMaterial({
      vertexShader: backfaceVertexShader,
      fragmentShader: backfaceFragmentShader,
      uniforms: {
        uTime: { value: clock.elapsed / 1000 },
        uResolution: { value: new THREE.Vector2(sizes.width, sizes.height) },
        uPatternSize: { value: config.uPatternSize },
      },
    });
    this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.scene.add(this.plane);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 500, 500);
    this.scene.add(light);

    // const DirectionalLightHelper = new THREE.DirectionalLightHelper(
    //   light,
    //   100,
    //   0xff0000,
    // );
    // this.scene.add(DirectionalLightHelper);

    const boxGeometry = new RoundedBoxGeometry(300, 300, 300, 5, 25);
    this.box = new THREE.Mesh(boxGeometry, noisyGlassMaterial);
    this.scene.add(this.box);

    this.scene.add(this.duck.scene);

    this.resize();
  }

  public resize() {
    this.plane.scale.x = sizes.width;
    this.plane.scale.y = sizes.height;
    this.plane.material.uniforms.uResolution.value.set(
      sizes.width,
      sizes.height,
    );

    const scale = Math.min(sizes.width, sizes.height) / 1280;
    this.box.position.z = 200;
    this.box.position.x = -280 * scale;
    this.duck.scene.position.z = 200;
    this.duck.scene.position.x = 280 * scale;
    this.box.scale.setScalar(scale);
    this.duck.scene.scale.setScalar(scale);
  }

  public update() {
    const scale = Math.min(sizes.width, sizes.height) / 1280;
    this.box.rotation.x = clock.elapsed / 3000;
    this.box.rotation.y = clock.elapsed / 3000;
    this.duck.scene.rotation.y = clock.elapsed / 3000;
    this.duck.scene.rotation.z = Math.sin(clock.elapsed / 1000) * (Math.PI / 6);
    this.duck.scene.position.y = Math.sin(clock.elapsed / 1000) * (scale * 90);
    this.plane.material.uniforms.uTime.value = clock.elapsed / 1000;
    this.plane.material.uniforms.uPatternSize.value = config.uPatternSize;
  }

  public dispose() {
    this.box.geometry.dispose();
    this.box.material.dispose();
    this.plane.geometry.dispose();
    this.plane.material.dispose();
  }
}
