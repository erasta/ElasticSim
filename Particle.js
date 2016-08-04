var DAMPING = 0.03;
var DRAG = 1 - DAMPING;
var MASS = 0.1;
var GRAVITY = 9.81;
var gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(MASS);
var TIMESTEP = 18 / 1000;
var TIME_STEP_SQR = TIMESTEP * TIMESTEP;

function Particle(x, y, z, mass) {
    this.position = new THREE.Vector3(x, y, z);
    this.previous = new THREE.Vector3(x, y, z);
    this.original = new THREE.Vector3(x, y, z);
    this.a = new THREE.Vector3(0, 0, 0); // acceleration
    this.mass = mass || MASS;
    this.invMass = 1 / this.mass;
    this.tmp = new THREE.Vector3();
    this.pinned = false;
}

// Force -> Acceleration
Particle.prototype.addForce = function (force) {
    this.a.add(this.tmp.copy(force).multiplyScalar(this.invMass));
};

// Performs verlet integration
Particle.prototype.integrate = function (timeStepSqr) {
    var newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DRAG).add(this.position);
    newPos.add(this.a.multiplyScalar(timeStepSqr));
    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;
    this.a.set(0, 0, 0);
};

function Spring(particle1, particle2, restDistance) {
    this.one = particle1;
    this.two = particle2;
    this.diff = new THREE.Vector3();
    this.restDistance = ((restDistance !== undefined) ? restDistance : this.currDistance());
}

Spring.prototype.currDistance = function () {
    this.diff.subVectors(this.one.position, this.two.position);
    return this.diff.length();
}

Spring.prototype.integrate = function () {
    var currentDist = this.currDistance();
    if (currentDist === 0) return; // prevents division by 0
    var factor = (1 - this.restDistance / currentDist);
    this.diff.multiplyScalar(-factor / 2);
    this.one.position.add(this.diff);
    this.two.position.sub(this.diff);
}

function Physics() {
    this.particles = [];
    this.springs = [];
    this.rigidBodies = [];
    this.floor = 0;
}

Physics.prototype.addParticles = function (flatPositions, mass) {
    for (var i = 0; i < flatPositions.length; i += 3) {
        this.particles.push(new Particle(flatPositions[i], flatPositions[i + 1], flatPositions[i + 2], mass));
    }
}

Physics.prototype.addSprings = function (flatParticleIndices) {
    for (var i = 0; i < flatParticleIndices.length; i += 3) {
        this.springs.push(new Spring(this.particles[flatParticleIndices[i]], this.particles[flatParticleIndices[i + 1]]));
    }
}

Physics.prototype.findParticle = function (x, y, z) {
    for (var i = 0; i < this.particles.length; ++i) {
        var pos = this.particles[i].position;
        if (pos.x === x && pos.y === y && pos.z === z) {
            return i;
        }
    }
    return -1;
}

Physics.prototype.addSpringByCoordinates = function (x1, y1, z1, x2, y2, z2) {
    var one = this.findParticle(x1, y1, z1);
    var two = this.findParticle(x2, y2, z2);
    if (one >= 0 && two >= 0) {
        var spring = new Spring(this.particles[one], this.particles[two]);
        this.springs.push(spring);
        return spring;
    }
    return undefined;
}

Physics.prototype.simulate = function (timeStepSqr) {
    timeStepSqr = timeStepSqr || TIME_STEP_SQR;

    // Aerodynamics forces
    // if (wind) {
    //     var face, faces = clothGeometry.faces, normal;
    //     particles = cloth.particles;
    //     for (i = 0, il = faces.length; i < il; i++) {
    //         face = faces[i];
    //         normal = face.normal;
    //         tmpForce.copy(normal).normalize().multiplyScalar(normal.dot(windForce));
    //         particles[face.a].addForce(tmpForce);
    //         particles[face.b].addForce(tmpForce);
    //         particles[face.c].addForce(tmpForce);
    //     }
    // }

    // Gravity
    for (var i = 0; i < this.particles.length; ++i) {
        this.particles[i].addForce(gravity);
        this.particles[i].integrate(timeStepSqr);
    }

    // Springs
    for (var i = 0; i < this.springs.length; ++i) {
        this.springs[i].integrate();
        // if (this.springs[i].currDistance() > this.springs[i].restDistance * 2) {
        //     this.springs.splice(i, 1);
        //     --i;
        // }
    }

    // Rigid body
    var raycaster = new THREE.Raycaster();
    var dir = new THREE.Vector3(1,0,0).normalize();
    var tri = new THREE.Triangle();
    var candidate = new THREE.Vector3();
    var closest = new THREE.Vector3();
    for (var i = 0; i < this.particles.length; ++i) {
        var p = this.particles[i];
        raycaster.set(p.position, dir);
        var dist = 1e10;
        var inter = raycaster.intersectObjects(this.rigidBodies, true);
        if (inter.length % 2 === 0) continue;
        for (var j = 0; j < this.rigidBodies.length; ++j) {
            var body = this.rigidBodies[j];
            for (var k = 0; k < body.geometry.faces.length; ++k) {
                var f = body.geometry.faces[k];
                tri.setFromPointsAndIndices(body.geometry.vertices, f.a, f.b, f.c);
                tri.closestPointToPoint(p.position, candidate);
                var currDist = p.position.distanceTo(candidate);
                if (dist > currDist) {
                    dist = currDist;
                    closest.copy(candidate);
                }
            }
        }
        if (dist < 1e10) {
            p.position.copy(closest);
        }
    }

    // ballPosition.z = -Math.sin(Date.now() / 600) * 90; //+ 40;
    // ballPosition.x = Math.cos(Date.now() / 400) * 70;
    //
    // if (sphere.visible) {
    //     for (particles = cloth.particles, i = 0, il = particles.length; i < il; i++) {
    //         particle = particles[i];
    //         pos = particle.position;
    //         diff.subVectors(pos, ballPosition);
    //         if (diff.length() < ballSize) {
    //             // collided
    //             diff.normalize().multiplyScalar(ballSize);
    //             pos.copy(ballPosition).add(diff);
    //         }
    //     }
    // }

    // Floor and pinned particles
    for (var i = 0; i < this.particles.length; ++i) {
        var p = this.particles[i];
        if (p.position.y < this.floor) {
            p.position.y = this.floor;
        }
        if (p.pinned) {
            p.position.copy(p.original);
            p.previous.copy(p.original);
        }
    }
}