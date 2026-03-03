import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #C62828 0%, #8B0000 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        color: 'white',
        fontSize: '18px',
        fontWeight: '900',
        letterSpacing: '-1px',
      }}
    >
      욕
    </div>,
    { ...size }
  )
}
