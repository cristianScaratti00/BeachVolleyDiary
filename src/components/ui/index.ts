// ============================================================================
// Le primitive dell'interfaccia (`src/components/ui/*`): file `.tsx` e `.css`
// affiancati, classi con prefisso `ui-`, varianti come `data-variant` /
// `data-size`. Leggono SOLO token; il vetro solo via `data-material`.
// Sono presentazionali: niente rete, niente logica di dominio.
// ============================================================================
export { Icon } from './Icon'
export type { IconName, IconSize } from './Icon'
export { Button, ButtonLink, IconButton } from './Button'
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button'
export { Card, CardLink, CardAbove, CardGrid, nomeVisibile } from './Card'
export { ListGroup, List, ListItem, ListRow } from './List'
export type { ListRowProps } from './List'
export { Badge, PlacementBadge, placementText } from './Badge'
export type { BadgeTone } from './Badge'
export { SegmentedControl, FilterChips } from './Choice'
export type { FilterOption } from './Choice'
export { Tabellone } from './Tabellone'
export { StatGrid, StatTile, StatFooter, MeterRow, Bar } from './Stat'
export type { StatItem } from './Stat'
export { MatchRow } from './MatchRow'
export type { MatchRowProps, SetChipView } from './MatchRow'
export { Avatar, Spinner } from './Avatar'
export {
  TextField,
  TextArea,
  Select,
  SearchField,
  Switch,
  SwatchPicker,
  SWATCH_NAMES,
  Disclosure,
  Grow,
  SetRow,
  FormGroup,
} from './Field'
export type { SelectOption } from './Field'
export { EmptyState, ErrorState, AreaError, Skeleton, Bone, useRetry } from './Feedback'
export { toast, ToastRegion, useToasts } from './Toast'
export type { ToastType } from './Toast'
export { ConfirmDialog } from './ConfirmDialog'
export { Menu } from './Menu'
export type { MenuViewItem } from './Menu'
export { NavBar } from './NavBar'
export type { NavBarBack } from './NavBar'
export { TabBar } from './TabBar'
export type { TabDef } from './TabBar'
export { Sidebar } from './Sidebar'
export { Page, Section, Note } from './Page'
export { focusables, firstField, restoreFocus, useEscape, useFocusTrap, useInitialFocus, useReturnFocus, useScrollLock } from './overlay'
