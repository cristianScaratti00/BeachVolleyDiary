// ============================================================================
// Sidebar (UX §7.2, ART_DIRECTION D2): dai 900px in su. Un pannello `frost`
// (opaco con il riflesso del vetro: sotto non scorre niente, una sfocatura
// costerebbe senza vedersi) che galleggia a 12px dai bordi della finestra.
//
// Voci Home · Tornei · Compagni · Diario (`<a href>` con `aria-current`), UN
// solo pulsante «＋ Nuovo» che apre lo stesso menu del ＋ come popover, e il
// piede con avatar, nome ed email che porta a Profilo. Spariscono i tre
// pulsanti di creazione di prima e il logout (sta in Profilo, con conferma).
// ============================================================================
import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { Link } from '../../app/router'
import type { TabKey } from '../../app/routes'
import { BrandLockup } from '../Logo'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { Button } from './Button'
import { Icon } from './Icon'
import { LiquidGlass } from './LiquidGlass'
import type { TabDef } from './TabBar'
import './Sidebar.css'

export interface SidebarProps {
  tabs: TabDef[]
  active: TabKey | null
  menuOpen: boolean
  onNew: () => void
  user: { name?: string | null; email?: string | null; avatar?: string | null; admin?: boolean }
}

export const Sidebar = forwardRef<HTMLButtonElement, SidebarProps>(function Sidebar(
  { tabs, active, menuOpen, onNew, user },
  newRef,
) {
  const i = tabs.findIndex((t) => t.key === active)
  return (
    <nav
      className="ui-sidebar"
      aria-label="Principale"
      data-material="frost"
      style={{ '--material-elev': 'var(--elev-float)' } as CSSProperties}
    >
      <div className="ui-sidebar-brand">
        <BrandLockup size={40} />
      </div>
      <div className="ui-sidebar-nav" style={{ '--i': Math.max(0, i) } as CSSProperties}>
        <span className="ui-sidebar-pill" aria-hidden="true" data-hidden={i < 0 ? '' : undefined}>
          <LiquidGlass layer variante="lente" />
        </span>
        <ul className="ui-sidebar-list">
        {tabs.map((t) => {
          const on = t.key === active
          return (
            <li key={t.key}>
              <Link to={t.to} className="ui-sidebar-item" aria-current={on ? 'page' : undefined}>
                <span className="ui-ink">
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </span>
                <span className="ui-ink-on" aria-hidden="true">
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </span>
              </Link>
            </li>
          )
        })}
        </ul>
      </div>
      <Button
        ref={newRef}
        variant="filled"
        icon="plus"
        block
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={onNew}
      >
        Nuovo
      </Button>
      <Link to={{ name: 'profilo' }} className="ui-sidebar-foot">
        <Avatar name={user.name} src={user.avatar} size={32} />
        <span className="ui-sidebar-who">
          <span className="ui-sidebar-name">
            {user.name}
            {user.admin && <Badge tone="select">Admin</Badge>}
          </span>
          <span className="ui-sidebar-email">{user.email}</span>
        </span>
      </Link>
    </nav>
  )
})
