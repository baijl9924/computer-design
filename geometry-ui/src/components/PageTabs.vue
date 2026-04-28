<template>
  <div class="tabs-shell">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab-btn"
      :class="{ active: modelValue === tab.key }"
      @click="$emit('update:modelValue', tab.key)"
    >
      <span class="tab-icon"><iconify-icon :icon="tab.icon"></iconify-icon></span>
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  modelValue: {
    type: String,
    required: true
  }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.tabs-shell {
  display: inline-flex;
  gap: 10px;
  padding: 8px;
  width: 100%;
  justify-content: space-between;
  background: var(--surface-3);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: 0 18px 36px color-mix(in srgb, var(--bg) 22%, transparent);
  backdrop-filter: blur(16px);
  flex-wrap: wrap;
}

.tab-btn {
  flex: 1 1 0;
  min-width: 120px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 18px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: all 0.24s ease;
}

.tab-btn:hover {
  background: var(--surface-2);
  color: var(--text);
}

.tab-btn.active {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent-soft) 94%, transparent), color-mix(in srgb, var(--accent-soft) 54%, var(--surface-2)));
  color: var(--text);
  border-color: color-mix(in srgb, var(--accent) 24%, var(--line));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--surface-2) 40%, transparent), 0 16px 28px color-mix(in srgb, var(--accent) 14%, transparent);
}

.tab-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-icon iconify-icon {
  width: 18px;
  height: 18px;
}

@media (max-width: 760px) {
  .tabs-shell {
    justify-content: stretch;
  }

  .tab-btn {
    min-width: calc(50% - 6px);
    flex: 1 1 calc(50% - 6px);
  }
}

</style>

<style>
html[data-theme='day'] .tabs-shell {
  background: #eef0f4 !important;
  backdrop-filter: none !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

html[data-theme='day'] .tab-btn:hover {
  background: #ffffff !important;
}

html[data-theme='day'] .tab-btn.active {
  background: #ffffff !important;
  border-color: rgba(13, 138, 115, 0.18);
  box-shadow: 0 2px 8px rgba(13, 138, 115, 0.08);
}
</style>
