import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

//import { createBackground } from './three-vignette.js';

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { environments } from './environment/index.js';

import { getCubeMapTexture, traverseMaterials } from './helpers.js';

const ASSET = new URL('../assets/worldmap2.glb', import.meta.url);
const pointer = new THREE.Vector2();
let camera, orbit, content, renderer, scene, pmremGenerator, mixer, water, sky, sun, raycaster, INTERSECTED;
const clock = new THREE.Clock();
/* const stats = new THREE.Stats();
document.body.appendChild(stats.dom); */

/* const setupListeners = () => {
    // Rotation
    document.getElementById('cameraRotationX').addEventListener('change', ev => {
        cameraRotationX = Number(document.getElementById('cameraRotationX').value);
        console.log(`Rotation x=${cameraRotationX} y=${cameraRotationY} z=${cameraRotationZ}`);
        document.getElementById('currentValueCameraRotationX').innerText = cameraRotationX;
        camera.rotation.set(cameraRotationX, cameraRotationY, cameraRotationZ);
        orbit.update();
    });
    document.getElementById('cameraRotationY').addEventListener('change', ev => {
        cameraRotationY = Number(document.getElementById('cameraRotationY').value);
        console.log(`Rotation x=${cameraRotationX} y=${cameraRotationY} z=${cameraRotationZ}`);
        document.getElementById('currentValueCameraRotationY').innerText = cameraRotationY;
        camera.rotation.set(cameraRotationX, cameraRotationY, cameraRotationZ);
        orbit.update();
    });
    document.getElementById('cameraRotationZ').addEventListener('change', ev => {
        cameraRotationZ = Number(document.getElementById('cameraRotationZ').value);
        console.log(`Rotation x=${cameraRotationX} y=${cameraRotationY} z=${cameraRotationZ}`);
        document.getElementById('currentValueCameraRotationZ').innerText = cameraRotationZ;
        camera.rotation.set(cameraRotationX, cameraRotationY, cameraRotationZ);
        orbit.update();
    });
    // Location
    document.getElementById('cameraLocationX').addEventListener('change', ev => {
        cameraLocationX = Number(document.getElementById('cameraLocationX').value);
        console.log(`Location x=${cameraLocationX} y=${cameraLocationY} z=${cameraLocationZ}`);
        document.getElementById('currentValueCameraLocationX').innerText = cameraLocationX;
        camera.position.set(cameraLocationX, cameraLocationY, cameraLocationZ);
        orbit.update();
    });
    document.getElementById('cameraLocationY').addEventListener('change', ev => {
        cameraLocationY = Number(document.getElementById('cameraLocationY').value);
        console.log(`Location x=${cameraLocationX} y=${cameraLocationY} z=${cameraLocationZ}`);
        document.getElementById('currentValueCameraLocationY').innerText = cameraLocationY;
        camera.position.set(cameraLocationX, cameraLocationY, cameraLocationZ);
        orbit.update();
    });
    document.getElementById('cameraLocationZ').addEventListener('change', ev => {
        cameraLocationZ = Number(document.getElementById('cameraLocationZ').value);
        console.log(`Location x=${cameraLocationX} y=${cameraLocationY} z=${cameraLocationZ}`);
        document.getElementById('currentValueCameraLocationZ').innerText = cameraLocationZ;
        camera.position.set(cameraLocationX, cameraLocationY, cameraLocationZ);
        orbit.update();
    });
}; */

const addLights = () => {
    const ambient = new THREE.AmbientLight(0xffffff, 0.001, 100);
    ambient.position.set(-7, -7, 35);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight();
    scene.add(hemiLight);

    const light1 = new THREE.AmbientLight(16777215, 0.3);
    light1.name = 'ambient_light';
    scene.add(light1);

    const light2 = new THREE.AmbientLight(16777215, 2.5132741228718345);
    light2.name = 'ambient_light';
    scene.add(light2);
};

const createScene = () => {
    /* const vignette = createBackground({
        aspect: window.innerWidth / window.innerHeight,
        grainScale: 0.001, // mattdesl/three-vignette-background#1
        colors: ['#ffffff', '#353535']
    });
    vignette.name = 'Vignette';
    vignette.renderOrder = -1; */

    scene = new THREE.Scene();
    //scene.add(vignette);

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.environment = neutralEnvironment;

    /* const environment = environments.find((e) => e.id === 'venice-sunset');
    getCubeMapTexture(environment, pmremGenerator).then(({ envMap }) => {
        scene.environment = envMap;
    }); */

    raycaster = new THREE.Raycaster();
};

const setupCamera = () => {
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 70;
    camera.position.z = 40;
};

const setupOrbit = () => {
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.minDistance = 40;
    orbit.maxDistance = 100;
    //orbit.enableRotate = false;
    orbit.update();
};

const createRenderer = () => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xcccccc);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    //renderer.toneMapping = THREE.ACESFilmicToneMapping;
    //renderer.toneMappingExposure = 1;

    renderer.setClearColor(0x0c0c0c);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
};

