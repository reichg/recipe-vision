import Link from "next/link";
import styles from "./page.module.css";

const proofPoints = [
  { label: "Grouped intake", value: "Multi-photo" },
  { label: "Structured extraction", value: "OCR + Gemini" },
  { label: "Working archive", value: "Search + review" },
];

const featureCards = [
  {
    title: "Grouped intake that respects the recipe",
    description:
      "Queue one or many photos per recipe so the batch pipeline treats each card like a single source of truth.",
    meta: "Upload without losing context.",
  },
  {
    title: "Structured output instead of plain OCR dumps",
    description:
      "Ingredients, steps, timings, servings, tags, and allergen data arrive in a shape you can actually review and keep.",
    meta: "Readable, searchable, and ready to cook from.",
  },
  {
    title: "Operational clarity across the whole workflow",
    description:
      "Jump from upload to batch processing to recipe browsing with a shell that makes progress, status, and next actions obvious.",
    meta: "Built for repeated use, not one-off demos.",
  },
];

const workflowSteps = [
  {
    title: "Capture the source",
    description:
      "Drop in cookbook pages, handwritten notes, or magazine clippings and keep each recipe grouped correctly.",
  },
  {
    title: "Run the extraction pass",
    description:
      "OCR reads the text and Gemini shapes it into structured recipe data ready for storage and review.",
  },
  {
    title: "Browse the finished library",
    description:
      "Open a clean recipe card, scan metrics instantly, and manage the collection like a working archive.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Vision-led recipe archive</p>
          <h1 className={styles.title}>
            Turn scattered recipe photos into a
            <span className={styles.titleAccent}> curated cooking system</span>
          </h1>
          <p className={styles.subtitle}>
            Upload single shots or grouped batches, let OCR and Gemini shape the
            mess into structure, and move through a recipe library that feels
            designed instead of dumped.
          </p>

          <div className={styles.ctaContainer}>
            <Link href="/upload" className={styles.primaryButton}>
              Start Parsing
            </Link>
            <Link href="/recipes" className={styles.secondaryButton}>
              Browse Recipes
            </Link>
          </div>

          <div className={styles.heroMetrics}>
            {proofPoints.map((point) => (
              <div key={point.label} className={styles.metricCard}>
                <span className={styles.metricLabel}>{point.label}</span>
                <strong className={styles.metricValue}>{point.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroPanels}>
          <div className={styles.pipelineCard}>
            <p className={styles.panelEyebrow}>Workflow</p>
            <ol className={styles.pipelineList}>
              {workflowSteps.map((step, index) => (
                <li key={step.title} className={styles.pipelineStep}>
                  <span className={styles.pipelineIndex}>0{index + 1}</span>
                  <div className={styles.pipelineContent}>
                    <h2 className={styles.pipelineTitle}>{step.title}</h2>
                    <p className={styles.pipelineText}>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.spotlightCard}>
            <p className={styles.panelEyebrow}>Built for speed</p>
            <h2 className={styles.spotlightTitle}>
              Batch intake, searchable results, and live status in one calm
              interface.
            </h2>
            <p className={styles.spotlightDescription}>
              The flow keeps grouped images together, surfaces saved recipes
              fast, and makes the jump from upload to extraction feel deliberate
              rather than procedural.
            </p>

            <div className={styles.spotlightActions}>
              <Link href="/batch-process" className={styles.utilityLink}>
                Run Batch Extraction
              </Link>
              <Link href="/view-image" className={styles.utilityLink}>
                Inspect Source Images
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Why it lands</p>
          <h2 className={styles.sectionTitle}>
            A UI that treats recipe parsing like a studio workflow.
          </h2>
        </div>

        <div className={styles.features}>
          {featureCards.map((feature, index) => (
            <article key={feature.title} className={styles.featureCard}>
              <span className={styles.featureAccent}>0{index + 1}</span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
              <p className={styles.featureMeta}>{feature.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Core loop</p>
          <h2 className={styles.sectionTitle}>
            From upload to browse in three deliberate moves.
          </h2>
        </div>

        <div className={styles.steps}>
          {workflowSteps.map((step, index) => (
            <article key={step.title} className={styles.step}>
              <div className={styles.stepNumber}>0{index + 1}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
