var container, scene, camera, renderer, controls;
var gui, guiParams;
var physics;
var cyl;

function initGraphics() {
    // SCENE
    scene = new THREE.Scene();
    container = document.getElementById('ThreeJS');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    container.appendChild(renderer.domElement);

    // CAMERA
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 5, -30);
    camera.up.set(0.0, 1.0, 0.0);
    scene.add(camera);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    THREEx.WindowResize(renderer, camera);

    // Background clear color
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x222222));
    scene.add(new THREE.GridHelper(30, 1));
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    cyl.geometry.translate(0, -0.1, 0);
    physics.simulate();
    updatePhysics();
}

function initGui() {
    gui = new dat.GUI({ autoPlace: true, width: 500 });
    guiParams = new (function () {
//            this.nodesPerDimension = 5;
    })();
//        gui.add(guiParams, 'nodesPerDimension').min(2).max(16).step(1).onFinishChange(function(){createNodes();patternTextToEdges();});
}

function createPhysics() {
    physics = new Physics();
    var from = [-6, 2, -6], to = [6, 12, 6], step = [1,1,1];
    var center = new THREE.Vector3().fromArray(from.map(function (f, i) {
        return (from[i] + to[i]) / 2;
    }));
    for (var z = from[2]; z < to[2]; z += step[2]) {
        for (var y = from[1]; y < to[1]; y += step[1]) {
            for (var x = from[0]; x < to[0]; x += step[0]) {
                // if (new THREE.Vector3(x, y, z).distanceTo(center) > 4) continue;
                physics.addParticles([x, y, z]);
                physics.addSpringByCoordinates(x, y, z, x - 1, y, z);
                physics.addSpringByCoordinates(x, y, z, x, y - 1, z);
                physics.addSpringByCoordinates(x, y, z, x, y, z - 1);
                physics.addSpringByCoordinates(x, y, z, x, y - 1, z - 1);
                physics.addSpringByCoordinates(x, y, z, x - 1, y, z - 1);
                physics.addSpringByCoordinates(x, y, z, x - 1, y - 1, z);
                physics.addSpringByCoordinates(x, y, z, x - 1, y - 1, z);
                physics.addSpringByCoordinates(x - 1, y, z - 1, x, y - 1, z);
            }
        }
    }

    // for (var i = 0; i < physics.particles.length; ++i) {
    //     var p = physics.particles[i];
    //     for (var j = i + 1; j < physics.particles.length; ++j) {
    //         var q = physics.particles[j];
    //         if (p.position.distanceTo(q.position) < 1.1) {
    //             physics.addSprings([i, j]);
    //         }
    //     }
    // }

    for (var i = 0; i < physics.particles.length; ++i) {
        var p = physics.particles[i];
        p.position.x += (Math.random() - 0.5) / 2;
        p.position.y += (Math.random() - 0.5) / 2;
        p.position.z += (Math.random() - 0.5) / 2;
    }

    for (var i = 0; i < physics.springs.length; ++i) {
        var s = physics.springs[i];
        s.restDistance = s.currDistance();
    }

    var material = new THREE.MeshNormalMaterial();
    for (var i = 0; i < physics.particles.length; ++i) {
        var p = physics.particles[i];
        var geometry = new THREE.SphereBufferGeometry(0.5, 3, 2);
        p.three = new THREE.Mesh(geometry, material);
        p.three.position.copy(p.position);
        scene.add(p.three);
    }

    // var lineMaterial = new THREE.LineBasicMaterial({ color: 'black' });
    // for (var i = 0; i < physics.springs.length; ++i) {
    //     var s = physics.springs[i];
    //     var geometry = new THREE.Geometry();
    //     geometry.vertices.push(s.one.position.clone(), s.two.position.clone())
    //     s.three = new THREE.Line(geometry, lineMaterial);
    //     scene.add(s.three);
    // }
}

function nicePos(p) {
    return p.position.toArray().map(function (x) {
        return Math.round(x * 10000) / 10000;
    });
}

function updatePhysics() {
    for (var i = 0; i < physics.particles.length; ++i) {
        var p = physics.particles[i];
        p.three.position.copy(p.position);
    }

    // for (var i = 0; i < physics.springs.length; ++i) {
    //     var s = physics.springs[i];
    //     s.three.geometry.vertices[0].copy(s.one.position);
    //     s.three.geometry.vertices[1].copy(s.two.position);
    //     s.three.geometry.verticesNeedUpdate = true;
    // }

    // physics.particles.forEach(function (p) {
    //     console.log(nicePos(p));
    // });
    // var box = new THREE.Box3().setFromObject(scene);
    // console.log(box.min, box.max);
    // if (box.size().length() > 10) {
    //     debugger;
    // }
}

function createCylinder() {
    cyl = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 20, 3), new THREE.MeshLambertMaterial({ color: 'red' }));
    cyl.geometry.rotateX(Math.PI / 2);
    cyl.geometry.scale(0.3, 2, 2);
    cyl.geometry.translate(0, 20, 0);
    scene.add(cyl);
    physics.rigidBodies.push(cyl);
}

// code entry point
initGui();
initGraphics();
createPhysics();
createCylinder();
animate();
