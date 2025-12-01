<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import ControlPanel from './components/ControlPanel.vue';
import { KnightTourSolver } from './logic/KnightTourSolver.js';
import { SimulationPanel } from './logic/SimulationPanel.js';

const canvasRef = ref(null);
const isRunning = ref(false);
const isPaused = ref(false);
const dimensions = ref([4, 4, 4]);
const startPos = ref([0, 0, 0]);
const blockedInput = ref('');
const blockedList = ref([]);
const blockedApplied = ref(0);
const blockedRejected = ref(0);
const availableCells = ref(dimensions.value[0] * dimensions.value[1] * dimensions.value[2]);
const speed = ref(50);
const separation = ref(0.2);
const pauseStartedAt = ref(0);

const stats = reactive([
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 },
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 },
    { done: false, step: 0, ops: 0, time: 0, startTime: 0 } 
]);

let scene, camera, renderer, controls, animationId;
let panels = []; 
let solvers = [];

const allFinished = computed(() => stats.every(s => s.done));
const statusText = computed(() => {
    if (isPaused.value) return 'Paused';
    if (isRunning.value) return 'Running...';
    if (allFinished.value) return 'Completed';
    return 'Idle';
});

onMounted(() => {
    initThree();
    rebuildBoards();
    window.addEventListener('resize', onWindowResize);
    animateLoop();
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onWindowResize);
});

// Three.js
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.value.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animateLoop() {
    requestAnimationFrame(animateLoop);
    controls.update();
    renderer.render(scene, camera);
}

function rebuildBoards() {
    stopSimulation();
    
    // Bersihkan panel lama
    panels.forEach(p => scene.remove(p.group));
    panels = [];

    const [w, l, h] = dimensions.value;
    const spacing = Math.max(w, l) * 2.5;

    // panel visual
    panels.push(new SimulationPanel(scene, [-spacing, 0, 0], 0xef4444, dimensions.value));
    panels.push(new SimulationPanel(scene, [0, 0, 0], 0x06b6d4, dimensions.value));
    panels.push(new SimulationPanel(scene, [spacing, 0, 0], 0x22c55e, dimensions.value));

    resetStats();
    resetCamera();
    applyConstraintsToPanels();
}

function resetCamera() {
    if (!camera) return;
    const maxDim = Math.max(...dimensions.value);
    camera.position.set(0, maxDim * 4, maxDim * 6);
    controls.target.set(0, 0, 0);
    controls.update();
}

function resetStats() {
    stats.forEach(s => { s.done = false; s.step = 0; s.ops = 0; s.time = 0; s.startTime = 0; });
    pauseStartedAt.value = 0;
}

function stopSimulation() {
    isRunning.value = false;
    isPaused.value = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function clampStartWithinDims() {
    const [w, l, h] = dimensions.value;
    startPos.value = [
        Math.min(Math.max(startPos.value[0], 0), w - 1),
        Math.min(Math.max(startPos.value[1], 0), l - 1),
        Math.min(Math.max(startPos.value[2], 0), h - 1),
    ];
}

function parseBlocked() {
    const [w, l, h] = dimensions.value;
    const raw = blockedInput.value.trim();
    if (!raw) {
        blockedList.value = [];
        blockedApplied.value = 0;
        blockedRejected.value = 0;
        availableCells.value = w * l * h;
        return;
    }

    const unique = new Set();
    let rejected = 0;
    raw.split(/[\n;]+/).forEach(chunk => {
        const parts = chunk.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length !== 3) {
            if (chunk.trim() !== '') rejected++;
            return;
        }
        const coords = parts.map(Number);
        if (coords.some(Number.isNaN)) {
            rejected++;
            return;
        }
        const [x, y, z] = coords;
        if (x < 0 || x >= w || y < 0 || y >= l || z < 0 || z >= h) {
            rejected++;
            return;
        }
        unique.add(`${x},${y},${z}`);
    });

    blockedList.value = Array.from(unique).map(str => str.split(',').map(Number));
    blockedApplied.value = blockedList.value.length;
    blockedRejected.value = rejected;
    availableCells.value = Math.max(1, w * l * h - blockedApplied.value);
}

function applyConstraintsToPanels() {
    parseBlocked();
    clampStartWithinDims();
    panels.forEach(p => p.applyConstraints(startPos.value, blockedList.value));
}

