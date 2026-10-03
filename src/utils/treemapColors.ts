// Shared treemap color utilities
// Used by both aitechmap (TreemapLandscape) and landscape (TreemapView)

export const moduleColors: Record<string, string> = {
    'infra-computing': '#9C1F1F',
    'data-storage': '#9C891F',
    'model-algorithm': '#2E9C1F',
    'training-inference': '#1F9C66',
    'platform-mlops': '#1F689C',
    'application-service': '#421F9C',
    'security-governance': '#9C1F8B',
}

// Returns brightness factor based on how recently the tool was committed
// 1.0 = very recent (dark), 0.5 = very old (faded)
export const getAgeBrightness = (lastUpdated?: string): number => {
    if (!lastUpdated) return 0.5

    const diffDays = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000)

    if (diffDays < 7) return 1.0
    if (diffDays < 30) return 0.875
    if (diffDays < 90) return 0.75
    if (diffDays < 180) return 0.625
    return 0.5
}

// Darken a hex color by multiplying RGB values by brightness factor
export const darkenColor = (hex: string, brightness: number): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.round(r * brightness)}, ${Math.round(g * brightness)}, ${Math.round(b * brightness)})`
}

export const AGE_LEVELS = [
    { label: '~ 1주',   brightness: 1.0 },
    { label: '~ 1개월', brightness: 0.875 },
    { label: '~ 3개월', brightness: 0.75 },
    { label: '~ 6개월', brightness: 0.625 },
    { label: '6개월 ~', brightness: 0.5 },
]
