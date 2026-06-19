import type { App } from 'vue'
import {
  Expand,
  ArrowDown,
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
  User
} from '@element-plus/icons-vue'

const icons = {
  Expand,
  ArrowDown,
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
  User
}

export function registerIcons(app: App) {
  Object.entries(icons).forEach(([name, component]) => {
    app.component(name, component)
  })
}