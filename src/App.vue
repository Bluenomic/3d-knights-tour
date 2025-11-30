<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import ControlPanel from './components/ControlPanel.vue';
import { KnightTourSolver } from './logic/KnightTourSolver.js';
import { SimulationPanel } from './logic/SimulationPanel.js';

// --- Reactive State ---
const canvasRef = ref(null);
const isRunning = ref(false);
const dimensions = ref([4, 4, 4]); // [Width, Length, Height]
const speed = ref(50);
const separation = ref(0.2);

const stats = reactive([
    { done: false, step: 0, ops: 0 }, // Backtracking
    { done: false, step: 0, ops: 0 }, // Warnsdorff
    { done: false, step: 0, ops: 0 }  // Combined
]);

// --- Three.js Globals ---
let scene, camera, renderer, controls, animationId;
let panels = []; 
let solvers = [];

// --- Computed ---
const allFinished = computed(() => stats.every(s => s.done));
const statusText = computed(() => {
    if (isRunning.value) return 'Running...';
    if (allFinished.value) return 'Completed';
    return 'Idle';
});

// --- Lifecycle ---
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

// --- Three.js Setup ---
function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827); // Tailwind gray-900

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

// --- Simulation Logic ---
function rebuildBoards() {
    stopSimulation();
    
    // Cleanup old panels
    panels.forEach(p => scene.remove(p.group));
    panels = [];

    const [w, l, h] = dimensions.value;
    const spacing = Math.max(w, l) * 2.5;

    // Instantiate Visual Panels
    panels.push(new SimulationPanel(scene, [-spacing, 0, 0], 0xef4444, dimensions.value));
    panels.push(new SimulationPanel(scene, [0, 0, 0], 0x06b6d4, dimensions.value));
    panels.push(new SimulationPanel(scene, [spacing, 0, 0], 0x22c55e, dimensions.value));

    resetStats();
    resetCamera();
}

function resetCamera() {
    if (!camera) return;
    const maxDim = Math.max(...dimensions.value);
    camera.position.set(0, maxDim * 4, maxDim * 6);
    controls.target.set(0, 0, 0);
    controls.update();
}

function resetStats() {
    stats.forEach(s => { s.done = false; s.step = 0; s.ops = 0; });
}

function stopSimulation() {
    isRunning.value = false;
    if (animationId) cancelAnimationFrame(animationId);
}

function toggleSimulation() {
    if (isRunning.value) {
        stopSimulation();
    } else {
        if (allFinished.value) rebuildBoards();
        
        // Initialize Solvers
        const [w, l, h] = dimensions.value;
        const sLogic = new KnightTourSolver(w, l, h);
        const start = [0, 0, 0];
        solvers = [
            sLogic.solveBacktracking(start),
            sLogic.solveWarnsdorff(start),
            sLogic.solveCombined(start)
        ];

        panels.forEach(p => p.reset());
        resetStats();
        
        isRunning.value = true;
        logicLoop();
    }
}

function logicLoop() {
    if (!isRunning.value) return;

    // Logic Speed Control
    let stepsPerFrame = 1;
    let delayMs = 0;

    if (speed.value < 40) {
        delayMs = (40 - speed.value) * 10;
    } else {
        stepsPerFrame = Math.floor((speed.value - 40) / 4);
        if (stepsPerFrame < 1) stepsPerFrame = 1;
    }

    const stepFn = () => {
        let active = 0;
        solvers.forEach((gen, idx) => {
            if (stats[idx].done) return;
            active++;
            try {
                const res = gen.next();
                stats[idx].ops++;
                if (res.done) {
                    stats[idx].done = true;
                } else {
                    const { type, pos, step } = res.value;
                    panels[idx].update(type, pos, step);
                    
                    if (type === 'move') stats[idx].step = step + 1;
                    if (type === 'revert') stats[idx].step = step - 1;
                    
                    // Win Check
                    const total = dimensions.value[0] * dimensions.value[1] * dimensions.value[2];
                    if (stats[idx].step === total) stats[idx].done = true;
                }
            } catch(e) { console.error(e); stats[idx].done = true; }
        });
        if (active === 0) isRunning.value = false;
    };

    // Execute
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

// --- Watchers ---
watch(separation, (val) => panels.forEach(p => p.updateSeparation(val)));
watch(dimensions, () => rebuildBoards(), { deep: true });

// --- Props to pass down ---
function updateDims(v) { dimensions.value = v; }
function updateSpeed(v) { speed.value = v; }
function updateSeparation(v) { separation.value = v; }
</script>

<template>
    <div class="relative w-full h-screen font-sans">
        <!-- Header -->
        <div class="absolute top-4 left-4 z-10 pointer-events-none">
            <h1 class="text-3xl font-bold bg-black/50 p-2 rounded backdrop-blur-sm border-l-4 border-blue-500 text-white">
                3D Knight's Tour
            </h1>
            <p class="text-sm text-gray-300 bg-black/50 p-1 mt-1 rounded max-w-md">
                Vue Component Architecture
            </p>
        </div>

        <!-- Canvas -->
        <div ref="canvasRef" class="absolute inset-0 z-0"></div>

        <!-- UI Component -->
        <ControlPanel 
            :isRunning="isRunning"
            :allFinished="allFinished"
            :statusText="statusText"
            :dims="dimensions"
            :speed="speed"
            :separation="separation"
            :stats="stats"
            @update:dims="updateDims"
            @update:speed="updateSpeed"
            @update:separation="updateSeparation"
            @toggle-run="toggleSimulation"
            @reset-cam="resetCamera"
        />
    </div>
</template>