<script setup>
import { computed } from 'vue';

const props = defineProps({
    title: String,
    colorClass: String, // 'red', 'cyan', 'green'
    stats: Object,      // { done, step, ops }
    totalSteps: Number
});

const progress = computed(() => {
    if (!props.totalSteps) return 0;
    return (props.stats.step / props.totalSteps) * 100;
});

// Dynamic class mappings
const borderColor = computed(() => `border-${props.colorClass}-500`);
const textColor = computed(() => `text-${props.colorClass}-400`);
const badgeColor = computed(() => `bg-${props.colorClass}-900 text-${props.colorClass}-200`);
const barColor = computed(() => `bg-${props.colorClass}-500`);
</script>

<template>
    <div class="bg-gray-800 p-2 rounded border-l-4 transition-all" :class="borderColor">
        <div class="flex justify-between items-center mb-1">
            <span class="font-bold text-sm" :class="textColor">{{ title }}</span>
            <span v-if="stats.done" class="text-[10px] uppercase px-1.5 py-0.5 rounded font-bold" :class="badgeColor">Done</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2 text-xs text-gray-300">
            <div class="flex justify-between"><span>Moves:</span> <span class="text-white font-mono">{{ stats.step }}</span></div>
            <div class="flex justify-between"><span>Ops:</span> <span class="text-white font-mono">{{ stats.ops }}</span></div>
            <div class="col-span-2 mt-2 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-300 ease-out" :class="barColor" :style="{ width: progress + '%' }"></div>
            </div>
        </div>
    </div>
</template>