<template>
  <FunctionStarfieldPage @open-workbench="handleOpenWorkbench" />
</template>

<script setup>
import { useRouter } from 'vue-router';
import FunctionStarfieldPage from '../features/function-starfield/FunctionStarfieldPage.vue';

const router = useRouter();

function handleOpenWorkbench() {
  router.push({ name: 'workbench' });
}
</script>
