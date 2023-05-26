import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { camera } from './camera';
import { sizes } from './sizes';

class Renderer {
  public readonly canvas = document.createElement('canvas');
  private renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
  private controls = new OrbitControls(camera.camera, this.canvas);
  public readonly scene = new THREE.Scene();

  constructor() {
    this.initCanvas();
    this.controls.enableDamping = true;
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 750;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * (3 / 4);
    this.controls.minPolarAngle = Math.PI / 4;
    //水平方向にどこまで周回できるか、上限。設定する場合、間隔 [ min, max ] は、( max - min < 2 PI ) である [ - 2 PI, 2 PI ] の部分間隔である必要があります。デフォルトは無限大です。
    this.controls.maxAzimuthAngle = Math.PI / 4;
    this.controls.minAzimuthAngle = -Math.PI / 4;

    this.resize();
  }

  private initCanvas() {
    this.canvas.style.display = 'block';
    document.body.appendChild(this.canvas);
  }

  public resize() {
    camera.resize();
    this.renderer.setSize(sizes.width, sizes.height);
    this.renderer.setPixelRatio(sizes.pixelRatio);
  }

  public update() {
    this.controls.update();
    this.renderer.render(this.scene, camera.camera);
  }

  public dispose() {
    this.controls.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}

export const renderer = new Renderer();
