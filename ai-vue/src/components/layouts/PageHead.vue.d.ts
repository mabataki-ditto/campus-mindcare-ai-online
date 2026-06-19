declare module '@/components/PageHead.vue' {
  import type { Component } from 'vue'

  const component: Component & {
    new (): {
      $props: {
        title?: string
      }
      $slots: {
        buttons?: () => unknown
      }
    }
  }

  export default component
}
