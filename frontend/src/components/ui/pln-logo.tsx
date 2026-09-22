import React from 'react'

interface PLNLogoProps extends React.SVGProps<SVGSVGElement> {
  showText?: boolean
}

export function PLNLogo({ showText = true, className = 'h-8 w-auto', ...props }: PLNLogoProps) {
  if (!showText) {
    return (
      <svg
        viewBox="0 0 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
      >
        {/* Emblem Yellow Box */}
        <rect x="4" y="4" width="80" height="80" rx="6" fill="#FFE500" />

        {/* 3 Blue Waves */}
        <path
          d="M16 43 C 24 37, 30 49, 38 43 C 46 37, 52 49, 60 43 C 66 38, 70 45, 72 43"
          stroke="#009BD6"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 53 C 24 47, 30 59, 38 53 C 46 47, 52 59, 60 53 C 66 48, 70 55, 72 53"
          stroke="#009BD6"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 63 C 24 57, 30 69, 38 63 C 46 57, 52 69, 60 63 C 66 58, 70 65, 72 63"
          stroke="#009BD6"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Red Lightning Bolt */}
        <polygon
          points="46,14 31,48 45,48 37,74 57,38 43,38"
          fill="#E30613"
          stroke="#E30613"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 240 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Emblem Yellow Box */}
      <rect x="4" y="4" width="80" height="80" rx="6" fill="#FFE500" />

      {/* 3 Blue Waves */}
      <path
        d="M16 43 C 24 37, 30 49, 38 43 C 46 37, 52 49, 60 43 C 66 38, 70 45, 72 43"
        stroke="#009BD6"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 53 C 24 47, 30 59, 38 53 C 46 47, 52 59, 60 53 C 66 48, 70 55, 72 53"
        stroke="#009BD6"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 63 C 24 57, 30 69, 38 63 C 46 57, 52 69, 60 63 C 66 58, 70 65, 72 63"
        stroke="#009BD6"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Red Lightning Bolt */}
      <polygon
        points="46,14 31,48 45,48 37,74 57,38 43,38"
        fill="#E30613"
        stroke="#E30613"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Text PLN */}
      {/* Letter P */}
      <path
        d="M102 24 H122 C132 24, 137 29, 137 38 C137 47, 132 52, 122 52 H112 V68 H102 Z M112 33 V43 H120 C125 43, 127 41, 127 38 C127 35, 125 33, 120 33 Z"
        fill="#00A2E8"
      />

      {/* Letter L */}
      <path d="M148 24 H158 V60 H180 V68 H148 Z" fill="#00A2E8" />

      {/* Letter N */}
      <path d="M190 24 H200 L219 55 V24 H229 V68 H219 L200 37 V68 H190 Z" fill="#00A2E8" />
    </svg>
  )
}
export default PLNLogo
