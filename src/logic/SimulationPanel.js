import * as THREE from 'three';

export class SimulationPanel {
    constructor(scene, offset, colorHex, dims) {
        this.scene = scene;
        this.offset = new THREE.Vector3(...offset);
        this.color = new THREE.Color(colorHex);
        this.dims = dims;
        
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.baseMat = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, transparent: true, opacity: 0.1 
        });
        this.blockedMat = new THREE.MeshLambertMaterial({
            color: 0x4b5563, transparent: true, opacity: 0.45
        });
        this.activeMat = new THREE.MeshLambertMaterial({ 
            color: this.color, transparent: true, opacity: 0.8 
        });
        
        this.cells = new Map();
        this.knightMesh = null;
        this.trailPoints = [];
        this.pathHistory = [];
        this.trailLine = null;
        this.separation = 0;
        this.startPos = [0, 0, 0];
        this.blockedSet = new Set();

        this.initBoard();
    }

    getKey(x, y, z) { return `${x},${y},${z}`; }

    getWorldPos(x, y, z) {
        const yWorld = z * (1 + this.separation);
        const vec = new THREE.Vector3(x, yWorld, y);
        vec.add(this.offset);
        return vec;
    }

    initBoard() {
        // Bersihkan trail lama
        this.group.clear();
        this.cells.clear();
        this.trailPoints = [];
        this.pathHistory = [];

        // Grid
        const [w, l, h] = this.dims;
        for(let x=0; x<w; x++){
            for(let y=0; y<l; y++){
                for(let z=0; z<h; z++){
                    const mesh = new THREE.Mesh(this.boxGeo, this.baseMat.clone());
                    mesh.userData = { gridPos: [x,y,z] };
                    mesh.position.copy(this.getWorldPos(x,y,z));
                    this.group.add(mesh);
                    this.cells.set(this.getKey(x,y,z), mesh);
                }
            }
        }

        // Knight
        const knightGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const knightMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x444400 });
        this.knightMesh = new THREE.Mesh(knightGeo, knightMat);
        this.group.add(this.knightMesh);
        
        // Trail line
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({ color: this.color });
        this.trailLine = new THREE.Line(lineGeo, lineMat);
        this.group.add(this.trailLine);

        // Sinkronkan constraint awal
        this.applyConstraints(this.startPos, []);
    }

    updateKnightPos(x, y, z) {
        const pos = this.getWorldPos(x, y, z);
        this.knightMesh.position.copy(pos);
    }

    updateSeparation(val) {
        this.separation = val;
        
        this.cells.forEach((mesh) => {
            const [x,y,z] = mesh.userData.gridPos;
            mesh.position.copy(this.getWorldPos(x,y,z));
        });
        
        const curr = this.knightMesh.userData.lastLogicPos || this.startPos;
        this.updateKnightPos(...curr);

        this.trailPoints = this.pathHistory.map(pos => this.getWorldPos(pos[0], pos[1], pos[2]));
        this.updateTrailGeometry();
    }

    applyConstraints(startPos, blockedList) {
        this.startPos = [...startPos];
        this.blockedSet = new Set(blockedList.map(([x, y, z]) => this.getKey(x, y, z)));

        this.cells.forEach((mesh, key) => {
            if (this.blockedSet.has(key)) {
                mesh.material = this.blockedMat.clone();
                mesh.scale.set(0.85, 0.85, 0.85);
            } else {
                mesh.material = this.baseMat.clone();
                mesh.scale.set(1, 1, 1);
            }
        });

        this.resetPathVisuals();
    }

    resetPathVisuals() {
        this.trailPoints = [];
        this.pathHistory = [];
        this.updateTrailGeometry();
        this.knightMesh.userData.lastLogicPos = [...this.startPos];
        this.updateKnightPos(...this.startPos);
    }

    update(eventType, pos, step) {
        const [x, y, z] = pos;
        this.knightMesh.userData.lastLogicPos = pos;
        this.updateKnightPos(x, y, z);
        
        const key = this.getKey(x, y, z);
        const cell = this.cells.get(key);

        if (eventType === 'move') {
            if (cell && !this.blockedSet.has(key)) {
                cell.material = this.activeMat;
                cell.scale.set(0.9, 0.9, 0.9);
            }
            this.pathHistory.push([...pos]);
            this.trailPoints.push(this.knightMesh.position.clone());
            this.updateTrailGeometry();
        } 
        else if (eventType === 'revert') {
            if (cell) {
                const mat = this.blockedSet.has(key) ? this.blockedMat.clone() : this.baseMat.clone();
                const scale = this.blockedSet.has(key) ? 0.85 : 1;
                cell.material = mat;
                cell.scale.set(scale, scale, scale);
            }
            this.pathHistory.pop();
            this.trailPoints.pop();
            this.updateTrailGeometry();
        }
    }

    updateTrailGeometry() {
        if (!this.trailLine) return;
        this.trailLine.geometry.setFromPoints(this.trailPoints);
    }

    reset() {
        this.cells.forEach((mesh, key) => {
            if (this.blockedSet.has(key)) {
                mesh.material = this.blockedMat.clone();
                mesh.scale.set(0.85, 0.85, 0.85);
            } else {
                mesh.material = this.baseMat.clone();
                mesh.scale.set(1, 1, 1);
            }
        });
        this.resetPathVisuals();
    }
}
