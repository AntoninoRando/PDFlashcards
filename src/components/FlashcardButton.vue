<template>
    <button @click="reveal" class="flashcard-button">
        {{ frontText }} | (Page {{ pageRef }})
    </button>
</template>

<script lang="ts">
export default {
    props: {
      frontText: String,
      pageRef: Number,
    },
    methods: {
        reveal() {
            this.$emit('reveal', this.pageRef)
        }
    },
}
</script>

<style scoped>
.user {
    color: var(--color-text);
}

.user-avatar {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 20vw;
    height: 20vh;
}
</style>