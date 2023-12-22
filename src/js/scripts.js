import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

//import { createBackground } from './three-vignette.js';

import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { environments } from './environment/index.js';

import { getCubeMapTexture, traverseMaterials } from './helpers.js';

const MAP_ASSET = new URL('../assets/worldmap2.glb', import.meta.url);
const SOLDIER_ASSET = new URL('../assets/risksoldier.glb', import.meta.url);
const pointer = new THREE.Vector2();
let camera, orbit, content, renderer, scene, pmremGenerator, water, sky, sun, raycaster, INTERSECTED;
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
    const ambient = new THREE.AmbientLight(0xffffff, 0.01, 20);
    ambient.position.set(-7, -7, 35);
    //scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0x000000, 0.3);
    //scene.add(hemiLight);

    const light1 = new THREE.AmbientLight(16777215, 0.3);
    light1.name = 'ambient_light';
    //scene.add(light1);

    const light2 = new THREE.AmbientLight(16777215, 2.5132741228718345);
    light2.name = 'ambient_light';
    //scene.add(light2);

    const directionalLight = new THREE.SpotLight(0x8888ff, 190);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.position.set(0, 85, 0)
    //directionalLight.rotation.set(0, 0, 2);
    directionalLight.shadow.radius = 150;
    directionalLight.shadow.bias = -0.0000005;

    scene.add(directionalLight);
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
        0.001,
        1000
    );
    camera.position.x = 0;
    camera.position.y = 50;
    camera.position.z = 0;
};

const setupOrbit = () => {
    orbit = new OrbitControls(camera, renderer.domElement);
    //orbit.minDistance = 40;
    //orbit.maxDistance = 100;
    //orbit.enableRotate = false;
    orbit.rotateSpeed = 12;
    orbit.panSpeed = 12;
    orbit.zoomSpeed = 12;
    //orbit.minDistance = 0;
    //orbit.maxDistance = 20;
    orbit.update();
};

const createRenderer = () => {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(0xcccccc);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    //renderer.toneMapping = THREE.ACESFilmicToneMapping;
    //renderer.toneMappingExposure = 1;

    renderer.setClearColor(0x0c0c0c);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
};

let animationActions = [];
let activeActionIndex;

let idleAction1, idleAction2, startAimingAction, startAimingSittingAction;
let actions = [];
let singleStepMode = false;

let mixers = [];
let soldiers = [];

