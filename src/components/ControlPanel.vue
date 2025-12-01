<script setup>
import { reactive, computed, watch } from 'vue';
import StatsCard from './StatsCard.vue';

const props = defineProps({
    isRunning: Boolean,
    isPaused: Boolean,
    allFinished: Boolean,
    statusText: String,
    dims: Array,
    speed: Number,
    separation: Number,
    stats: Array,
    start: Array,
    blockedRaw: String,
    blockedCount: Number,
    blockedRejected: Number,
    availableCells: Number
});

const emit = defineEmits([
    'update:dims', 
    'update:speed', 
    'update:separation', 
    'update:start',
    'update:blocked',
    'toggle-run',
    'toggle-pause',
    'reset'
]);

const localDims = reactive([...props.dims]);
const localStart = reactive([...props.start]);

watch(() => props.dims, (newVal) => {
    localDims[0] = newVal[0];
    localDims[1] = newVal[1];
    localDims[2] = newVal[2];
}, { deep: true });

watch(() => props.start, (newVal) => {
    localStart[0] = newVal[0];
    localStart[1] = newVal[1];
    localStart[2] = newVal[2];
}, { deep: true });

const updateDims = () => emit('update:dims', [...localDims]);
const updateStart = () => emit('update:start', [...localStart]);

const totalSteps = computed(() => props.availableCells || 0);

const speedLevels = {
    1: { label: 'Very Slow', value: 10 },
    2: { label: 'Slow',      value: 30 },
    3: { label: 'Normal',    value: 50 },
    4: { label: 'Fast',      value: 75 },
    5: { label: 'Very Fast', value: 100 }
};

const speedStep = computed({
    get() {
        let closestStep = 3;
        let minDiff = Infinity;
        for (const [step, data] of Object.entries(speedLevels)) {
            const diff = Math.abs(props.speed - data.value);
            if (diff < minDiff) {
                minDiff = diff;
                closestStep = Number(step);
            }
        }
        return closestStep;
    },
    set(newStep) {
        emit('update:speed', speedLevels[newStep].value);
    }
});

const blockedSummary = computed(() => {
    const ignored = props.blockedRejected || 0;
    const active = props.blockedCount || 0;
    if (!ignored) return `${active} applied`;
    return `${active} applied, ${ignored} ignored`;
});
</script>

<template>
    <div class="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 flex flex-col max-h-[90vh] overflow-hidden z-20">
        
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div class="space-y-2">
                <div class="grid grid-cols-3 gap-2">
                    <div v-for="(axis, idx) in ['x', 'y', 'z']" :key="axis">
                        <label class="block text-center text-[10px] text-gray-500 mb-1">{{ axis.toUpperCase() }}</label>
                        <input type="number" v-model.number="localDims[idx]" @change="updateDims" :disabled="isRunning" min="2" max="20"
                            class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 transition-colors">
                    </div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="grid grid-cols-3 gap-2">
                    <div v-for="(axis, idx) in ['start x','start y','start z']" :key="axis">
                        <label class="block text-center text-[10px] text-gray-500 mb-1 uppercase">{{ axis }}</label>
                        <input type="number" v-model.number="localStart[idx]" @change="updateStart" :disabled="isRunning"
                            min="0" :max="localDims[idx] - 1"
                            class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-purple-500 focus:outline-none disabled:opacity-50 transition-colors">
                    </div>
                </div>
                <div class="text-[10px] uppercase font-bold text-gray-500 tracking-widest flex justify-between">
                    <span>Blocked Tiles</span>
                    <span class="text-purple-300">{{ blockedSummary }}</span>
                </div>
                <textarea :value="blockedRaw" @input="$emit('update:blocked', $event.target.value)" 
                    :disabled="isRunning"
                    class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2 text-xs text-white h-16 resize-none focus:border-purple-500 focus:outline-none disabled:opacity-50"
                    placeholder="contoh: 0,0,1; 1,2,3">
                </textarea>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Sim Speed</span>
                    <span class="text-blue-400">{{ speedLevels[speedStep].label }}</span>
                </div>
                <input type="range" v-model.number="speedStep" 
                       min="1" max="5" step="1" 
                       class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
                <div class="flex justify-between px-1">
                    <div v-for="i in 5" :key="i" class="w-0.5 h-1.5 bg-gray-600 rounded-full"></div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Layer Gap</span>
                    <span class="text-purple-400">{{ separation.toFixed(1) }}</span>
                </div>
                <input type="range" :value="separation" @input="$emit('update:separation', +$event.target.value)" 
                       min="0" max="2" step="0.1" class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500">
            </div>

            <div class="grid grid-cols-3 gap-3">
                <button @click="$emit('toggle-run')" 
                        :class="isRunning ? 'bg-red-600 hover:bg-red-700' : (isPaused ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700')"
                        class="py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <span v-if="isRunning">Stop</span>
                    <span v-else-if="isPaused">Resume</span>
                    <span v-else>Start</span>
                </button>
                <button @click="$emit('toggle-pause')" 
                        :disabled="!isRunning && !isPaused"
                        :class="[isPaused ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-blue-600 hover:bg-blue-700', 'disabled:opacity-50 disabled:cursor-not-allowed']"
                        class="py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <span v-if="isPaused">Resume</span>
                    <span v-else>Pause</span>
                </button>
                <button @click="$emit('reset')" class="bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colors border border-gray-600">
                    Reset
                </button>
            </div>

            <div class="pt-2 space-y-3">
                <h3 class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Metrics</h3>
                <StatsCard title="Backtracking" colorClass="red" :stats="stats[0]" :totalSteps="totalSteps" />
                <StatsCard title="Warnsdorff" colorClass="cyan" :stats="stats[1]" :totalSteps="totalSteps" />
                <StatsCard title="Combined" colorClass="green" :stats="stats[2]" :totalSteps="totalSteps" />
            </div>
        </div>
    </div>
</template>
