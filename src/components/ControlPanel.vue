<script setup>
import { reactive, computed, watch } from 'vue';
import StatsCard from './StatsCard.vue';

const props = defineProps({
    isRunning: Boolean,
    allFinished: Boolean,
    statusText: String,
    dims: Array,
    speed: Number,
    separation: Number,
    stats: Array
});

const emit = defineEmits(['update:dims', 'update:speed', 'update:separation', 'toggle-run', 'reset-cam']);

const localDims = reactive([...props.dims]);

watch(() => props.dims, (newVal) => {
    localDims[0] = newVal[0];
    localDims[1] = newVal[1];
    localDims[2] = newVal[2];
}, { deep: true });

const updateDims = () => emit('update:dims', [...localDims]);

const totalSteps = computed(() => localDims[0] * localDims[1] * localDims[2]);
</script>

<template>
    <div class="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 flex flex-col max-h-[90vh] overflow-hidden z-20">
        <div class="p-4 border-b border-gray-800">
             <div class="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                <span class="font-bold text-gray-400 text-xs uppercase tracking-wider">Status</span>
                <span class="font-mono font-bold uppercase text-sm"
                    :class="isRunning ? 'text-green-400' : (allFinished ? 'text-blue-400' : 'text-yellow-400')">
                    {{ statusText }}
                </span>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <div class="space-y-2">
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grid Dimensions</label>
                <div class="grid grid-cols-3 gap-2">
                    <div v-for="(axis, idx) in ['x', 'y', 'z']" :key="axis">
                        <label class="block text-center text-[10px] text-gray-500 mb-1">{{ axis.toUpperCase() }}</label>
                        <input type="number" v-model.number="localDims[idx]" @change="updateDims" :disabled="isRunning" min="2" max="8"
                            class="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-center text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 transition-colors">
                    </div>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Sim Speed</span>
                    <span class="text-blue-400">{{ speed }}%</span>
                </div>
                <input type="range" :value="speed" @input="$emit('update:speed', +$event.target.value)" 
                       min="1" max="100" class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
            </div>

            <div class="space-y-2">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Layer Gap</span>
                    <span class="text-purple-400">{{ separation.toFixed(1) }}</span>
                </div>
                <input type="range" :value="separation" @input="$emit('update:separation', +$event.target.value)" 
                       min="0" max="2" step="0.1" class="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <button @click="$emit('toggle-run')" 
                        :class="isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'"
                        class="py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <span v-if="!isRunning">Start</span>
                    <span v-else>■ Stop</span>
                </button>
                <button @click="$emit('reset-cam')" class="bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-bold text-sm transition-colorsSJ border border-gray-600">
                    Reset Cam
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