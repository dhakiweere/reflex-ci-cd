export default function Hero({ onStartEdit }) {
  return (
    <section className="container-pg1 w-full min-h-[90vh]">
      <div className="h-full w-full flex flex-col gap-y-3 md:justify-center">
        <h2 className="subtitle w-full text-start">
          Self<br />Reflecting<br />System<br />Pipeline
        </h2>
        <p className="h-fit w-[40ch] text-md md:text-xl font-semibold flex flex-col text-start">
          This project is a concept demonstration of a full-duplex CI/CD pipeline,
          exploring how deployment pipelines can evolve beyond the traditional
          one-way flow. In a typical setup, changes move from the GitHub repository
          to the running application. Here, the process is bidirectional — the web
          application itself can push commits or configuration updates back to the
          GitHub repo, which in turn triggers GitHub Actions workflows, creating a
          self-sustaining feedback loop.
        </p>
      </div>
      <div className="h-full w-full flex flex-col gap-y-4 md:justify-center md:items-center">
        <p className="hidden md:block text-xl font-bold font-mono text-shadow-accent">
          Start making changes to this very page
        </p>
        <button
          className="w-fit h-fit p-4 btn accent-btn"
          onClick={onStartEdit}
        >
          Start Editing
        </button>
      </div>
    </section>
  );
}
