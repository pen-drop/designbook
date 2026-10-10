<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'

type Step = { title: string; text: string }
type LandingFrontmatter = {
  steps?: Step[]
  demo?: { text?: string; video?: string; poster?: string }
  gallery?: boolean
  cta?: { text?: string; link?: string }
}
const { frontmatter } = useData()
const landing = computed<LandingFrontmatter | null>(() => frontmatter.value.landing ?? null)
const selected = ref(0)
const shots = [
  {
    title: 'The result',
    image: 'designbook-result.png',
    heading: 'A working screen, not another mockup.',
    text: 'The Figma example becomes a real Canvas page assembled from SDC components. Preview it in Designbook, inside Storybook.',
    alt: 'The generated SaaS landing page running in Designbook with the clean section and entity navigation.',
  },
  {
    title: 'Design reference',
    image: 'source.png',
    heading: 'Start with the design you already have.',
    text: 'Keep using your design tools. This example starts with a real Figma reference: the SaaS Website UI Kit.',
    alt: 'Original Figma hero showing the Pathway to productivity headline and a blue sculptural graphic.',
  },
  {
    title: 'Agent workflow',
    image: 'agent.png',
    heading: 'Give your agent a repeatable process.',
    text: 'Designbook skills guide the agent through extraction, modelling and component creation. This is a reading view of the actual Claude run log.',
    alt: 'Verbatim excerpts from the Claude run showing the creation of the SaaS components.',
  },
  {
    title: 'Tokens',
    image: 'designbook-tokens.png',
    heading: 'Make the design decisions explicit.',
    text: 'Colours, typography and spacing become named tokens that components can share. Inspect them alongside the implementation.',
    alt: 'Designbook token viewer showing the extracted brand colour palette.',
  },
  {
    title: 'Data model',
    image: 'designbook-model.png',
    heading: 'Give the content a structure.',
    text: 'The model defines a Canvas page with a component tree. Feature and pricing entities demonstrate separate field mappings.',
    alt: 'Designbook data model showing Canvas Landing Page, Feature and Pricing plan entities.',
  },
  {
    title: 'Components',
    image: 'designbook-components.png',
    heading: 'See how the screen is built.',
    text: 'Inspect the Canvas component tree, props and slots. The demo contains 15 SDC components with Twig templates, schemas and individual stories.',
    alt: 'Designbook Structure panel showing the Canvas page and its nested SDC components.',
  },
]
const shot = computed(() => shots[selected.value])
</script>

<template>
  <div v-if="landing" class="landing-content">
    <section v-if="landing.demo" id="demo" class="product-film" aria-labelledby="film-heading">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">From reference to running screen</p>
        <h2 id="film-heading">See what Designbook makes.</h2>
        <p>{{ landing.demo.text }}</p>
      </div>
      <video
        v-if="landing.demo.video"
        controls
        playsinline
        preload="none"
        :poster="withBase(landing.demo.poster ?? '')"
        aria-label="Designbook workflow in 22 seconds"
        aria-describedby="film-transcript"
      >
        <source :src="withBase(landing.demo.video)" type="video/mp4" />
        Your browser does not support this video.
      </video>
      <div v-if="landing.demo.video" class="film-meta">
        <span>22 seconds · real project output · no sound needed</span>
        <a :href="withBase(landing.demo.video)" download>Download video ↗</a>
      </div>
      <details v-if="landing.demo.video" id="film-transcript" class="film-transcript">
        <summary>Read the video walkthrough</summary>
        <p>
          Designbook is not a design tool. Start with an existing design. The design separates into
          tokens, a data model and SDC components. Your AI agent follows Designbook workflows to
          produce the implementation. Inspect the resulting Canvas page in Designbook, inside
          Storybook. This edited sequence summarises the workflow; it does not show elapsed build
          time.
        </p>
      </details>
    </section>

    <section v-if="landing.gallery" class="product-gallery" aria-labelledby="gallery-heading">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">One real project. Every layer visible.</p>
        <h2 id="gallery-heading">Look inside the result.</h2>
        <p>
          The reference, the agent's work and the generated system — all from the same Figma demo.
        </p>
      </div>
      <div class="gallery-choices" aria-label="Choose a project view">
        <button
          v-for="(item, index) in shots"
          :key="item.title"
          type="button"
          :aria-pressed="selected === index"
          aria-controls="gallery-image"
          @click="selected = index"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span
          >{{ item.title }}
        </button>
      </div>
      <figure id="gallery-image" class="gallery-figure">
        <a
          :href="withBase('/demo/' + shot.image)"
          target="_blank"
          rel="noopener"
          :aria-label="'Open full image: ' + shot.title"
        >
          <img
            :src="withBase('/demo/' + shot.image)"
            :alt="shot.alt"
            width="1600"
            height="1000"
            loading="lazy"
          />
        </a>
        <figcaption aria-live="polite">
          <h3>{{ shot.heading }}</h3>
          <p>{{ shot.text }}</p>
          <span>Open the image to inspect it at full size ↗</span>
        </figcaption>
      </figure>
    </section>

    <section v-if="landing.steps?.length" class="product-process" aria-labelledby="process-heading">
      <div class="landing-section-heading">
        <p class="landing-eyebrow">You bring the intent. Your agent does the work.</p>
        <h2 id="process-heading">A workflow you can follow.</h2>
      </div>
      <ol class="landing-steps">
        <li v-for="(step, index) in landing.steps" :key="index" class="landing-steps__item">
          <h3 class="landing-steps__title">{{ step.title }}</h3>
          <p class="landing-steps__text">{{ step.text }}</p>
        </li>
      </ol>
    </section>
    <div v-if="landing.cta?.text && landing.cta?.link" class="product-cta">
      <div>
        <p class="landing-eyebrow">Start with one screen.</p>
        <h2>Make your design executable.</h2>
      </div>
      <a class="landing-cta__link" :href="withBase(landing.cta.link)">{{ landing.cta.text }} →</a>
    </div>
  </div>
</template>
