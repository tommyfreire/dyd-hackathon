export function Logo() {
  return (
    <div className="logo-wrap">
      <svg className="logo-symbol" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#F66135" />
        <path d="M7 7h6a5 5 0 0 1 0 10H7V7z" fill="#fff" />
      </svg>
      <div className="logo-text">
        DYD<span className="logo-period">.</span>
      </div>
    </div>
  );
}
