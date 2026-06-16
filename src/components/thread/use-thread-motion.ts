import { type RefObject } from 'react'
import { gsap, shouldReduceMotion, useGSAP } from '@/lib/gsap'

type ThreadMotionOptions = {
  rootRef: RefObject<HTMLElement | null>
  activeChatId: string
  isSidebarCollapsed: boolean
  isStatsPanelOpen: boolean
}

export const useThreadMotion = ({
  rootRef,
  activeChatId,
  isSidebarCollapsed,
  isStatsPanelOpen,
}: ThreadMotionOptions) => {
  useGSAP(() => {
    const root = rootRef.current
    const introTargets = root?.querySelectorAll<HTMLElement>(
      '[data-thread-motion="intro"]',
    )

    if (shouldReduceMotion() || !introTargets?.length) {
      return
    }

    gsap.from(introTargets, {
      autoAlpha: 0,
      y: 10,
      duration: 0.34,
      ease: 'power3.out',
      stagger: 0.045,
      clearProps: 'transform,opacity,visibility',
    })
  })

  useGSAP(() => {
    const viewport = rootRef.current?.querySelector<HTMLElement>(
      '[data-thread-viewport]',
    )

    if (shouldReduceMotion() || !viewport) {
      return
    }

    gsap.fromTo(
      viewport,
      { autoAlpha: 0.72, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.24,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      },
    )
  }, {
    dependencies: [activeChatId],
    revertOnUpdate: true,
  })

  useGSAP(() => {
    const root = rootRef.current
    const main = root?.querySelector<HTMLElement>('[data-thread-main]')
    const sidebarInner = root?.querySelector<HTMLElement>('[data-sidebar-inner]')

    if (shouldReduceMotion() || !main) {
      return
    }

    gsap.fromTo(
      main,
      { scale: 0.997 },
      {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out',
        clearProps: 'transform',
      },
    )

    if (!isSidebarCollapsed && sidebarInner) {
      gsap.from(sidebarInner, {
        autoAlpha: 0,
        x: -14,
        duration: 0.22,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
    }
  }, {
    dependencies: [isSidebarCollapsed],
    revertOnUpdate: true,
  })

  useGSAP(() => {
    const panel = rootRef.current?.querySelector<HTMLElement>(
      '[data-reading-hub-panel]',
    )

    if (shouldReduceMotion() || !isStatsPanelOpen || !panel) {
      return
    }

    gsap.from(panel, {
      autoAlpha: 0,
      x: 18,
      duration: 0.28,
      ease: 'power3.out',
      clearProps: 'transform,opacity,visibility',
    })
  }, {
    dependencies: [isStatsPanelOpen],
    revertOnUpdate: true,
  })
}
