import { useEffect, useState, type AnchorHTMLAttributes } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Render markdown links as external-open buttons (never navigate the app). */
function MarkdownLink(props: AnchorHTMLAttributes<HTMLAnchorElement>): React.JSX.Element {
  const { href, children } = props
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault()
        if (href) void window.nodrift.mods.openUrl(href)
      }}
    >
      {children}
    </a>
  )
}

interface ModDetailProps {
  projectId: string
  onBack: () => void
  onInstall: (hit: {
    project_id: string
    title: string
    icon_url: string | null
    description: string
    categories: string[]
    versions: string[]
  }) => void
}

/** Dedicated page for a single mod: full description, gallery, metadata, install. */
export function ModDetail({ projectId, onBack, onInstall }: ModDetailProps): React.JSX.Element {
  const [project, setProject] = useState<NdModProject | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    window.nodrift.mods.project(projectId).then((res) => {
      if (!active) return
      if (res.ok) setProject(res.project)
      else setError(res.error)
    })
    return () => {
      active = false
    }
  }, [projectId])

  if (error) {
    return (
      <div className="mod-detail">
        <button type="button" className="viewer__back" onClick={onBack}>
          ← Back to Mods
        </button>
        <p className="mods__error">{error}</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mod-detail">
        <button type="button" className="viewer__back" onClick={onBack}>
          ← Back to Mods
        </button>
        <p className="mods__hint">Loading…</p>
      </div>
    )
  }

  return (
    <div className="mod-detail">
      <button type="button" className="viewer__back" onClick={onBack}>
        ← Back to Mods
      </button>

      <div className="mod-detail__header">
        {project.icon_url ? (
          <img className="mod-detail__icon" src={project.icon_url} alt="" />
        ) : (
          <div className="mod-detail__icon mod-detail__icon--empty" />
        )}
        <div className="mod-detail__headinfo">
          <h1 className="mod-detail__title">{project.title}</h1>
          <p className="mod-detail__desc">{project.description}</p>
          <p className="mod-detail__stats">
            {project.downloads.toLocaleString()} downloads · {project.loaders.join(', ')}
          </p>
        </div>
        <div className="mod-detail__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() =>
              onInstall({
                project_id: project.id,
                title: project.title,
                icon_url: project.icon_url,
                description: project.description,
                categories: [...project.loaders, ...project.categories],
                versions: project.game_versions
              })
            }
          >
            Install
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void window.nodrift.mods.openUrl(`https://modrinth.com/mod/${project.slug}`)}
          >
            View on Modrinth
          </button>
        </div>
      </div>

      {project.categories.length > 0 && (
        <div className="mod-detail__tags">
          {project.categories.map((c) => (
            <span key={c} className="tag">
              {c}
            </span>
          ))}
        </div>
      )}

      {project.gallery.length > 0 && (
        <div className="mod-detail__gallery">
          {project.gallery.slice(0, 6).map((g) => (
            <img key={g.url} src={g.url} alt={g.title ?? ''} className="mod-detail__shot" />
          ))}
        </div>
      )}

      {project.body && (
        <div className="mod-detail__body markdown">
          <Markdown remarkPlugins={[remarkGfm]} components={{ a: MarkdownLink }}>
            {project.body}
          </Markdown>
        </div>
      )}
    </div>
  )
}
