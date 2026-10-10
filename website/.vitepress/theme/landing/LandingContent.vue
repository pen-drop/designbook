<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

type Step = { title: string; text: string }
type LandingFrontmatter = {
  steps?: Step[]
  demo?: { text?: string }
  cta?: { text?: string; link?: string }
}

const { frontmatter } = useData()
const landing = computed<LandingFrontmatter | null>(() => frontmatter.value.landing ?? null)
const steps = computed(() => landing.value?.steps ?? [])
const demo = computed(() => landing.value?.demo?.text ?? '')
const cta = computed(() => landing.value?.cta)
</script>

<template>
  <div v-if="landing" class="landing-content">
    <ol v-if="steps.length" class="landing-steps">
      <li v-for="(step, index) in steps" :key="index" class="landing-steps__item">
        <h2 class="landing-steps__title">{{ step.title }}</h2>
        <p class="landing-steps__text">{{ step.text }}</p>
      </li>
    </ol>
    <section v-if="demo" class="landing-demo" aria-labelledby="landing-demo-heading">
      <h2 id="landing-demo-heading" class="landing-demo__title">Demo</h2>
      <p class="landing-demo__text">{{ demo }}</p>
    </section>
    <p v-if="cta?.text && cta?.link" class="landing-cta">
      <a class="landing-cta__link" :href="withBase(cta.link)">{{ cta.text }}</a>
    </p>
  </div>
</template>
