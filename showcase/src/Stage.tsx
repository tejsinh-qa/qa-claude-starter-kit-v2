import type { Preflight } from './preflight'
import type { DemoScene } from './content/scenes'

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
  const replayFiles = scene.replay ? (preflight?.recordings ?? []) : []

  return (
    <article className="stage">
      <header className="stage-head">
        <p className="kicker">{scene.kicker}</p>
        <h1>{scene.title}</h1>
        <p className="point">{scene.point}</p>
      </header>

      {scene.prompt ? <blockquote>{scene.prompt}</blockquote> : null}

      {scene.showLogin ? (
        <div className="device">
          <iframe title="TravelDesk sign in" src="/fixture/login.html" />
        </div>
      ) : null}

      <dl className="expect">
        <div>
          <dt>Expect</dt>
          <dd>{scene.expect}</dd>
        </div>
        <div>
          <dt>If it drifts</dt>
          <dd>{scene.fallback}</dd>
        </div>
      </dl>

      {scene.actions.length > 0 || scene.replay ? (
        <div className="actions">
          {scene.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={action.kind === 'run' ? 'btn run' : 'btn fallback'}
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
          {scene.replay && replayFiles.length === 0 ? (
            <p className="replay-empty">No rehearsal recording yet. sample_run.json is not a real run.</p>
          ) : null}
        </div>
      ) : null}

      {blocked && (scene.actions.length > 0 || scene.replay) ? <p className="gate">{blocked}</p> : null}
    </article>
  )
}
