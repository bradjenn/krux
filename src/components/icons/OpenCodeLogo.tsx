export default function OpenCodeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2 L2 19 h20 Z M12 5.5 L4.5 17.5 h15 Z" fillRule="evenodd" />
    </svg>
  )
}