function startSimulation() {
    if (isRunning.value) return;
    if (allFinished.value) rebuildBoards();
    applyConstraintsToPanels();
    
    const [w, l, h] = dimensions.value;
    const sLogic = new KnightTourSolver(w, l, h);
    sLogic.setBlockedTiles(blockedList.value);
    const start = [...startPos.value];
    const startKeyBlocked = blockedList.value.some(([x, y, z]) => x === start[0] && y === start[1] && z === start[2]);
    if (startKeyBlocked) {
        console.warn('Start posisi berada pada tile terblokir');
        return;
    }

    solvers = [
        sLogic.solveBacktracking(start),
        sLogic.solveWarnsdorff(start),
        sLogic.solveCombined(start)
    ];

    panels.forEach(p => p.reset());
    resetStats();
    
    const now = performance.now();
    stats.forEach(s => s.startTime = now);

    isPaused.value = false;
    isRunning.value = true;
    logicLoop();
}

function toggleRun() {
    if (isRunning.value) {
        stopSimulation();
    } else if (isPaused.value) {
        resumeSimulation();
    } else {
        startSimulation();
    }
}

function togglePause() {
    if (isRunning.value && !isPaused.value) {
        pauseSimulation();
    } else if (isPaused.value) {
        resumeSimulation();
    }
}

function pauseSimulation() {
    if (!isRunning.value || isPaused.value) return;
    pauseStartedAt.value = performance.now();
    isRunning.value = false;
    isPaused.value = true;
}

function resumeSimulation() {
    if (!isPaused.value) return;
    const delta = performance.now() - pauseStartedAt.value;
    stats.forEach(s => { s.startTime += delta; });
    pauseStartedAt.value = 0;
    isPaused.value = false;
    isRunning.value = true;
    logicLoop();
}

function logicLoop() {
    if (!isRunning.value) return;

    // kontrol speed
    let stepsPerFrame = 1;
    let delayMs = 0;

    if (speed.value < 40) {
        delayMs = (40 - speed.value) * 10;
    } else {
        stepsPerFrame = Math.floor((speed.value - 40) / 4);
        if (stepsPerFrame < 1) stepsPerFrame = 1;
    }

    const now = performance.now();

    const stepFn = () => {
        let active = 0;
        solvers.forEach((gen, idx) => {
            if (stats[idx].done) return;
            active++;

            stats[idx].time = now - stats[idx].startTime;

            try {
                const res = gen.next();
                stats[idx].ops++;
                if (res.done) {
                    stats[idx].done = true;
                    stats[idx].time = performance.now() - stats[idx].startTime;
                } else {
                    const { type, pos, step } = res.value;
                    panels[idx].update(type, pos, step);
                    
                    if (type === 'move') stats[idx].step = step + 1;
                    if (type === 'revert') stats[idx].step = step - 1;
                    if (type === 'stuck') stats[idx].done = true;
                    
                    // Check complete
                    const total = availableCells.value;
                    if (stats[idx].step === total) {
                        stats[idx].done = true;
                        stats[idx].time = performance.now() - stats[idx].startTime;
                    }
                }
            } catch(e) { console.error(e); stats[idx].done = true; }
        });
        if (active === 0) isRunning.value = false;
    };

    if (delayMs > 0) {
        stepFn();
        setTimeout(() => {
            if (isRunning.value) requestAnimationFrame(logicLoop);
        }, delayMs);
    } else {
        for(let i=0; i<stepsPerFrame; i++) stepFn();
        if (isRunning.value) requestAnimationFrame(logicLoop);
    }
}

watch(separation, (val) => panels.forEach(p => p.updateSeparation(val)));
watch(dimensions, () => { rebuildBoards(); }, { deep: true });
watch(startPos, () => applyConstraintsToPanels(), { deep: true });
watch(blockedInput, () => applyConstraintsToPanels());

function updateDims(v) { dimensions.value = v; }
function updateSpeed(v) { speed.value = v; }
function updateSeparation(v) { separation.value = v; }
function updateStart(v) { startPos.value = v; }
function updateBlocked(raw) { blockedInput.value = raw; }
</script>

<template>
    <div class="relative w-full h-screen font-sans">
        <div class="absolute top-4 left-4 z-10 pointer-events-none">
            <h1 class="text-3xl font-bold bg-black/50 p-2 rounded backdrop-blur-sm border-l-4 border-blue-500 text-white">
                3D Knight's Tour
            </h1>
        </div>

        <div ref="canvasRef" class="absolute inset-0 z-0"></div>

        <ControlPanel 
            :isRunning="isRunning"
            :isPaused="isPaused"
            :allFinished="allFinished"
            :statusText="statusText"
            :dims="dimensions"
            :speed="speed"
            :separation="separation"
            :stats="stats"
            :start="startPos"
            :blockedRaw="blockedInput"
            :blockedCount="blockedApplied"
            :blockedRejected="blockedRejected"
            :availableCells="availableCells"
            @update:dims="updateDims"
            @update:speed="updateSpeed"
            @update:separation="updateSeparation"
            @update:start="updateStart"
            @update:blocked="updateBlocked"
            @toggle-run="toggleRun"
            @toggle-pause="togglePause"
            @reset="rebuildBoards"
        />
    </div>
</template>
