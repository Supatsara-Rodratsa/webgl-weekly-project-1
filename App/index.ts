import {
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  Mesh,
  TextureLoader,
  Object3D,
  SRGBColorSpace,
  DirectionalLight,
  DirectionalLightHelper,
  PCFSoftShadowMap,
  PlaneGeometry,
  EquirectangularReflectionMapping,
  ShadowMaterial,
  AnimationMixer,
  Clock,
  Raycaster,
  Vector2,
  Vector3,
  MeshStandardMaterial,
} from "three";

import Stats from "three/examples/jsm/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GroundProjectedSkybox } from "three/examples/jsm/objects/GroundProjectedSkybox";
import GUI from "lil-gui";

/**
 * Setup Loader and GUI
 */
const TL = new TextureLoader();
const GL = new GLTFLoader();
const clock = new Clock();

export default class App {
  private _renderer: WebGLRenderer;
  private _camera: PerspectiveCamera;
  private _controls: OrbitControls;
  private _stats: Stats;
  private _scene: Scene;
  private _mixer: AnimationMixer;
  private _directionalLight: DirectionalLight;
  private _gui: GUI;
  private _raycaster: Raycaster;
  private _mouse: Vector2;
  private _directionalLightHelper: DirectionalLightHelper;
  private _activeElement: Object3D | undefined;
  private _mario: Mesh;
  private _guiInitialized: boolean = false;

  constructor() {
    this._scene = new Scene();
    this._stats = new Stats();
    this._gui = new GUI();
    this._raycaster = new Raycaster();
    this._mouse = new Vector2(-10, -10);
    document.body.appendChild(this._stats.dom);
    this._init();
  }

  _init() {
    // 3D Render Location
    this._renderer = new WebGLRenderer({
      canvas: document.getElementById("canvas") as HTMLCanvasElement,
    });
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    // Shadow Map Setting
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = PCFSoftShadowMap;

    // Camera Setting
    const aspect = window.innerWidth / window.innerHeight;
    this._camera = new PerspectiveCamera(60, aspect, 1, 100);
    this._camera.position.set(0, 4.5, 15);

    // Orbit Setting
    this._controls = new OrbitControls(this._camera, this._renderer.domElement);

    // RAYCASTER
    const origin = new Vector3(-10, 0, 0);
    const direction = new Vector3(1, 0, 0);
    direction.normalize();
    this._raycaster.set(origin, direction);

    this._render();

    this._initShadow();
    this._initWall();

    this._initMarioModel();
    this._initLights();
    this._initEvents();
    this._animate();
  }

  _initMarioModel() {
    GL.load("/models/mario_dancing/scene.gltf", (model) => {
      console.log("mario loaded", model);
      const mario = model.scene;
      mario.position.z += 6;
      mario.scale.setScalar(1.5);
      mario.traverse((el: Object3D) => {
        if (el instanceof Mesh) {
          // el.isMesh  el.isSkinnedMesh
          this._mario = el;
          el.castShadow = true;
          el.material.map.colorSpace = SRGBColorSpace;
          const originalMaterial = el.material;
          el.material = new MeshStandardMaterial({
            map: originalMaterial.map,
            roughness: 0.5,
            metalness: 0.8,
          });
        }
      });

      // Playing animation
      this._mixer = new AnimationMixer(mario);
      const action = this._mixer.clipAction(model.animations[0]);
      action.play();

      this._scene.add(mario);

      if (!this._guiInitialized) {
        this._initGUI(); // Initialize GUI only once after model is loaded
        this._guiInitialized = true;
      }
    });
  }

  _initWall() {
    const t = TL.load("/background.jpeg");
    t.mapping = EquirectangularReflectionMapping;
    t.colorSpace = SRGBColorSpace;
    this._scene.environment = t;
    this._scene.background = t;

    // Ground Setting
    const gp = new GroundProjectedSkybox(t);
    gp.scale.setScalar(20);
    this._scene.add(gp);
  }

  _initShadow() {
    const geo = new PlaneGeometry(1, 1, 1, 1);
    const mat = new ShadowMaterial();
    mat.opacity = 0.3;
    const mesh = new Mesh(geo, mat);
    mesh.scale.set(20, 20, 20);
    mesh.receiveShadow = true;
    mesh.rotation.x = -Math.PI * 0.5;
    this._scene.add(mesh);
  }

  _animate() {
    this._stats.begin();
    window.requestAnimationFrame(this._animate.bind(this));
    if (this._mixer) {
      this._mixer.update(clock.getDelta());
    }
    this._renderer.render(this._scene, this._camera);
    this._initCastRay();
    this._stats.end();
  }

  _initCastRay() {
    // CAST RAY
    this._raycaster.setFromCamera(this._mouse, this._camera);
    if (this._mario) {
      const result = this._raycaster.intersectObject(this._mario);

      if (result && result.length) {
        const closest = result[0].object;
        this._activeElement = closest;
        if (this._activeElement.parent?.name === "Object_4") {
          this._activeElement.parent.scale.setScalar(1.2);
        }
      } // NO INTERSECTIONS
      else {
        if (this._activeElement) {
          this._activeElement = this._mario;
          if (this._activeElement.parent?.name === "Object_4") {
            this._activeElement.parent.scale.setScalar(1);
          }
        }
        this._activeElement = undefined;
      }
    }
  }

  _onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    this._camera.aspect = aspect;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _onMouseMove(e) {
    this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _initLights() {
    const directionalLight = new DirectionalLight(0xffffff);
    directionalLight.intensity = 2;
    directionalLight.castShadow = true;
    directionalLight.position.set(5, 5, 5);
    directionalLight.shadow.mapSize.width = 512;
    directionalLight.shadow.mapSize.height = 512;
    directionalLight.shadow.camera.far = 15;
    directionalLight.shadow.camera.left = -7;
    directionalLight.shadow.camera.right = 7;
    directionalLight.shadow.camera.bottom = -7;
    directionalLight.shadow.camera.top = 7;

    this._directionalLight = directionalLight;
    this._scene.add(this._directionalLight);

    const directionalLightHelper = new DirectionalLightHelper(
      this._directionalLight
    );
    this._directionalLightHelper = directionalLightHelper;
    this._scene.add(this._directionalLightHelper);
  }

  _initEvents() {
    window.addEventListener("resize", this._onResize.bind(this));
    window.addEventListener("pointermove", this._onMouseMove.bind(this));
  }

  _render() {
    this._renderer.render(this._scene, this._camera);
  }

  _initGUI() {
    this._gui
      .add(this._directionalLight, "intensity", 0, 10, 0.1)
      .name("Dir Light intensity");
    this._gui
      .add(this._directionalLight.position, "x", -2, 4, 0.1)
      .name("Dir Light X");
    this._gui
      .add(this._directionalLight.position, "y", 3, 10, 0.1)
      .name("Dir Light Y");
    this._gui
      .add(this._directionalLight.position, "z", -0.1, 10, 0.1)
      .name("Dir Light Z");
    this._gui
      .add(this._directionalLightHelper, "visible")
      .name("Dir Light visibility");
    this._gui
      .add(this._mario.material, "metalness", 0, 1, 0.01)
      .name("Mario Metalness");
    this._gui
      .add(this._mario.material, "roughness", 0, 1, 0.01)
      .name("Mario Roughness");
  }
}
