export const performanceMonitor = {
  init() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Отслеживаем Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            const lcp = entry as LargestContentfulPaint
            console.log(`[Performance] LCP: ${lcp.renderTime || lcp.loadTime}`)
          }
          else if (entry.entryType === 'first-input') {
            const fid = entry as PerformanceEventTiming
            const delay = fid.processingStart - fid.startTime
            console.log(`[Performance] FID: ${delay}`)
          }
          else if (entry.entryType === 'layout-shift') {
            const cls = entry as any
            if (!cls.hadRecentInput) {
              console.log(`[Performance] CLS: ${cls.value}`)
            }
          }
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    }
  },

  measureComponentLoad(name: string) {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now()
      return {
        end: () => {
          const duration = performance.now() - start
          if (duration > 100) {
            console.warn(`Slow component load: ${name} - ${duration}ms`)
          }
        }
      }
    }
    return { end: () => { } }
  }
}