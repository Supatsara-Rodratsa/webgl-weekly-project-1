import {
  PerspectiveCamera,
  WebGLRenderer,
  DirectionalLight,
  Scene,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
} from 'three';

import  Stats from 'three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const GL = new GLTFLoader();

export default class App {
  private _renderer: WebGLRenderer;
  private _camera: PerspectiveCamera;
  private _mesh: any;
  private _controls: OrbitControls;
  private _stats: Stats;
  private _scene: Scene;

  constructor() {
    this._scene = new Scene();
    this._stats = new Stats();
    document.body.appendChild(this._stats.dom);
    this._init();
  }

  _init() {
    this._renderer = new WebGLRenderer({
      canvas: document.getElementById('canvas') as HTMLCanvasElement,
    });
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new PerspectiveCamera(70, aspect, 0.1, 100);

    this._camera.position.set(0, 0, 5);

    this._controls = new OrbitControls(this._camera, this._renderer.domElement);

    this._render();

    this._createCube();
    this._createAvocado();
    this._initLights();
    this._initEvents();
    this._animate();
  }

  _createCube() {
    const geometry = new BoxGeometry();
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    this._mesh = mesh;
    this._scene.add(this._mesh);
  }

  _createAvocado() {
    GL.load('/models/Avocado/Avocado.gltf', (model) => {
      const avocado = model.scene.children[0]
      avocado.scale.setScalar(20)
      this._scene.add(avocado)
    })
  }

  _animate() {
    this._stats.begin();
    window.requestAnimationFrame(this._animate.bind(this));
    this._renderer.render(this._scene, this._camera);
    this._stats.end();
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _initLights() {
    const dl = new DirectionalLight();
    dl.position.set(1, 1, 4);
    dl.intensity = 15;
    this._scene.add(dl);
  }

  _initEvents() {
    window.addEventListener('resize', this._onResize.bind(this));
  }

  _render() {
    this._renderer.render(this._scene, this._camera);
  }
}
