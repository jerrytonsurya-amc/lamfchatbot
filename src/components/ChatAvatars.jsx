export function BotIcon({ size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8V5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="9" cy="13" r="1.25" fill="currentColor" />
      <circle cx="15" cy="13" r="1.25" fill="currentColor" />
      <path d="M9.5 16.5h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function UserProfileIcon({ size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c.9-3.2 3.4-5 6.5-5s5.6 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatAvatar({ role, className = '' }) {
  const isUser = role === 'user';
  const Icon = isUser ? UserProfileIcon : BotIcon;

  return (
    <div className={className} aria-hidden="true">
      <Icon size={20} />
    </div>
  );
}