const loadAsset = () => {
    const MANAGER = new THREE.LoadingManager();
    const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`
    const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(`${THREE_PATH}/examples/js/libs/draco/gltf/`);
    const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(`${THREE_PATH}/examples/js/libs/basis/`);

    const greenMaterial = new THREE.MeshPhongMaterial({ color: '#53E239' });
    greenMaterial.receiveShadow = true;

    const redMaterial = new THREE.MeshPhongMaterial({ color: '#CC3030' });
    redMaterial.receiveShadow = true;

    const materials = [
        greenMaterial,
        redMaterial
    ];

    const assetLoader = new GLTFLoader(MANAGER)
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(renderer))
        .setMeshoptDecoder(MeshoptDecoder);

    assetLoader.load(SOLDIER_ASSET.href, function (gltf) {
        console.log('soldier gltf', gltf);
        gltf.scene.traverse(function (obj) { obj.frustumCulled = false; });

        animationActions = gltf.animations;
        
        for (var i = 0; i < 2; i++) {
            const soldierModel = gltf.scene.children[0];
            const soldierClone = SkeletonUtils.clone(soldierModel);

            let mm = new THREE.AnimationMixer(soldierClone);
            mm.addEventListener('finished', function (e) {
                console.log('FINISHED');
            });
            mixers.push(mm);

            let idle = mm.clipAction(animationActions.find(x => x.name === 'Idle1'));
            let startAiming = mm.clipAction(animationActions.find(x => x.name === 'StartAiming'));
            startAiming.setLoop(THREE.LoopOnce);
            startAiming.clampWhenFinished = true;

            soldierClone.customActions = {
                idle,
                startAiming
            }

            soldiers.push(soldierClone);
            console.log('soldierClone', soldierClone)

            soldierClone.frustumCulled = false;

            soldierClone.position.x = 0 + (i * 20);
            soldierClone.position.y = 0;
            soldierClone.position.z = -50;

            soldierClone.scale.x = 2;
            soldierClone.scale.y = 2;
            soldierClone.scale.z = 2;

            console.log('soldierClone.scale', soldierClone.scale)

            scene.add(soldierClone);
        }
        activateAllActions();
    });

    assetLoader.load(MAP_ASSET.href, function (gltf) {
        console.log('map gltf', gltf);

        gltf.scene.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        });

        const scene = gltf.scene || gltf.scenes[0];

        const mixerForMap = new THREE.AnimationMixer(scene);
        mixerForMap.addEventListener('finished', function (e) {
            console.log('FINISHED');
        });

        animationActions = gltf.animations;

        idleAction1 = mixerForMap.clipAction(animationActions.find(x => x.name === 'Idle'));
        idleAction2 = mixerForMap.clipAction(animationActions.find(x => x.name === 'Idle2'));
        startAimingAction = mixerForMap.clipAction(animationActions.find(x => x.name === 'StartAimingAction'));
        startAimingAction.setLoop(THREE.LoopOnce);
        startAimingAction.clampWhenFinished = true;
        startAimingSittingAction = mixerForMap.clipAction(animationActions.find(x => x.name === 'StartAimingSittingDownAction'));
        startAimingSittingAction.setLoop(THREE.LoopOnce);
        startAimingSittingAction.clampWhenFinished = true;

        mixers.push(mixerForMap);

        actions = [...actions, idleAction1, idleAction2, startAimingAction, startAimingSittingAction];

        activateAllActions();

        //activeActionIndex = 5;
        //mixerForMap.clipAction(idleAction1).reset().play();

        //const clips = gltf.animations || [];

        gltf.scene.traverse(function (obj) { obj.frustumCulled = false; });

        gltf.scene.children.forEach(child => {
            console.log('INIT SCENE');

            child.receiveShadow = true;
            child.castShadow = true;

            if (child.isMesh && child.name.endsWith('Border')) {
                child.visible = true;
                child.receiveShadow = false;
                //console.log(child);
                //child.material = materials[getRandomInteger(0, materials.length - 1)];
                child.originalMaterial = child.material;
            } else if (child.isMesh && child.name === 'Water') {
                child.visible = false;
            } else if (child.name.includes('SoldierMaster')) {
                child.visible = false;
            } else if (child.name.includes('Soldier') || child.name.includes('Cannon')) {
                // lol
            } else { // country
                //child.material = materials[getRandomInteger(0, materials.length - 1)];
            }

            if (child.material) child.originalMaterial = child.material;

            child.originalPosition = {
                x: child.position.x,
                y: child.position.y,
                z: child.position.z
            };
        });
        setContent(scene);
    }, undefined, function (error) {
        console.error(error);
    });
};

function deactivateAllActions() {
    actions.forEach(function (action) {
        action.stop();
    });
    soldiers.forEach(soldier => {
        Object.values(soldier.customActions).forEach(x => x.stop());
    });
}

function activateAllActions() {
    actions.forEach(function (action) {
        setWeight(action, 0.0);
    });
    actions.forEach(function (action) {
        action.play();
    });

    soldiers.forEach(soldier => {
        Object.values(soldier.customActions).forEach(x => setWeight(x, 0.0));
        Object.values(soldier.customActions).forEach(x => x.play());
    });
}

function setWeight(action, weight) {
    action.enabled = true;
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(weight);
}

function pauseAllActions() {
    actions.forEach(function (action) {
        action.paused = true;
    });

    soldiers.forEach(soldier => {
        Object.values(soldier.customActions).forEach(x => x.paused = true);
    });
}

const unPauseAllActions = (resetWeights = false) => {
    actions.forEach(function (action) {
        action.paused = false;
        if (resetWeights) {
            //action.weight = 0;
        }
    });
    soldiers.forEach(soldier => {
        Object.values(soldier.customActions).forEach(x => x.paused = false);
    });
}

function executeCrossFade(startAction, endAction, duration) {
    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)
    actions.forEach(function (action) {
        if (action !== startAction && action !== endAction) {
            setWeight(action, 0)
        }
    });

    setWeight(endAction, 1);
    endAction.time = 0;

    console.log('endAction', endAction)
    // Crossfade with warping - you can also try without warping by setting the third parameter to false
    startAction.crossFadeTo(endAction, duration, true);
}

/* function synchronizeCrossFade(startAction, endAction, duration) {
    mixer.addEventListener('loop', onLoopFinished);
    function onLoopFinished(event) {
        if (event.action === startAction) {
            mixer.removeEventListener('loop', onLoopFinished);
            executeCrossFade(startAction, endAction, duration);
        }
    }
} */

function pauseContinue() {
    if (singleStepMode) {
        singleStepMode = false;
        unPauseAllActions();
    } else {
        if (idleAction1.paused) {
            unPauseAllActions();
        } else {
            pauseAllActions();
        }
    }
}

const prepareCrossFade = (startAction, endAction, resetWeights = false) => {
    // Make sure that we don't go on in singleStepMode, and that all actions are unpaused
    singleStepMode = false;
    unPauseAllActions(resetWeights);
    // If the current action is 'idle' (duration 4 sec), execute the crossfade immediately;
    // else wait until the current action has finished its current loop

    //executeCrossFade(startAction, endAction, 1);
    if (startAction === idleAction1 || startAction === idleAction2) {
        executeCrossFade(startAction, endAction, 1);
    } else {
        //synchronizeCrossFade(startAction, endAction, 1);
        executeCrossFade(startAction, endAction, 1);
    }
}

window.test6 = () => {
    prepareCrossFade(soldiers[1].customActions.idle, soldiers[1].customActions.startAiming);
}
window.test5 = () => {
    prepareCrossFade(soldiers[0].customActions.idle, soldiers[0].customActions.startAiming);
}
window.test4 = () => {
    prepareCrossFade(startAimingAction, idleAction2);
}
window.test3 = () => {
    prepareCrossFade(idleAction2, startAimingAction, true);
}
window.test2 = () => {
    prepareCrossFade(idleAction2, idleAction1)
}
window.test = () => {
    prepareCrossFade(idleAction1, idleAction2)
}

window.showAllBorders = function () {
    content.children.forEach(child => {
        if (child.isMesh && child.name.endsWith('Border')) {
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
            waterColor: 0x08516e,
            distortionScale: 3,
            fog: scene.fog !== undefined
        }
    );
    water.receiveShadow = true;
    water.rotation.x = - Math.PI / 2;

    scene.add(water);

    water.position.set(0, -20, 0)

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

const setContent = (object, clips = null) => {
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

    console.log('clips', clips);
    /* clips.filter(x => x.name === 'IdleAction' || x.name === 'IdleAction.002').forEach(clip => {
        mixer.clipAction(clip).reset().play();
    }); */
    /* clips.filter(x => x.name.includes('StartAimingSittingDownAction')).forEach(clip => {
        mixer.clipAction(clip).reset().play();
    }); */

    /* clips.forEach(clip => {
        mixer.clipAction(clip).reset().play();
    }); */
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
    /* content.children.filter(x => x.name.endsWith('Border')).forEach(x => {
        if (!x.forceShow) x.visible = false
    }); */
    const border = content.children.find(x => x.name === item.name + 'Border');
    if (border) {
        border.visible = true;
        border.hover = true;
        border.material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    }

    const green = content.children.find(x => x.name === 'SoldierMasterYellow');

    const soldiers = content.children.filter(x => x.name.toUpperCase().includes(item.name.toUpperCase().replaceAll('_', '') + 'SOLDIER'));
    if (soldiers) {
        soldiers.forEach(soldier => {
            soldier.visible = true;
            soldier.hover = true;
            soldier.geometry = green.geometry;
        })
    }
    const cannons = content.children.filter(x => x.name.toUpperCase().includes(item.name.toUpperCase().replaceAll('_', '') + 'CANNON'));
    if (cannons) {
        cannons.forEach(cannon => {
            cannon.visible = true;
            cannon.hover = true;
        })
    }

    document.querySelector('canvas').classList.add('pointer');

    item.hover = true;
}

function restoreAllHoverEffects() {
    document.querySelector('canvas').classList.remove('pointer');
    content.children.forEach(x => x.hover = false);
    /* content.children.filter(x => x.name.endsWith('Border')).forEach(x => {
        if (!x.forceShow) x.visible = false
    }); */
    content.children.filter(x => x.name.includes('Border')).forEach(x => {
        if (x.originalMaterial) x.material = x.originalMaterial
    });
    INTERSECTED = null;
}

function animate() {
    /* if (mixerForSoldier) mixerForSoldier.update(d);
    if (mixerForMap) mixerForMap.update(clock.getDelta()); */
    const d = clock.getDelta();
    mixers.forEach(mixer => mixer.update(d));

    if (water) water.material.uniforms['time'].value += (1.0 / 260.0);

    if (content && content.children) {
        content.children.filter(x => x.userData.name.includes('Soldier') && !x.userData.name.includes('SoldierTemplate')).forEach(soldier => {
            soldier.rotation.y += 0.01;
        })
    }

    // find intersections
    raycaster.setFromCamera(pointer, camera);

    if (content) {
        content.children.forEach(x => {
            if (x.type !== 'Bone' && x.name !== 'Armature') {
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
            }
        });

        const intersects = raycaster.intersectObjects(content.children, false);

        if (intersects.length > 0) {
            if (INTERSECTED != intersects[0].object) {
                restoreAllHoverEffects();
                INTERSECTED = intersects[0].object;

                if (INTERSECTED.name.includes('Soldier')) { // Hover on soldier
                    const correspondingItem = content.children.find(
                        x =>
                            x.name === INTERSECTED.userData.name.replace(/Soldier\.[0-9]{1,3}/, '') ||
                            x.name.replaceAll('_', '').toUpperCase() === INTERSECTED.name.replaceAll('_', '').toUpperCase().replace(/SOLDIER[0-9]{1,3}/, '')
                    );
                    console.log('correspondingItem', correspondingItem)
                    if (correspondingItem) {
                        onHover(correspondingItem);
                    }
                } else if (INTERSECTED.name.includes('Cannon')) { // Hover on cannon
                    console.log(INTERSECTED)

                    const correspondingItem = content.children.find(
                        x =>
                            x.name === INTERSECTED.userData.name.replace(/Cannon\.[0-9]{1,3}/, '') ||
                            x.name.replaceAll('_', '').toUpperCase() === INTERSECTED.name.replaceAll('_', '').toUpperCase().replace(/CANNON[0-9]{1,3}/, '')
                    );

                    if (correspondingItem) {
                        onHover(correspondingItem);
                    }
                } else if (!INTERSECTED.name.endsWith('Border')) {
                    if (INTERSECTED.name !== 'Water') {
                        onHover(INTERSECTED);
                    } else {
                        restoreAllHoverEffects();
                    }
                } else if (INTERSECTED.name.endsWith('Border')) { // Hover on border
                    const correspondingItem = content.children.find(x => x.name === INTERSECTED.name.replace('Border', ''));
                    if (correspondingItem) {
                        onHover(correspondingItem);
                    }
                }
            }
        } else {
            //if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
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