import { sceneUsesTerminal, type DemoScene } from './content/scenes'
import type { Preflight } from './preflight'

const CARD_THRESHOLD = 6

export function Stage({
  scene,
  preflight,
  blocked,
  sending,
  onRun,
}: {
  scene: DemoScene
  preflight: Preflight | null
  blocked: string | null
  sending: string | null
  onRun: (actionId: string) => void
}) {
  const replayFiles = (preflight?.recordings ?? []).filter((file) =>
    scene.replayMatch ? file.includes(scene.replayMatch) : false,
  )
  const hasSide = sceneUsesTerminal(scene)
  const asCards = (scene.steps?.length ?? 0) > CARD_THRESHOLD

  return (
    <article className={hasSide ? 'stage has-side' : scene.qr ? 'stage is-talk has-qr' : 'stage is-talk'}>
      <div className="stage-main">
        <header className="stage-head">
          {scene.eyebrow ? <p className="eyebrow">{scene.eyebrow}</p> : null}
          <h1>{scene.title}</h1>
          <p className="lead">{scene.about}</p>
        </header>

        <section className="notice">
          <h2>What to notice</h2>
          <p>{scene.why}</p>
        </section>

        {scene.steps ? (
          <section className="on-screen">
            <ul className={asCards ? 'steps cards' : 'steps'}>
              {scene.steps.map((step) => (
                <li key={step}>{asCards ? <CardText text={step} /> : step}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {scene.compare ? (
          <section className="compare-block">
            <div className="compare-wrap">
              <table className="compare">
                <thead>
                  <tr>
                    <th scope="col" />
                    {scene.compare.columns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scene.compare.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={scene.compare?.columns[cellIndex]}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="compare-note">{scene.compare.footnote}</p>
          </section>
        ) : null}

        {scene.showLogin ? (
          <div className="device">
            <iframe title="TravelDesk sign in" src="/fixture/login.html" />
          </div>
        ) : null}
      </div>

      {scene.qr ? (
        <aside className="qr-card" aria-label="Scan to get the kit">
          <img src={scene.qr.src} alt={`QR code for ${scene.qr.url}`} />
          <p>Scan to clone the kit</p>
          <p className="qr-url">{scene.qr.url}</p>
        </aside>
      ) : null}

      {hasSide ? (
        <aside className="stage-side" aria-label="Run this demo">
          <div className="actions">
            {scene.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={action.kind === 'run' ? 'btn run' : action.kind === 'follow' ? 'btn follow' : 'btn fallback'}
                disabled={Boolean(blocked) || sending !== null}
                onClick={() => onRun(action.id)}
              >
                {sending === action.id ? 'Typing…' : action.label}
              </button>
            ))}
            {replayFiles.map((file) => (
              <button
                key={file}
                type="button"
                className="btn fallback"
                disabled={Boolean(blocked) || sending !== null}
                onClick={() => onRun(`replay:${file}`)}
              >
                {sending === `replay:${file}` ? 'Typing…' : `Replay ${file}`}
              </button>
            ))}
            {scene.replayMatch && replayFiles.length === 0 ? (
              <p className="replay-empty">No rehearsal recording yet. sample_run.json is not a real run.</p>
            ) : null}
          </div>

          {blocked ? <p className="gate">{blocked}</p> : null}

          {scene.command ? (
            <dl className="brief">
              <div className="command-block">
                <dt>Command</dt>
                <dd>
                  <pre>{scene.command}</pre>
                </dd>
              </div>
              {scene.watch ? (
                <div>
                  <dt>Look for</dt>
                  <dd>{scene.watch}</dd>
                </div>
              ) : null}
              {scene.drift ? (
                <div>
                  <dt>If it stalls</dt>
                  <dd>{scene.drift}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </aside>
      ) : null}
    </article>
  )
}

function CardText({ text }: { text: string }) {
  const match = /^([^.]{3,48})\.\s+([\s\S]+)$/.exec(text) ?? /^([^:]{3,32}):\s+([\s\S]+)$/.exec(text)
  if (!match) return <>{text}</>
  return (
    <>
      <strong>{match[1]}</strong>
      <span>{match[2]}</span>
    </>
  )
}
