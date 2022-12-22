import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const getCubeMapTexture = (environment, pmremGenerator) => {
    const { id, path } = environment;

    console.log('environment', environment)
    console.log('id', id)
    console.log('path', path)

    // neutral (THREE.RoomEnvironment)
    if (id === 'neutral') {
        return Promise.resolve({ envMap: neutralEnvironment });
    }
    // none
    if (id === '') {
        return Promise.resolve({ envMap: null });
    }
    return new Promise((resolve, reject) => {
        new EXRLoader()
            .load(path, (texture) => {
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                pmremGenerator.dispose();
                resolve({ envMap });
            }, undefined, reject);
    });
}

const traverseMaterials = (object, callback) => {
    object.traverse((node) => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
        materials.forEach(callback);
    });
}

export {
    getCubeMapTexture,
    traverseMaterials
}