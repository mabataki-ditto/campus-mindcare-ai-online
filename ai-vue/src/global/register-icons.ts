import type { App } from 'vue'
import {
  Expand,
  ArrowDown,
  ArrowDownBold,
  Back,
  Plus,
  Promotion,
  Histogram,
  Avatar,
  List,
  Platform,
  ChatRound,
  Clock,
  DeleteFilled,
  PieChart,
  ChatLineSquare,
  Message,
  User,
  Upload,
  Document,
  Close,
  Phone,
  InfoFilled,
  Loading,
  Menu
} from '@element-plus/icons-vue'

const icons = {
  Expand,
  ArrowDown,
  ArrowDownBold,
  Back,
  Plus,
  Promotion,
  Histogram,
  Avatar,
  List,
  Platform,
  ChatRound,
  Clock,
  DeleteFilled,
  PieChart,
  ChatLineSquare,
  Message,
  User,
  Upload,
  Document,
  Close,
  Phone,
  InfoFilled,
  Loading,
  Menu
}

export function registerIcons(app: App) {
  Object.entries(icons).forEach(([name, component]) => {
    app.component(name, component)
  })
}