const loadAsset = () => {
    const MANAGER = new THREE.LoadingManager();
    const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`
    const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(`${THREE_PATH}/examples/js/libs/draco/gltf/`);
    const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(`${THREE_PATH}/examples/js/libs/basis/`);

    const assetLoader = new GLTFLoader(MANAGER)
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(renderer))
        .setMeshoptDecoder(MeshoptDecoder);

    assetLoader.load(ASSET.href, function (gltf) {
        console.log('gltf', gltf);

        const scene = gltf.scene || gltf.scenes[0];
        const clips = gltf.animations || [];

        // Hide borders
        gltf.scene.children.forEach(child => {
            console.log('INIT SCENE')

            if (child.material) child.originalMaterial = child.material;

            if (child.isMesh && child.name.endsWith('001')) {
                child.visible = false;
                child.scale.y = 50;
                console.log(child)
            } else if (child.isMesh && child.name === 'Water') {
                child.visible = false;
            }

            child.originalPosition = {
                x: child.position.x,
                y: child.position.y,
                z: child.position.z
            };
        });

        setContent(scene, clips);

        // Play a certain animation
        // const clip = THREE.AnimationClip.findByName(clips, 'HeadAction');
        // const action = mixer.clipAction(clip);
        // action.play();
    }, undefined, function (error) {
        console.error(error);
    });
};

window.showAllBorders = function() {
    console.log('BALLE')
    content.children.forEach(child => {
        if (child.isMesh && child.name.endsWith('001')) {
            console.log(child)
            child.forceShow = true;
            child.visible = true;
        }
    });
}

const addWater = () => {
    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('src/assets/waternormals.jpg', function (texture) {
                console.log(texture);
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x049dd9,
            distortionScale: 3,
            fog: scene.fog !== undefined
        }
    );
    water.rotation.x = - Math.PI / 2;

    scene.add(water);

    water.position.set(0, 10.2, 0)

    water.updateMatrix();
}

const addSky = () => {
    sun = new THREE.Vector3();
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 180
    };

    let renderTarget;

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms['sunPosition'].value.copy(sun);
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        if (renderTarget !== undefined) renderTarget.dispose();

        renderTarget = pmremGenerator.fromScene(sky);

        scene.environment = renderTarget.texture;
    }

    updateSun();
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

const init = () => {
    document.addEventListener('mousemove', onPointerMove);

    createRenderer();
    createScene();
    addLights();
    setupCamera();
    setupOrbit();
    addWater();
    addSky();
    loadAsset();
};

init();

const setContent = (object, clips) => {
    mixer = new THREE.AnimationMixer(object);

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());

    object.position.x += (object.position.x - center.x);
    object.position.y += (object.position.y - center.y);
    object.position.z += (object.position.z - center.z);

    camera.near = size / 100;
    camera.far = size * 100;
    camera.updateProjectionMatrix();

    scene.add(object);
    content = object;

    updateTextureEncoding();

    clips.forEach(clip => {
        mixer.clipAction(clip).reset().play();
    });
}

const updateTextureEncoding = () => {
    const encoding = THREE.sRGBEncoding;
    traverseMaterials(content, (material) => {
        if (material.map) material.map.encoding = encoding;
        if (material.emissiveMap) material.emissiveMap.encoding = encoding;
        if (material.map || material.emissiveMap) material.needsUpdate = true;
    });
}

function onHover(item) {
    content.children.filter(x => x.name.endsWith('001')).forEach(x => {
        if (!x.forceShow) x.visible = false
    });
    const border = content.children.find(x => x.name === item.name + '001');
    if (border) {
        border.visible = true;
        border.hover = true;
    }
    //item.material = new THREE.MeshPhongMaterial({color: 0xff0000});

    document.querySelector('canvas').classList.add('pointer');

    item.hover = true;
}

function restoreAllHoverEffects() {
    document.querySelector('canvas').classList.remove('pointer');
    content.children.forEach(x => x.hover = false);
    content.children.filter(x => x.name.endsWith('001')).forEach(x => {
        if (!x.forceShow) x.visible = false
    });
    content.children.forEach(x => {
        if (x.originalMaterial) x.material = x.originalMaterial
    });
    INTERSECTED = null;
}

function animate() {
    if (mixer) mixer.update(clock.getDelta());

    water.material.uniforms['time'].value += (1.0 / 260.0);
    // find intersections

    raycaster.setFromCamera(pointer, camera);

    if (content) {
        content.children.forEach(x => {
            if (x.hover) {
                if ((x.position.y + 0.1) < (x.originalPosition.y + 1.5)) {
                    x.position.y += 0.1;
                } else {
                    x.position.y = x.originalPosition.y + 1.5;
                }
            } else if (x.hover === false) {
                if ((x.position.y - 0.1) > x.originalPosition.y) {
                    x.position.y -= 0.1;
                } else {
                    x.position.y = x.originalPosition.y;
                }
            }
        });

        const intersects = raycaster.intersectObjects(content.children, false);
    
        if (intersects.length > 0) {
            if (INTERSECTED != intersects[0].object) {
                restoreAllHoverEffects();
                INTERSECTED = intersects[0].object;

                if (!INTERSECTED.name.endsWith('001')) {
                    if (INTERSECTED.name !== 'Water') {
                        onHover(INTERSECTED);
                    } else {
                        restoreAllHoverEffects();
                    }
                } else if (INTERSECTED.name.endsWith('001')) { // Hover on border
                    const correspondingItem = content.children.find(x => x.name === INTERSECTED.name.replace('001', ''));
                    if (correspondingItem) {
                        onHover(correspondingItem);
                    }
                }
            }
        } else {
            //if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
            console.log('no intersects');
            restoreAllHoverEffects();
        }
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});